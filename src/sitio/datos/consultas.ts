import { esEventoProximo } from '../../dominio/eventos'
import type { Locale } from '../../dominio/idioma'
import { ordenarListado } from '../../dominio/orden'
import { rutas } from '../../dominio/rutas'
import { lugaresDeTema, temaIndexable } from '../../dominio/temas'
import { UMBRAL_PAGINA } from '../../dominio/umbrales'
import type { CategoriaPublica, TarjetaArticulo, TarjetaEvento, TarjetaItinerario, TarjetaLugar, TarjetaTema } from './tipos'

export const porSlug = <T extends { slug: string }>(xs: T[], slug: string) => xs.find((x) => x.slug === slug)

// Carga común de las fichas de lugar, evento y artículo: la tarjeta por slug en la lista del idioma y, si existe, su ficha.
// Sin tarjeta o sin ficha en el idioma: null (la página decide entre redirección y 404).
export async function documentoPorSlug<T extends { id: number; slug: string }, F>(
  lista: Promise<T[]>,
  ficha: (id: number) => Promise<F | null>,
  slug: string,
): Promise<{ lista: T[]; ficha: F } | null> {
  const xs = await lista
  const tarjeta = porSlug(xs, slug)
  if (!tarjeta) return null
  const f = await ficha(tarjeta.id)
  return f ? { lista: xs, ficha: f } : null
}

export const porId = <T extends { id: number }>(xs: T[], id: number | null | undefined) => xs.find((x) => x.id === id)

export function lugaresDe(ls: TarjetaLugar[], f: { zonaId?: number | null; categoriaId?: number }): TarjetaLugar[] {
  return ls.filter((l) => (f.zonaId == null || l.zonaId === f.zonaId) && (f.categoriaId === undefined || l.categoriaIds.includes(f.categoriaId)))
}

export const conteoCombinacion = (ls: TarjetaLugar[], zonaId: number | null, categoriaId: number) =>
  lugaresDe(ls, { zonaId, categoriaId }).length

// Spec §7: una píldora existe si su combinación tiene al menos 1 lugar en el idioma.
export function categoriasConLugares(ls: TarjetaLugar[], cats: CategoriaPublica[], zonaId?: number): CategoriaPublica[] {
  return cats.filter((c) => c.aplicaA !== 'evento' && lugaresDe(ls, { zonaId, categoriaId: c.id }).length >= UMBRAL_PAGINA)
}

export function eventosProximos(es: TarjetaEvento[], ahoraIso: string, f: { zonaId?: number; lugarId?: number }): TarjetaEvento[] {
  const ahora = new Date(ahoraIso)
  const proximos = es.filter(
    (e) => esEventoProximo(e, ahora) && (f.zonaId === undefined || e.zonaId === f.zonaId) && (f.lugarId === undefined || e.lugarId === f.lugarId),
  )
  return ordenarListado(proximos, ahora, { porInicio: true })
}

export const articulosDeZona = (as: TarjetaArticulo[], zonaId: number) => as.filter((a) => a.zonaIds.includes(zonaId))
export const articulosQueCitan = (as: TarjetaArticulo[], lugarId: number) => as.filter((a) => a.lugaresCitados.includes(lugarId))

export type ItemDestacado =
  | { tipo: 'lugar'; item: TarjetaLugar }
  | { tipo: 'evento'; item: TarjetaEvento }
  | { tipo: 'articulo'; item: TarjetaArticulo }
  | { tipo: 'itinerario'; item: TarjetaItinerario }
  | { tipo: 'tema'; item: TarjetaTema }

const nombreDe = (x: ItemDestacado) => ('titulo' in x.item ? x.item.titulo : x.item.nombre)

// Spec §6, «Destacar en portada»: por ordenDestacado; un evento destacado que ya pasó deja de mostrarse.
// Desempate por nombre (el orden por defecto es 100 en todos).
export function destacados(
  l: { lugares: TarjetaLugar[]; eventos: TarjetaEvento[]; articulos: TarjetaArticulo[]; itinerarios?: TarjetaItinerario[]; temas?: TarjetaTema[] },
  ahoraIso: string,
): ItemDestacado[] {
  const ahora = new Date(ahoraIso)
  const todos: ItemDestacado[] = [
    ...l.lugares.filter((x) => x.destacado.activo).map((item) => ({ tipo: 'lugar' as const, item })),
    ...l.eventos.filter((x) => x.destacado.activo && esEventoProximo(x, ahora)).map((item) => ({ tipo: 'evento' as const, item })),
    ...l.articulos.filter((x) => x.destacado.activo).map((item) => ({ tipo: 'articulo' as const, item })),
    ...(l.itinerarios ?? []).filter((x) => x.destacado.activo).map((item) => ({ tipo: 'itinerario' as const, item })),
    ...(l.temas ?? []).filter((x) => x.destacado.activo).map((item) => ({ tipo: 'tema' as const, item })),
  ]
  return todos.sort((a, b) => a.item.destacado.orden - b.item.destacado.orden || nombreDe(a).localeCompare(nombreDe(b), 'es'))
}

