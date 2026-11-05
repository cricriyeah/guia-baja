import { describe, expect, it } from 'vitest'

import { versionesDe } from '../../src/sitio/seo/versiones'

const rutas = { es: '/es/guia/la-paz/playas', en: '/en/guide/la-paz/beaches' }

describe('versionesDe (spec §7, §9)', () => {
  it('umbral por idioma', () => {
    const { propia, versiones } = versionesDe({ lang: 'es', guiaIndexable: true, rutas, conteo: { es: 5, en: 2 } })
    expect(propia).toEqual({ lang: 'es', ruta: '/es/guia/la-paz/playas', indexable: true })
    expect(versiones.find((v) => v.lang === 'en')?.indexable).toBe(false)
  })

  it('sin versión en el otro idioma', () => {
    expect(versionesDe({ lang: 'es', guiaIndexable: true, rutas: { es: rutas.es } }).versiones).toHaveLength(1)
  })

  it('la página N solo enlaza al otro idioma si allí existe', () => {
    const v = versionesDe({ lang: 'es', guiaIndexable: true, rutas, conteo: { es: 60, en: 30 }, pagina: 3, totalPaginas: { es: 3, en: 2 } })
    expect(v.propia.ruta).toBe('/es/guia/la-paz/playas?pagina=3')
    expect(v.versiones.map((x) => x.lang)).toEqual(['es'])
  })

  it('noIndexar, filtros y GUIA_INDEXABLE', () => {
    expect(versionesDe({ lang: 'es', guiaIndexable: true, rutas, noIndexar: true }).propia.indexable).toBe(false)
    expect(versionesDe({ lang: 'es', guiaIndexable: true, rutas, conFiltros: true }).propia.indexable).toBe(false)
    expect(versionesDe({ lang: 'es', guiaIndexable: false, rutas }).propia.indexable).toBe(false)
  })
})
