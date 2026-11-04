import { randomUUID } from 'node:crypto'

import { getPayload, type Payload } from 'payload'

import type { Rol } from '../../src/acceso/roles'
import config from '../../src/payload.config'
import { imagenDePrueba } from '../../src/seed/imagenes'
import { vaciarColecciones } from '../../src/seed/vaciar'

export const CONTRASENA_PRUEBA = 'contrasena-de-prueba-123'

export function obtenerPayload(): Promise<Payload> {
  return getPayload({ config })
}

export function limpiar(payload: Payload): Promise<void> {
  return vaciarColecciones(payload)
}

async function crearUsuarioDirecto(payload: Payload, rol: Rol) {
  return payload.create({
    collection: 'users',
    data: { email: `${rol}-${randomUUID()}@prueba.test`, password: CONTRASENA_PRUEBA, nombrePublico: `Persona ${rol}`, rol },
    overrideAccess: true,
  })
}

// Users convierte en admin al primer usuario del sistema. Si la tabla está vacía y se pide otro rol,
// primero se crea un admin descartable para que el usuario pedido tenga de verdad el rol pedido.
export async function crearUsuario(payload: Payload, rol: Rol) {
  if (rol !== 'admin') {
    const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
    if (totalDocs === 0) await crearUsuarioDirecto(payload, 'admin')
  }
  const doc = await crearUsuarioDirecto(payload, rol)
  if (doc.rol !== rol) throw new Error(`crearUsuario: se pidió «${rol}» y quedó «${doc.rol}»`)
  return { ...doc, collection: 'users' as const }
}

export async function crearZona(
  payload: Payload,
  datos: { slug?: string; activa?: boolean; nombre?: string; sedeSlug?: string } = {},
) {
  const slug = datos.slug ?? `zona-${randomUUID().slice(0, 8)}`
  return payload.create({
    collection: 'zonas',
    locale: 'es',
    data: { nombre: datos.nombre ?? slug, slug, activa: datos.activa ?? true, sedeSlug: datos.sedeSlug },
    overrideAccess: true,
  })
}

export async function crearCategoria(
  payload: Payload,
  datos: { es?: string; en?: string; grupo?: 'mar' | 'aire-libre' | 'comer-y-salir' | 'lo-local' } = {},
) {
  const sufijo = randomUUID().slice(0, 8)
  const es = datos.es ?? `categoria-${sufijo}`
  const en = datos.en ?? `category-${sufijo}`
  const doc = await payload.create({
    collection: 'categorias',
    locale: 'es',
    data: { nombre: es, slug: es, aplicaA: 'ambos', tipoSchema: 'LocalBusiness', grupo: datos.grupo ?? 'mar' },
    overrideAccess: true,
  })
  return payload.update({
    collection: 'categorias',
    id: doc.id,
    locale: 'en',
    data: { nombre: en, slug: en },
    overrideAccess: true,
  })
}

export async function crearImagen(payload: Payload) {
  const data = await imagenDePrueba()
  return payload.create({
    collection: 'media',
    locale: 'es',
    data: { alt: { es: 'Imagen de prueba', en: 'Test image' } },
    file: { data, mimetype: 'image/jpeg', name: `prueba-${randomUUID().slice(0, 8)}.jpg`, size: data.length },
    overrideAccess: true,
  })
}

export function lexical(texto: string) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'paragraph',
          format: '' as const,
          indent: 0,
          version: 1,
          direction: 'ltr' as const,
          textFormat: 0,
          children: [{ type: 'text', text: texto, format: 0, style: '', mode: 'normal' as const, detail: 0, version: 1 }],
        },
      ],
    },
  }
}

export async function crearLugar(
  payload: Payload,
  op: { zona: number; categorias: number[]; foto: number; slugEs: string; slugEn?: string; publicado?: boolean },
) {
  const status = op.publicado === false ? 'draft' : 'published'
  const doc = await payload.create({
    collection: 'lugares',
    locale: 'es',
    data: {
      nombre: op.slugEs,
      slug: op.slugEs,
      zona: op.zona,
      categorias: op.categorias,
      fotos: [op.foto],
      resumen: `Resumen de ${op.slugEs}`,
      cuerpo: lexical(`Cuerpo de ${op.slugEs}`),
      _status: status,
    },
    overrideAccess: true,
    context: { sinRedirecciones: true },
  })
  if (!op.slugEn) return doc
  return payload.update({
    collection: 'lugares',
    id: doc.id,
    locale: 'en',
    data: { slug: op.slugEn, resumen: `Summary of ${op.slugEn}`, cuerpo: lexical(`Body of ${op.slugEn}`), _status: status },
    overrideAccess: true,
    context: { sinRedirecciones: true },
  })
}
