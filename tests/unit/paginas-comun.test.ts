import { describe, expect, it } from 'vitest'

import { destinoCodificado, hrefAlternando, paramsDe, recortarListado, totalPaginasDe, varianteDeConsulta, versionesListado } from '../../src/sitio/paginas/comun'
import type { TarjetaLugar } from '../../src/sitio/datos/tipos'

const lugar = (n: number, extra: Partial<TarjetaLugar> = {}): TarjetaLugar => ({
  id: n, slug: `l-${n}`, nombre: `Lugar ${String(n).padStart(3, '0')}`, resumen: '', zonaId: 1, zonaSlug: 'la-paz',
  categoriaIds: [1], foto: null, rangoPrecio: null, horario: [], caracteristicas: [], coordenadas: null,
  patrocinio: { activo: false, desde: null, hasta: null }, orden: 100, destacado: { activo: false, orden: 0 }, noIndexar: false,
  ...extra,
})

describe('destinoCodificado', () => {
  it('slugs válidos y consulta pasan sin cambios', () => {
    expect(destinoCodificado('/es/guia/la-paz/playas?abierto=1&precio=%24')).toBe('/es/guia/la-paz/playas?abierto=1&precio=%24')
  })
  it('codifica cada segmento de la ruta, sin tocar las diagonales ni la consulta', () => {
    expect(destinoCodificado('/es/guia/a b/ñandú\r\nX: 1?x=1')).toBe('/es/guia/a%20b/%C3%B1and%C3%BA%0D%0AX%3A%201?x=1')
    expect(destinoCodificado('/es/guia/%2e%2e')).toBe('/es/guia/%252e%252e')
  })
})

describe('paramsDe', () => {
  it('aplana valores repetidos y omite los indefinidos', () => {
    const p = paramsDe({ a: '1', b: ['x', 'y'], c: undefined })
    expect(p.get('a')).toBe('1')
    expect(p.getAll('b')).toEqual(['x', 'y'])
    expect(p.has('c')).toBe(false)
  })
})

describe('varianteDeConsulta', () => {
  it('lee página y filtros; una página inválida vale 1', async () => {
    expect(await varianteDeConsulta(Promise.resolve({ abierto: '1', pagina: '3' }))).toEqual({ pagina: 3, filtros: { abierto: true } })
    expect((await varianteDeConsulta(Promise.resolve({ abierto: '1', pagina: 'x' }))).pagina).toBe(1)
  })
  it('un parámetro de filtro inválido da filtros vacíos, no nulos (sigue siendo una variante)', async () => {
    expect((await varianteDeConsulta(Promise.resolve({ abierto: '0' }))).filtros).toEqual({})
  })
})

describe('totalPaginasDe', () => {
  it('24 por página, mínimo 1', () => {
    expect([0, 1, 24, 25, 48, 49].map(totalPaginasDe)).toEqual([1, 1, 1, 2, 2, 3])
  })
})

describe('recortarListado', () => {
  const base = Array.from({ length: 30 }, (_, i) => lugar(i + 1, { rangoPrecio: i < 2 ? '$$' : null }))
  it('pagina el listado ordenado', () => {
    expect(recortarListado(base, { pagina: 1, filtros: null })?.items).toHaveLength(24)
    expect(recortarListado(base, { pagina: 2, filtros: null })?.items).toHaveLength(6)
  })
  it('fuera de rango es null', () => {
    expect(recortarListado(base, { pagina: 3, filtros: null })).toBeNull()
  })
  it('aplica los filtros antes de paginar', () => {
    const r = recortarListado(base, { pagina: 1, filtros: { precio: '$$' } })
    expect(r?.items.map((l) => l.id).sort()).toEqual([1, 2])
    expect(r?.totalPaginas).toBe(1)
    expect(r?.total).toBe(2)
    expect(r?.total).toBe(2)
  })
})

describe('versionesListado', () => {
  const rutaDe = (l: 'es' | 'en') => (l === 'es' ? '/es/guia/la-paz/playas' : '/en/guide/la-paz/beaches')
  const enIdioma = (conteos: Record<string, number>) => async (l: 'es' | 'en') => (conteos[l] === undefined ? null : { ruta: rutaDe(l), conteo: conteos[l] })

  it('menos de 3 lugares es noindex; con 3 es indexable', async () => {
    const dos = await versionesListado({ lang: 'es', variante: { pagina: 1, filtros: null }, enIdioma: enIdioma({ es: 2, en: 5 }), guiaIndexable: true })
    expect(dos?.indexable).toBe(false)
    const tres = await versionesListado({ lang: 'es', variante: { pagina: 1, filtros: null }, enIdioma: enIdioma({ es: 3, en: 5 }), guiaIndexable: true })
    expect(tres?.indexable).toBe(true)
    expect(tres?.versiones.map((v) => v.lang)).toEqual(['es', 'en'])
  })
  it('un idioma sin lugares no tiene versión', async () => {
    const r = await versionesListado({ lang: 'es', variante: { pagina: 1, filtros: null }, enIdioma: enIdioma({ es: 4, en: 0 }), guiaIndexable: true })
    expect(r?.versiones.map((v) => v.lang)).toEqual(['es'])
  })
  it('la página N es canónica a sí misma y no enlaza al idioma que no la tiene', async () => {
    const r = await versionesListado({ lang: 'es', variante: { pagina: 2, filtros: null }, enIdioma: enIdioma({ es: 30, en: 10 }), guiaIndexable: true })
    expect(r?.canonica).toBe('/es/guia/la-paz/playas?pagina=2')
    expect(r?.versiones.map((v) => v.lang)).toEqual(['es'])
  })
  it('la variante con filtros: noindex y canónica sin parámetros', async () => {
    const r = await versionesListado({ lang: 'es', variante: { pagina: 4, filtros: { abierto: true } }, enIdioma: enIdioma({ es: 30, en: 10 }), guiaIndexable: true })
    expect(r?.indexable).toBe(false)
    expect(r?.canonica).toBe('/es/guia/la-paz/playas')
  })
  it('página fuera de rango o idioma propio sin combinación: null', async () => {
    expect(await versionesListado({ lang: 'es', variante: { pagina: 3, filtros: null }, enIdioma: enIdioma({ es: 30 }), guiaIndexable: true })).toBeNull()
    expect(await versionesListado({ lang: 'es', variante: { pagina: 1, filtros: null }, enIdioma: enIdioma({ en: 30 }), guiaIndexable: true })).toBeNull()
  })
})

describe('hrefAlternando', () => {
  const ruta = '/es/guia/la-paz/playas'
  it('activa un filtro conservando los demás', () => {
    expect(hrefAlternando(ruta, { precio: '$$' }, 'abierto', true)).toBe(`${ruta}?precio=%24%24&abierto=1`)
  })
  it('quita solo el filtro activo; sin filtros vuelve a la URL base', () => {
    expect(hrefAlternando(ruta, { precio: '$$', abierto: true }, 'abierto', true)).toBe(`${ruta}?precio=%24%24`)
    expect(hrefAlternando(ruta, { abierto: true }, 'abierto', true)).toBe(ruta)
  })
  it('cambiar de valor reemplaza el anterior', () => {
    expect(hrefAlternando(ruta, { precio: '$' }, 'precio', '$$$')).toBe(`${ruta}?precio=%24%24%24`)
  })
})
