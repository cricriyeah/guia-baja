import { describe, expect, it } from 'vitest'

import { isoEnMazatlan } from '../../src/dominio/fechas'
import { armarResumen } from '../../src/sitio/datos/resumen'
import type { Imagen, TarjetaArticulo, TarjetaEvento, ZonaPublica } from '../../src/sitio/datos/tipos'
import { erroresResumenV1 } from '../contrato/resumen-v1'

const SITIO = 'https://www.salysoltours.com'
const AHORA = new Date('2026-11-06T12:00:00Z')

const zona = (extra: Partial<ZonaPublica> = {}) => ({ id: 1, slug: 'la-paz', nombre: 'La Paz', sedeSlug: 'la-paz', ...extra }) as ZonaPublica
const imagen = (src: string) => ({ src }) as Imagen
const articulo = (id: number, extra: Partial<TarjetaArticulo> = {}) =>
  ({ id, slug: `a-${id}`, titulo: `Artículo ${id}`, resumen: 'r', zonaIds: [1], portada: imagen('https://img.test/a.webp'), ...extra }) as TarjetaArticulo
const evento = (id: number, inicio: string, extra: Partial<TarjetaEvento> = {}) =>
  ({ id, slug: `e-${id}`, nombre: `Evento ${id}`, zonaId: 1, foto: null, inicio, fin: null, orden: 100, destacado: {}, patrocinio: {}, ...extra }) as unknown as TarjetaEvento

const armar = (d: { zonas?: ZonaPublica[]; articulos?: TarjetaArticulo[]; eventos?: TarjetaEvento[] }, sede = 'la-paz', lang: 'es' | 'en' = 'es') =>
  armarResumen({ zonas: d.zonas ?? [zona()], articulos: d.articulos ?? [], eventos: d.eventos ?? [] }, sede, lang, SITIO, AHORA)

describe('isoEnMazatlan', () => {
  it('expresa el instante con el desfase de BCS', () => {
    expect(isoEnMazatlan('2026-11-15T01:00:00.000Z')).toBe('2026-11-14T18:00:00-07:00')
  })
})

describe('armarResumen', () => {
  it('null si ninguna zona activa tiene esa sede', () => {
    expect(armar({}, 'puerto-chale')).toBeNull()
    expect(armar({ zonas: [zona({ sedeSlug: null })] })).toBeNull()
  })

  it('cumple el esquema congelado, vacío y con datos', () => {
    expect(erroresResumenV1(armar({}))).toEqual([])
    expect(erroresResumenV1(armar({
      articulos: [articulo(1), articulo(2, { portada: null })],
      eventos: [evento(1, '2026-12-01T01:00:00.000Z', { fin: '2026-12-01T03:00:00.000Z' })],
    }))).toEqual([])
  })

  it('URLs absolutas e idioma pedido', () => {
    const r = armar({ articulos: [articulo(1)], eventos: [evento(1, '2026-12-01T01:00:00.000Z')] }, 'la-paz', 'en')
    expect(r?.zona).toEqual({ nombre: 'La Paz', url: `${SITIO}/en/guide/la-paz` })
    expect(r?.articulos[0].url).toBe(`${SITIO}/en/guide/articles/a-1`)
    expect(r?.eventos[0].url).toBe(`${SITIO}/en/guide/events/e-1`)
  })

  it('imagen relativa pasa a absoluta', () => {
    const r = armar({ articulos: [articulo(1, { portada: imagen('/api/media/file/x.webp') })] })
    expect(r?.articulos[0].imagen).toBe(`${SITIO}/api/media/file/x.webp`)
  })

  it('hasta 3 artículos, en el orden recibido (más recientes), solo de la zona', () => {
    const r = armar({ articulos: [articulo(1), articulo(2, { zonaIds: [9] }), articulo(3), articulo(4), articulo(5)] })
    expect(r?.articulos.map((a) => a.titulo)).toEqual(['Artículo 1', 'Artículo 3', 'Artículo 4'])
  })

  it('hasta 3 eventos próximos, los más cercanos, sin pasados ni de otra zona', () => {
    const r = armar({
      eventos: [
        evento(1, '2026-12-05T01:00:00.000Z'),
        evento(2, '2026-11-20T01:00:00.000Z'),
        evento(3, '2020-01-01T01:00:00.000Z'),
        evento(4, '2026-11-10T01:00:00.000Z', { zonaId: 9 }),
        evento(5, '2026-11-25T01:00:00.000Z'),
        evento(6, '2027-01-01T01:00:00.000Z'),
      ],
    })
    expect(r?.eventos.map((e) => e.nombre)).toEqual(['Evento 2', 'Evento 5', 'Evento 1'])
  })
})

describe('el esquema congelado detecta cambios de forma', () => {
  const bueno = { zona: { nombre: 'x', url: 'https://x.test' }, articulos: [], eventos: [] }
  it('acepta la forma exacta', () => {
    expect(erroresResumenV1(bueno)).toEqual([])
  })
  it.each([
    ['clave de más', { ...bueno, extra: 1 }],
    ['zona con clave de más', { ...bueno, zona: { ...bueno.zona, slug: 'x' } }],
    ['falta eventos', { zona: bueno.zona, articulos: [] }],
    ['URL relativa', { ...bueno, zona: { nombre: 'x', url: '/es/guia' } }],
    ['fecha sin desfase', { ...bueno, eventos: [{ nombre: 'x', inicio: '2026-01-01T00:00:00.000Z', fin: null, imagen: null, url: 'https://x.test' }] }],
    ['más de 3', { ...bueno, articulos: Array(4).fill({ titulo: 'x', resumen: 'x', imagen: null, url: 'https://x.test' }) }],
  ])('rechaza: %s', (_, v) => {
    expect(erroresResumenV1(v)).not.toEqual([])
  })
})
