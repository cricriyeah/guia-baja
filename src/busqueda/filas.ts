import type { TipoBusqueda } from '../dominio/busqueda'
import { aplanarIdioma, CAMPOS_IDIOMA, CAMPOS_LOCALIZADOS, existeEnIdioma, LOCALES, textoDeLexical, type Locale } from '../dominio/idioma'

export type FilaIndice = {
  tipo: TipoBusqueda
  docId: number
  locale: Locale
  slug: string
  titulo: string
  texto: string
  zonaIds: number[]
  categoriaIds: number[]
  inicio: string | null
  fin: string | null
  patrocinioActivo: boolean
  patrocinioDesde: string | null
  patrocinioHasta: string | null
}

type Doc = Record<string, unknown>
const idDe = (v: unknown): number | null => (typeof v === 'number' ? v : v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'number' ? (v as { id: number }).id : null)
const ids = (v: unknown): number[] => (Array.isArray(v) ? v : v == null ? [] : [v]).map(idDe).filter((x): x is number => x !== null)
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const iso = (v: unknown) => (typeof v === 'string' && v ? new Date(v).toISOString() : null)
const MAX_TEXTO = 20_000

function base(tipo: TipoBusqueda, doc: Doc, locale: Locale, slug: string, titulo: string, texto: string): FilaIndice {
  const p = (doc.patrocinio ?? {}) as { activo?: boolean; desde?: string; hasta?: string }
  return {
    tipo, docId: doc.id as number, locale, slug, titulo, texto: texto.slice(0, MAX_TEXTO),
    zonaIds: ids(doc.zonas ?? doc.zona), categoriaIds: ids(doc.categorias),
    inicio: iso(doc.inicio), fin: iso(doc.fin),
    patrocinioActivo: Boolean(p.activo), patrocinioDesde: iso(p.desde), patrocinioHasta: iso(p.hasta),
  }
}

function textoDeDias(dias: unknown, l: Locale): string {
  const localizado = (v: unknown) => (v && typeof v === 'object' ? str((v as Record<string, unknown>)[l]) : str(v))
  return ((dias ?? []) as { titulo?: unknown; paradas?: { nota?: unknown }[] }[])
    .flatMap((d) => [localizado(d.titulo), ...(d.paradas ?? []).map((p) => localizado(p.nota))])
    .filter(Boolean)
    .join(' ')
}

// Qué entra al índice (spec §6, §7): solo lo publicado (zonas: activas) y en los idiomas en que existe.
// `doc` viene de la tabla principal con locale 'all' (cada campo localizado como { es, en }).
export function filasDe(tipo: TipoBusqueda, doc: Doc | null): FilaIndice[] {
  if (!doc) return []
  const salida: FilaIndice[] = []
  for (const l of LOCALES) {
    if (tipo === 'itinerario' || tipo === 'tema') {
      if (doc._status !== 'published') return []
      const col = tipo === 'itinerario' ? 'itinerarios' : 'temas'
      const plano = aplanarIdioma(doc, l, CAMPOS_LOCALIZADOS[col])
      if (!existeEnIdioma(plano, CAMPOS_IDIOMA[col])) continue
      const cuerpo = tipo === 'itinerario' ? plano.cuerpo : plano.introduccion
      const dias = tipo === 'itinerario' ? textoDeDias(doc.dias, l) : ''
      const titulo = str(plano.titulo)
      salida.push(base(tipo, doc, l, str(plano.slug), titulo, `${titulo} ${str(plano.resumen)} ${textoDeLexical(cuerpo)} ${dias}`))
      continue
    }
    if (tipo === 'lugar' || tipo === 'evento' || tipo === 'articulo') {
      if (doc._status !== 'published') return []
      const col = tipo === 'lugar' ? 'lugares' : tipo === 'evento' ? 'eventos' : 'articulos'
      // nombre de lugar no es localizado; nombre de evento y titulo de artículo sí (están en CAMPOS_LOCALIZADOS).
      const plano = aplanarIdioma(doc, l, CAMPOS_LOCALIZADOS[col])
      if (!existeEnIdioma(plano, CAMPOS_IDIOMA[col])) continue
      const titulo = tipo === 'lugar' ? str(doc.nombre) : tipo === 'evento' ? str(plano.nombre) : str(plano.titulo)
      salida.push(base(tipo, doc, l, str(plano.slug), titulo, `${titulo} ${str(plano.resumen)} ${textoDeLexical(plano.cuerpo)}`))
    } else if (tipo === 'zona') {
      if (!doc.activa) return []
      const plano = aplanarIdioma(doc, l, ['nombre', 'descripcion'])
      if (!str(plano.nombre)) continue
      salida.push(base(tipo, { ...doc, zona: doc.id }, l, str(doc.slug), str(plano.nombre), `${str(plano.nombre)} ${str(plano.descripcion)}`))
    } else if (tipo === 'categoria') {
      const plano = aplanarIdioma(doc, l, ['nombre', 'slug'])
      if (!str(plano.nombre) || !str(plano.slug)) continue
      salida.push(base(tipo, { ...doc, categorias: [doc.id] }, l, str(plano.slug), str(plano.nombre), str(plano.nombre)))
    }
  }
  return salida
}
