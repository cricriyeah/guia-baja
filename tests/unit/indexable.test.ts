import { describe, expect, it } from 'vitest'

import { esIndexable, hreflang } from '../../src/dominio/indexable'

describe('esIndexable (spec §9)', () => {
  it('cualquier regla basta para noindex', () => {
    expect(esIndexable({ guiaIndexable: true })).toBe(true)
    expect(esIndexable({ guiaIndexable: false })).toBe(false)
    expect(esIndexable({ guiaIndexable: true, noIndexar: true })).toBe(false)
    expect(esIndexable({ guiaIndexable: true, conFiltros: true })).toBe(false)
    expect(esIndexable({ guiaIndexable: true, conteo: 2 })).toBe(false)
    expect(esIndexable({ guiaIndexable: true, conteo: 3 })).toBe(true)
  })
})

describe('hreflang solo entre versiones indexables', () => {
  const es = { lang: 'es' as const, ruta: '/es/guia/la-paz', indexable: true }
  const en = { lang: 'en' as const, ruta: '/en/guide/la-paz', indexable: true }

  it('dos versiones indexables: las dos y x-default al español', () => {
    expect(hreflang(es, [es, en])).toEqual({ 'es-MX': '/es/guia/la-paz', 'en-US': '/en/guide/la-paz', 'x-default': '/es/guia/la-paz' })
  })

  it('si la otra no es indexable o no existe, ninguno', () => {
    expect(hreflang(es, [es, { ...en, indexable: false }])).toEqual({})
    expect(hreflang(es, [es])).toEqual({})
  })

  it('si la propia no es indexable, ninguno', () => {
    expect(hreflang({ ...es, indexable: false }, [{ ...es, indexable: false }, en])).toEqual({})
  })
})
