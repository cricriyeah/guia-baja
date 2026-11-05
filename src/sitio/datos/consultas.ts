import { esEventoProximo } from '../../dominio/eventos'
import type { Locale } from '../../dominio/idioma'
import { ordenarListado } from '../../dominio/orden'
import { rutas } from '../../dominio/rutas'
import { UMBRAL_PAGINA } from '../../dominio/umbrales'
import type { CategoriaPublica, TarjetaArticulo, TarjetaEvento, TarjetaLugar } from './tipos'

export const porSlug = <T extends { slug: string }>(xs: T[], slug: string) => xs.find((x) => x.slug === slug)
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

const nombreDe = (x: ItemDestacado) => (x.tipo === 'articulo' ? x.item.titulo : x.item.nombre)

// Spec §6, «Destacar en portada»: por ordenDestacado; un evento destacado que ya pasó deja de mostrarse.
// Desempate por nombre (el orden por defecto es 100 en todos).
export function destacados(
  l: { lugares: TarjetaLugar[]; eventos: TarjetaEvento[]; articulos: TarjetaArticulo[] },
  ahoraIso: string,
): ItemDestacado[] {
  const ahora = new Date(ahoraIso)
  const todos: ItemDestacado[] = [
    ...l.lugares.filter((x) => x.destacado.activo).map((item) => ({ tipo: 'lugar' as const, item })),
    ...l.eventos.filter((x) => x.destacado.activo && esEventoProximo(x, ahora)).map((item) => ({ tipo: 'evento' as const, item })),
    ...l.articulos.filter((x) => x.destacado.activo).map((item) => ({ tipo: 'articulo' as const, item })),
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
  l: { lugares: TarjetaLugar[]; eventos: TarjetaEvento[]; articulos: TarjetaArticulo[] },
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
      if (relationTo === 'articulos') {
        const x = porId(l.articulos, id)
        return x ? rutas.articulo(lang, x.slug) : null
      }
      return null
    },
  }
}
