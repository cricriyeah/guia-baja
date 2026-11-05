import { LOCALES, type Locale } from '../../dominio/idioma'
import { esIndexable, type VersionIdioma } from '../../dominio/indexable'
import { conPagina } from '../../dominio/rutas'

type Entrada = {
  lang: Locale
  guiaIndexable: boolean
  rutas: Partial<Record<Locale, string>>
  noIndexar?: boolean
  conteo?: Partial<Record<Locale, number>>
  conFiltros?: boolean
  pagina?: number
  totalPaginas?: Partial<Record<Locale, number>>
}

// Versiones de una página en los dos idiomas con sus reglas de indexabilidad (spec §7, §9). La página N solo
// existe en un idioma si ese idioma tiene N páginas: si no, no se enlaza (el hreflang daría 404).
export function versionesDe(e: Entrada): { propia: VersionIdioma; versiones: VersionIdioma[] } {
  const pagina = e.pagina ?? 1
  const versiones: VersionIdioma[] = []
  for (const l of LOCALES) {
    const ruta = e.rutas[l]
    if (!ruta) continue
    if (pagina > 1 && (e.totalPaginas?.[l] ?? 1) < pagina) continue
    versiones.push({
      lang: l,
      ruta: conPagina(ruta, pagina),
      indexable: esIndexable({ guiaIndexable: e.guiaIndexable, noIndexar: e.noIndexar, conteo: e.conteo?.[l], conFiltros: e.conFiltros }),
    })
  }
  const propia = versiones.find((v) => v.lang === e.lang) ?? {
    lang: e.lang,
    ruta: conPagina(e.rutas[e.lang] ?? '', pagina),
    indexable: false,
  }
  return { propia, versiones }
}
