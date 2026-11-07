import { SEGMENTOS } from './rutas'
import { SEGMENTO_FILTROS } from './rutas-publicas'
import { esSlugValido } from './slugs'

// Reglas puras de la presencia de reservas en la Guía (docs/specs/2026-11-07-presencia-reservas-design.md).

export const MAX_TOURS_RELACIONADOS = 3

// Misma clave que arma toursDe en dominio/catalogo.ts.
export function esClaveDeTour(v: unknown): v is string {
  if (typeof v !== 'string') return false
  const [tipo, slug, ...resto] = v.split(':')
  return resto.length === 0 && (tipo === 'servicio' || tipo === 'paquete') && slug !== undefined && esSlugValido(slug)
}

// Validación del campo `toursRelacionados` de Lugares (§2.1): solo formato y máximo; el catálogo no se consulta al guardar.
export function validarToursRelacionados(v: unknown): true | string {
  if (v === null || v === undefined) return true
  if (!Array.isArray(v)) return 'Lista de tours inválida.'
  if (v.length > MAX_TOURS_RELACIONADOS) return `Máximo ${MAX_TOURS_RELACIONADOS} tours relacionados.`
  if (!v.every(esClaveDeTour)) return 'Clave de tour inválida (servicio:slug o paquete:slug).'
  if (new Set(v).size !== v.length) return 'Hay un tour repetido.'
  return true
}

// Tours relacionados visibles: los del catálogo con clave guardada, en el orden guardado. Claves viejas se ignoran.
export function relacionadosVisibles<T extends { clave: string }>(tours: T[], claves: readonly string[] | null | undefined): T[] {
  if (!claves?.length || !tours.length) return []
  const porClave = new Map(tours.map((t) => [t.clave, t]))
  return claves.flatMap((c) => porClave.get(c) ?? [])
}

export type TipoPagina = 'ficha' | 'formulario' | 'privacidad' | 'filtrada' | 'busqueda' | 'otra'

// Tipo de página a partir del árbol en español tras «guia» (lo que recibe el slot). `filtrada` es solo la variante
// `--filtros` (force-dynamic) de eventos y de categoría en todas las zonas: el listado de eventos sin filtro y su
// paginación son `otra` y siguen siendo ISR.
export function tipoDePagina(segmentos: readonly string[]): TipoPagina {
  const [a, b, c] = segmentos
  const interno = (s: string | undefined) => s === undefined || s.startsWith('--')
  if (a === SEGMENTOS.es.lugares && !interno(b)) return 'ficha'
  if (a === SEGMENTOS.es.negocios) return 'formulario'
  if (a === SEGMENTOS.es.privacidad) return 'privacidad'
  if (a === SEGMENTOS.es.buscar) return 'busqueda'
  if (a === SEGMENTOS.es.eventos && b === SEGMENTO_FILTROS) return 'filtrada'
  if (a === SEGMENTOS.es.categoria && !interno(b) && c === SEGMENTO_FILTROS) return 'filtrada'
  return 'otra'
}

type ZonaMinima = { slug: string; sedeSlug: string | null }

// Regla única de zona de la barra, la tarjeta y los bloques de búsqueda (§2.2). null = «Tours en la Baja».
export function zonaDeTours<Z extends ZonaMinima>(p: {
  tipo: TipoPagina
  filtroZona: string | null
  zonaContexto: Z | null
  zonas: Z[]
}): (Z & { sedeSlug: string }) | null {
  const filtrada = p.tipo === 'filtrada' || p.tipo === 'busqueda' ? p.zonas.find((z) => z.slug === p.filtroZona) : undefined
  const zona = filtrada ?? p.zonaContexto ?? p.zonas.find((z) => z.sedeSlug) ?? null
  return zona?.sedeSlug ? (zona as Z & { sedeSlug: string }) : null
}
