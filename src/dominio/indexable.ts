import type { Locale } from './idioma'
import { combinacionIndexable } from './umbrales'

type Reglas = { guiaIndexable: boolean; noIndexar?: boolean | null; conteo?: number; conFiltros?: boolean }

// Spec §9: cualquiera de estas reglas basta para noindex. Ninguna depende de la petición.
export function esIndexable(r: Reglas): boolean {
  if (!r.guiaIndexable || r.noIndexar || r.conFiltros) return false
  if (r.conteo !== undefined && !combinacionIndexable(r.conteo)) return false
  return true
}

export type VersionIdioma = { lang: Locale; ruta: string; indexable: boolean }

const CODIGO: Record<Locale, string> = { es: 'es-MX', en: 'en-US' }

// hreflang solo entre versiones indexables: si la propia o la otra no lo es, ninguno.
export function hreflang(propia: VersionIdioma, versiones: VersionIdioma[]): Record<string, string> {
  if (!propia.indexable) return {}
  const ok = versiones.filter((v) => v.indexable)
  if (ok.length < 2) return {}
  const mapa: Record<string, string> = {}
  for (const v of ok) mapa[CODIGO[v.lang]] = v.ruta
  const es = ok.find((v) => v.lang === 'es')
  if (es) mapa['x-default'] = es.ruta
  return mapa
}
