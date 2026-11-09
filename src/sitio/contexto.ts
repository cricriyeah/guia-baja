import { otroIdioma, type Locale } from '../dominio/idioma'
import { rutas, SEGMENTOS } from '../dominio/rutas'
import { articulosCacheados, categoriasCacheadas, eventosCacheados, lugaresCacheados, zonasActivasCacheadas, itinerariosCacheados, temasCacheados } from './datos/cacheadas'
import { conteoCombinacion, porId, porSlug } from './datos/consultas'
import type { ZonaPublica } from './datos/tipos'

export type Contexto = { alterno: string; zona: ZonaPublica | null }
type Resolutor = (lang: Locale, resto: string[]) => Promise<Contexto | null>

async function zonaPorId(lang: Locale, id: number | undefined): Promise<ZonaPublica | null> {
  if (id === undefined) return null
  return (await zonasActivasCacheadas(lang)).find((z) => z.id === id) ?? null
}

function resolutor<T extends { id: number; slug: string }>(
  lista: (lang: Locale) => Promise<T[]>,
  ruta: (lang: Locale, slug: string) => string,
  zonaDe: (x: T) => number | undefined,
): Resolutor {
  return async (lang, [slug]) => {
    const doc = porSlug(await lista(lang), slug)
    if (!doc) return null
    const destino = otroIdioma(lang)
    const otro = porId(await lista(destino), doc.id)
    return { alterno: otro ? ruta(destino, otro.slug) : rutas.portada(destino), zona: await zonaPorId(lang, zonaDe(doc)) }
  }
}

// Documentos con slug propio (plan F3a, contexto.ts).
const DOCUMENTOS: Partial<Record<string, Resolutor>> = {
  [SEGMENTOS.es.lugares]: resolutor(lugaresCacheados, rutas.lugar, (x) => x.zonaId),
  [SEGMENTOS.es.eventos]: resolutor(eventosCacheados, rutas.evento, (x) => x.zonaId),
  [SEGMENTOS.es.articulos]: resolutor(articulosCacheados, rutas.articulo, (x) => x.zonaIds[0]),
  [SEGMENTOS.es.itinerarios]: resolutor(itinerariosCacheados, rutas.itinerario, (x) => x.zonaId),
  [SEGMENTOS.es.temas]: resolutor(temasCacheados, rutas.tema, (x) => x.zonaId ?? undefined),
}

const FIJAS: Record<string, (l: Locale) => string> = {
  [SEGMENTOS.es.eventos]: rutas.eventos,
  [SEGMENTOS.es.negocios]: rutas.negocios,
  [SEGMENTOS.es.privacidad]: rutas.privacidad,
  [SEGMENTOS.es.buscar]: rutas.buscar,
}

const interno = (s: string | undefined) => s === undefined || s.startsWith('--')

async function slugDeCategoriaEn(lang: Locale, slug: string): Promise<string | null> {
  const c = (await categoriasCacheadas(lang)).find((x) => x.slug === slug)
  if (!c) return null
  return (await categoriasCacheadas(otroIdioma(lang))).find((x) => x.id === c.id)?.slug ?? null
}

// Spec §7: «El cambio de idioma lleva al mismo documento en el otro idioma; si no existe, a la portada de la guía
// en ese idioma». También da la zona de la página para el puente a reservas. `segmentos`: árbol en español tras «guia».
export async function contextoDe(lang: Locale, segmentos: string[]): Promise<Contexto> {
  const destino = otroIdioma(lang)
  const portada: Contexto = { alterno: rutas.portada(destino), zona: null }
  const [primero, segundo] = segmentos
  if (interno(primero)) return portada

  const fija = FIJAS[primero]
  if (fija && interno(segundo)) return { alterno: fija(destino), zona: null }

  const documento = DOCUMENTOS[primero]
  if (documento && !interno(segundo)) return (await documento(lang, segmentos.slice(1))) ?? portada

  if (primero === SEGMENTOS.es.categoria) {
    const slug = segundo && !interno(segundo) ? await slugDeCategoriaEn(lang, segundo) : null
    return slug ? { alterno: rutas.categoria(destino, slug), zona: null } : portada
  }

  const zona = (await zonasActivasCacheadas(lang)).find((z) => z.slug === primero) ?? null
  if (!zona) return portada
  const existeEnDestino = (await zonasActivasCacheadas(destino)).some((z) => z.id === zona.id)
  if (!existeEnDestino) return { ...portada, zona }
  if (interno(segundo)) return { alterno: rutas.zona(destino, zona.slug), zona }
  // La combinación debe tener lugares en el otro idioma (spec §7); si no, a la zona.
  const slugCat = await slugDeCategoriaEn(lang, segundo)
  const cat = (await categoriasCacheadas(lang)).find((c) => c.slug === segundo)
  const conLugares = cat ? conteoCombinacion(await lugaresCacheados(destino), zona.id, cat.id) > 0 : false
  return { alterno: slugCat && conLugares ? rutas.categoriaEnZona(destino, zona.slug, slugCat) : rutas.zona(destino, zona.slug), zona }
}
