import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionSlug,
  PayloadRequest,
} from 'payload'

import { aplanarIdioma, existeEnIdioma, LOCALES, type Locale } from '../dominio/idioma'
import { rutas } from '../dominio/rutas'
import { combinacionTienePagina } from '../dominio/umbrales'
import { calcularCambios, NO_PUBLICADO, type Instantanea } from './diferencias'
import { registrarRedireccion } from './registrar'

type Doc = Record<string, unknown> & { id: number | string }

export type OpcionesRedireccion = {
  coleccion: CollectionSlug
  camposIdioma: readonly string[]
  camposLocalizados: readonly string[]
  rutaDe: (locale: Locale, slug: string) => string
  destinoAlRetirar: (req: PayloadRequest, antes: Doc, locale: Locale, campos: CamposIdioma) => Promise<string>
}

type CamposIdioma = Pick<OpcionesRedireccion, 'camposIdioma' | 'camposLocalizados'>

const LLAVE = 'redirecciones:instantaneas'
const omitir = (req: PayloadRequest) => Boolean(req.context?.sinRedirecciones)
const llaveDe = (coleccion: CollectionSlug, id: number | string) => `${coleccion}:${id}`

// Un Map por req: las operaciones masivas del admin procesan varios documentos en paralelo con el mismo req.
function almacen(req: PayloadRequest): Map<string, Doc | null> {
  let m = req.context[LLAVE] as Map<string, Doc | null> | undefined
  if (!m) {
    m = new Map()
    req.context[LLAVE] = m
  }
  return m
}

// Lee la tabla principal (lo publicado) con el adaptador: no pasa por createLocalReq, no toca req.locale,
// usa la transacción de req y devuelve null si no existe.
async function leerTablaPrincipal(
  req: PayloadRequest,
  coleccion: CollectionSlug,
  id: number | string,
  locale: string = 'all',
): Promise<Doc | null> {
  return (await req.payload.db.findOne({ collection: coleccion, where: { id: { equals: id } }, locale, req })) as Doc | null
}

// Lee la tabla principal antes y después de un `update` y entrega las dos lecturas a `alCambiar`.
// Compartido por documentos con borradores y por Categorías.
function hooksDeActualizacion(
  coleccion: CollectionSlug,
  alCambiar: (req: PayloadRequest, antes: Doc | null, despues: Doc | null) => Promise<void>,
) {
  const beforeChange: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
    if (omitir(req) || operation !== 'update' || !originalDoc?.id) return data
    almacen(req).set(llaveDe(coleccion, originalDoc.id), await leerTablaPrincipal(req, coleccion, originalDoc.id))
    return data
  }

  const afterChange: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
    if (omitir(req) || operation !== 'update') return doc
    const m = almacen(req)
    const k = llaveDe(coleccion, doc.id)
    if (!m.has(k)) return doc
    const antes = m.get(k) ?? null
    m.delete(k)
    await alCambiar(req, antes, await leerTablaPrincipal(req, coleccion, doc.id))
    return doc
  }

  return { beforeChange, afterChange }
}

export function instantaneaDe(doc: Doc | null, op: CamposIdioma): Instantanea {
  if (!doc) return NO_PUBLICADO
  const slugs: Instantanea['slugs'] = {}
  const existe = { es: false, en: false } as Instantanea['existe']
  for (const l of LOCALES) {
    const plano = aplanarIdioma(doc, l, op.camposLocalizados)
    slugs[l] = typeof plano.slug === 'string' && plano.slug ? plano.slug : undefined
    existe[l] = existeEnIdioma(plano, op.camposIdioma)
  }
  return { publicado: doc._status === 'published', slugs, existe }
}

async function aplicar(req: PayloadRequest, op: OpcionesRedireccion, antes: Doc | null, despues: Doc | null) {
  if (!antes) return
  for (const c of calcularCambios(instantaneaDe(antes, op), instantaneaDe(despues, op))) {
    const desde = op.rutaDe(c.locale, c.tipo === 'cambioSlug' ? c.slugViejo : c.slug)
    const hacia = c.tipo === 'cambioSlug' ? op.rutaDe(c.locale, c.slugNuevo) : await op.destinoAlRetirar(req, antes, c.locale, op)
    await registrarRedireccion(req, { desde, hacia })
  }
}

export function hooksDeRedireccion(op: OpcionesRedireccion) {
  const { beforeChange, afterChange } = hooksDeActualizacion(op.coleccion, (req, antes, despues) =>
    aplicar(req, op, antes, despues),
  )

  const beforeDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
    if (omitir(req)) return
    almacen(req).set(llaveDe(op.coleccion, id), await leerTablaPrincipal(req, op.coleccion, id))
  }

  const afterDelete: CollectionAfterDeleteHook = async ({ id, req, doc }) => {
    if (omitir(req)) return doc
    const m = almacen(req)
    const k = llaveDe(op.coleccion, id)
    const antes = m.get(k) ?? null
    m.delete(k)
    await aplicar(req, op, antes, null)
    return doc
  }

  return { beforeChange, afterChange, beforeDelete, afterDelete }
}

// --- Destinos al retirar (spec §6, Redirecciones) ---

const idDe = (v: unknown): number | string | undefined =>
  v && typeof v === 'object' ? (v as { id?: number | string }).id : (v as number | string | undefined)

