import { redirect } from 'next/navigation'

import { consultaDeFiltros, filtrarLugares, leerFiltros, type Filtros } from '../../dominio/filtros'
import { LOCALES, type Locale } from '../../dominio/idioma'
import type { VersionIdioma } from '../../dominio/indexable'
import { ordenarListado } from '../../dominio/orden'
import { numeroDePagina, paginar, POR_PAGINA } from '../../dominio/paginacion'
import { conConsulta } from '../../dominio/rutas'
import { UMBRAL_PAGINA } from '../../dominio/umbrales'
import type { TarjetaLugar } from '../datos/tipos'
import { versionesDe } from '../seo/versiones'

export type Variante = { pagina: number; filtros: Filtros | null }
export type SearchParams = Promise<Record<string, string | string[] | undefined>>

export function paramsDe(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) p.append(k, x)
  return p
}

// Variante de las rutas --filtros. `leerFiltros` devuelve {} si los valores no son válidos, y {} sigue siendo una
// variante (no nulo): el proxy solo manda a --filtros cuando la URL trae un parámetro de filtro, aunque no valga.
export async function varianteDeConsulta(searchParams: SearchParams): Promise<Variante> {
  const p = paramsDe(await searchParams)
  return { pagina: numeroDePagina(p.get('pagina') ?? '1') ?? 1, filtros: leerFiltros(p) }
}

export const totalPaginasDe = (n: number): number => Math.max(1, Math.ceil(n / POR_PAGINA))

// Orden de F3a (patrocinios arriba) sobre el listado ya filtrado, y recorte a la página. null = fuera de rango.
// `total` es el número de resultados de todas las páginas.
export function recortarListado(base: TarjetaLugar[], v: Variante, ahora: Date = new Date()) {
  const filtrados = v.filtros ? filtrarLugares(base, v.filtros, ahora.toISOString()) : base
  const pag = paginar(ordenarListado(filtrados, ahora), v.pagina)
  return pag && { ...pag, total: filtrados.length }
}

// Href de un chip de filtro: lo activa conservando los demás filtros, o lo quita si ya estaba activo.
export function hrefAlternando<K extends keyof Filtros>(ruta: string, filtros: Filtros, clave: K, valor: NonNullable<Filtros[K]>): string {
  const siguiente = { ...filtros }
  if (siguiente[clave] === valor) delete siguiente[clave]
  else siguiente[clave] = valor
  return conConsulta(ruta, consultaDeFiltros(siguiente))
}

// Las rutas --filtros son dinámicas y nunca dan 404 ellas mismas (en render dinámico Next 16.4.3 deja el cascarón
// `__next_error__`): redirigen a la URL del listado, donde la ruta ISR da la página o el 404 completo.
export function desviar(v: Variante, destino: string): void {
  if (v.filtros) redirect(destino)
}

type EnIdioma = { ruta: string; conteo: number }

// Versiones por idioma de un listado y sus reglas de SEO (spec §7, §9): la combinación existe en un idioma con ≥ 1
// lugar y se indexa con ≥ 3; la página N es canónica a sí misma; la variante con filtros es noindex y su canónica
// es la URL sin parámetros. null si la combinación o la página no existen en el idioma de la petición.
export async function versionesListado(e: {
  lang: Locale
  variante: Variante
  guiaIndexable: boolean
  enIdioma: (l: Locale) => Promise<EnIdioma | null>
}): Promise<{ indexable: boolean; canonica: string; versiones: VersionIdioma[] } | null> {
  const rutas: Partial<Record<Locale, string>> = {}
  const conteo: Partial<Record<Locale, number>> = {}
  const totalPaginas: Partial<Record<Locale, number>> = {}
  for (const l of LOCALES) {
    const d = await e.enIdioma(l)
    if (!d || d.conteo < UMBRAL_PAGINA) continue
    rutas[l] = d.ruta
    conteo[l] = d.conteo
    totalPaginas[l] = totalPaginasDe(d.conteo)
  }
  const propia = rutas[e.lang]
  const { filtros, pagina } = e.variante
  if (!propia || (!filtros && pagina > (totalPaginas[e.lang] ?? 1))) return null
  const v = versionesDe({ lang: e.lang, guiaIndexable: e.guiaIndexable, rutas, conteo, totalPaginas, pagina: filtros ? 1 : pagina, conFiltros: Boolean(filtros) })
  return { indexable: v.propia.indexable, canonica: filtros ? propia : v.propia.ruta, versiones: v.versiones }
}

// Ruta de un documento en cada idioma en que existe (para hreflang y canónica). `rutaEn` devuelve la ruta pública del
// documento en ese idioma o undefined si no existe ahí (spec §6: un documento ausente en un idioma da 404 en él).
export async function rutasPorIdioma(rutaEn: (l: Locale) => Promise<string | undefined>): Promise<Partial<Record<Locale, string>>> {
  const pares = await Promise.all(LOCALES.map(async (l) => [l, await rutaEn(l)] as const))
  return Object.fromEntries(pares.filter(([, r]) => r !== undefined))
}
