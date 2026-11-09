import type { TarjetaLugar } from '../sitio/datos/tipos'
import { ordenarListado } from './orden'
import { UMBRAL_INDEXABLE } from './umbrales'

export const MAX_LUGARES_TEMA = 24

// Única entrada de la lista de un tema (spec del paquete 2 §2.3): la usan la página, el sitemap, «Aparece en» y el admin.
export type CriteriosTema = { zonaId: number | null; categoriaIds: number[]; caracteristicas: string[]; servicios: string[]; lugaresFijosIds: number[] }

const hayCriterios = (c: CriteriosTema) => c.categoriaIds.length > 0 || c.caracteristicas.length > 0 || c.servicios.length > 0

export function lugaresDeTema(c: CriteriosTema, listas: { lugares: TarjetaLugar[]; zonasActivasIds: readonly number[] }, ahora: Date): TarjetaLugar[] {
  const porId = new Map(listas.lugares.map((l) => [l.id, l]))
  const fijos = c.lugaresFijosIds.map((id) => porId.get(id)).filter((l): l is TarjetaLugar => Boolean(l))
  if (!hayCriterios(c)) return fijos.slice(0, MAX_LUGARES_TEMA)
  const yaFijos = new Set(fijos.map((l) => l.id))
  const cumplen = listas.lugares.filter((l) => {
    if (yaFijos.has(l.id)) return false
    if (c.zonaId !== null ? l.zonaId !== c.zonaId : !listas.zonasActivasIds.includes(l.zonaId)) return false
    if (c.categoriaIds.length && !c.categoriaIds.some((id) => l.categoriaIds.includes(id))) return false
    if (!c.caracteristicas.every((x) => l.caracteristicas.includes(x))) return false
    return c.servicios.every((x) => l.servicios.includes(x))
  })
  return [...fijos, ...ordenarListado(cumplen, ahora)].slice(0, MAX_LUGARES_TEMA)
}

export const temaIndexable = (n: number): boolean => n >= UMBRAL_INDEXABLE