export type Resolutor = {
  lugar(id: number): TarjetaLugar | undefined
  evento(id: number): TarjetaEvento | undefined
  href(relationTo: string, id: number): string | null
}

// Ids del cuerpo → tarjetas y rutas del idioma. Lo que no está en las listas no existe para el público.
export function resolutorDeCuerpo(
  l: { lugares: TarjetaLugar[]; eventos: TarjetaEvento[]; articulos: TarjetaArticulo[]; itinerarios?: { id: number; slug: string }[]; temas?: { id: number; slug: string }[] },
  lang: Locale,
): Resolutor {
  return {
    lugar: (id) => porId(l.lugares, id),
    evento: (id) => porId(l.eventos, id),
    href: (relationTo, id) => {
      if (relationTo === 'lugares') {
        const x = porId(l.lugares, id)
        return x ? rutas.lugar(lang, x.slug) : null
      }
      if (relationTo === 'eventos') {
        const x = porId(l.eventos, id)
        return x ? rutas.evento(lang, x.slug) : null
      }
      if (relationTo === 'itinerarios') {
        const x = porId(l.itinerarios ?? [], id)
        return x ? rutas.itinerario(lang, x.slug) : null
      }
      if (relationTo === 'temas') {
        const x = porId(l.temas ?? [], id)
        return x ? rutas.tema(lang, x.slug) : null
      }
      if (relationTo === 'articulos') {
        const x = porId(l.articulos, id)
        return x ? rutas.articulo(lang, x.slug) : null
      }
      return null
    },
  }
}

export type Plan = { tipo: 'itinerario'; item: TarjetaItinerario } | { tipo: 'tema'; item: TarjetaTema }
type ListasTema = { lugares: TarjetaLugar[]; zonasActivasIds: readonly number[] }
const MAX_PLANES = 6

const ordenPlan = (a: Plan, b: Plan) =>
  Number(b.item.destacado.activo) - Number(a.item.destacado.activo)
  || (a.item.destacado.activo ? a.item.destacado.orden - b.item.destacado.orden : 0)
  || (b.item.actualizadoEl ?? '').localeCompare(a.item.actualizadoEl ?? '')

export function planesDeZona(itinerarios: TarjetaItinerario[], temas: TarjetaTema[], zonaId: number, listas: ListasTema, ahora: Date): Plan[] {
  const deLaZona: Plan[] = [
    ...itinerarios.filter((x) => x.zonaId === zonaId).map((item) => ({ tipo: 'itinerario' as const, item })),
    ...temas.filter((x) => x.zonaId === zonaId).map((item) => ({ tipo: 'tema' as const, item })),
  ].sort(ordenPlan)
  const sinZona: Plan[] = temas
    .filter((x) => x.zonaId === null && lugaresDeTema(x.criterios, listas, ahora).some((l) => l.zonaId === zonaId))
    .map((item) => ({ tipo: 'tema' as const, item }))
  return [...deLaZona, ...sinZona.sort(ordenPlan)].slice(0, MAX_PLANES)
}

export function planesSinZona(temas: TarjetaTema[], listas: ListasTema, ahora: Date): Plan[] {
  return temas
    .filter((x) => x.zonaId === null && !x.noIndexar && temaIndexable(lugaresDeTema(x.criterios, listas, ahora).length))
    .map((item) => ({ tipo: 'tema' as const, item }))
    .sort(ordenPlan)
    .slice(0, MAX_PLANES)
}

export function planesQueCitan(lugarId: number, itinerarios: TarjetaItinerario[], temas: TarjetaTema[], listas: ListasTema, ahora: Date): Plan[] {
  return [
    ...itinerarios.filter((x) => x.lugaresCitados.includes(lugarId)).map((item) => ({ tipo: 'itinerario' as const, item })),
    ...temas.filter((x) => lugaresDeTema(x.criterios, listas, ahora).some((l) => l.id === lugarId)).map((item) => ({ tipo: 'tema' as const, item })),
  ]
}

export function temaParaFiltro(temas: TarjetaTema[], f: { zonaId: number; categoriaId: number; caracteristica: string }): TarjetaTema | undefined {
  return temas.find((t) =>
    t.zonaId === f.zonaId
    && t.criterios.categoriaIds.length === 1 && t.criterios.categoriaIds[0] === f.categoriaId
    && t.criterios.caracteristicas.length === 1 && t.criterios.caracteristicas[0] === f.caracteristica
    && t.criterios.servicios.length === 0)
}