async function zonaActiva(req: PayloadRequest, zona: unknown): Promise<{ id: number | string; slug: string } | null> {
  const id = idDe(zona)
  if (!id) return null
  const z = (await req.payload.db.findOne({ collection: 'zonas', where: { id: { equals: id } }, req })) as
    | { id: number | string; slug?: string; activa?: boolean }
    | null
  return z?.activa && z.slug ? { id: z.id, slug: z.slug } : null
}

export async function destinoAlRetirarLugar(
  req: PayloadRequest,
  antes: Doc,
  locale: Locale,
  campos: CamposIdioma,
): Promise<string> {
  const zona = await zonaActiva(req, antes.zona)
  if (!zona) return rutas.portada(locale)
  const catId = idDe(Array.isArray(antes.categorias) ? antes.categorias[0] : undefined)
  if (catId) {
    // El adaptador devuelve los campos localizados como { es, en } aunque se le pase `locale`
    // (`locale` solo acota el `where`): hay que tomar el slug del idioma a mano.
    const cat = (await req.payload.db.findOne({ collection: 'categorias', where: { id: { equals: catId } }, locale, req })) as
      | Doc
      | null
    const slugCat = cat ? aplanarIdioma(cat, locale, ['slug']).slug : undefined
    // Spec §7: la combinación cuenta los lugares que existen en el idioma según la regla de idioma
    // (no basta con `exists` en SQL: '' o un Lexical sin texto no cuentan), sin el que se retira.
    const candidatos = (
      await req.payload.db.find({
        collection: 'lugares',
        locale: 'all',
        pagination: false,
        req,
        where: {
          and: [
            { id: { not_equals: antes.id } },
            { zona: { equals: zona.id } },
            { categorias: { in: [catId] } },
            { _status: { equals: 'published' } },
          ],
        },
      })
    ).docs as Doc[]
    const conteo = candidatos.filter((d) =>
      existeEnIdioma(aplanarIdioma(d, locale, campos.camposLocalizados), campos.camposIdioma),
    ).length
    if (typeof slugCat === 'string' && slugCat && combinacionTienePagina(conteo))
      return rutas.categoriaEnZona(locale, zona.slug, slugCat)
  }
  return rutas.zona(locale, zona.slug)
}

export async function destinoAlRetirarArticulo(req: PayloadRequest, antes: Doc, locale: Locale): Promise<string> {
  const zona = await zonaActiva(req, Array.isArray(antes.zonas) ? antes.zonas[0] : undefined)
  return zona ? rutas.zona(locale, zona.slug) : rutas.portada(locale)
}

export async function destinoAlRetirarEvento(_req: PayloadRequest, _antes: Doc, locale: Locale): Promise<string> {
  return rutas.eventos(locale)
}

// --- Zonas (slug sin localizar, sin borradores) ---

export function hooksDeZona() {
  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
    if (omitir(req) || operation !== 'update') return doc
    const viejo = previousDoc?.slug as string | undefined
    const nuevo = doc.slug as string | undefined
    // Solo una zona pública antes y después: si este mismo guardado la desactiva, no hay a dónde redirigir
    // (y la redirección expondría el slug de una zona no publicada).
    if (!previousDoc?.activa || !doc.activa || !viejo || !nuevo || viejo === nuevo) return doc
    const categorias = (await req.payload.db.find({ collection: 'categorias', locale: 'all', pagination: false, req }))
      .docs as Doc[]
    for (const l of LOCALES) {
      await registrarRedireccion(req, { desde: rutas.zona(l, viejo), hacia: rutas.zona(l, nuevo) })
      for (const c of categorias) {
        const slugCat = aplanarIdioma(c, l, ['slug']).slug
        if (typeof slugCat !== 'string' || !slugCat) continue
        await registrarRedireccion(req, {
          desde: rutas.categoriaEnZona(l, viejo, slugCat),
          hacia: rutas.categoriaEnZona(l, nuevo, slugCat),
        })
      }
    }
    return doc
  }
  return { afterChange }
}

// --- Categorías (slug localizado, sin borradores) ---

export function hooksDeCategoria() {
  return hooksDeActualizacion('categorias', async (req, antes, despues) => {
    if (!antes || !despues) return
    // Solo zonas activas: una redirección con una zona inactiva expondría su slug en `redirects` (lectura pública).
    const zonas = (
      await req.payload.db.find({ collection: 'zonas', where: { activa: { equals: true } }, pagination: false, req })
    ).docs as Doc[]
    for (const l of LOCALES) {
      const viejo = aplanarIdioma(antes, l, ['slug']).slug
      const nuevo = aplanarIdioma(despues, l, ['slug']).slug
      if (typeof viejo !== 'string' || typeof nuevo !== 'string' || !viejo || !nuevo || viejo === nuevo) continue
      await registrarRedireccion(req, { desde: rutas.categoria(l, viejo), hacia: rutas.categoria(l, nuevo) })
      for (const z of zonas) {
        if (typeof z.slug !== 'string') continue
        await registrarRedireccion(req, {
          desde: rutas.categoriaEnZona(l, z.slug, viejo),
          hacia: rutas.categoriaEnZona(l, z.slug, nuevo),
        })
      }
    }
  })
}

// Itinerario o tema retirado: a su zona, o a la portada si no tiene.
export async function destinoAlRetirarPlan(req: PayloadRequest, antes: Doc, locale: Locale): Promise<string> {
  const zona = await zonaActiva(req, antes.zona)
  return zona ? rutas.zona(locale, zona.slug) : rutas.portada(locale)
}
