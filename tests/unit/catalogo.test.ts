import { describe, expect, it } from 'vitest'

import { aDolares, toursDe, validarPaquetes, validarServicios, type ItemCatalogo } from '../../src/dominio/catalogo'

const servicio = (extra: Record<string, unknown> = {}) => ({
  id: 1,
  empresa_slug: 'sal-y-sol',
  nombre: 'Pesca deportiva',
  nombre_en: 'Sportfishing',
  slug: 'pesca-deportiva',
  estrategia_precio: 'por_grupo',
  precio_base: '11290.00',
  tipo_cambio_usd: '17.5000',
  activo: true,
  duracion: '6–7 h',
  duracion_en: '6–7 hrs',
  ...extra,
})

const paquete = (extra: Record<string, unknown> = {}) => ({
  id: 1,
  sede_slug: 'la-ventana',
  nombre: 'Paquete 5 noches',
  nombre_en: '5-night package',
  slug: 'paquete-5-noches',
  precio_ancla: '47100.00',
  tipo_cambio_usd: '17.5000',
  estrategia_precio: 'por_persona',
  activo: true,
  noches: 5,
  ...extra,
})

const unServicio = (extra: Record<string, unknown> = {}): ItemCatalogo => validarServicios([servicio(extra)])[0]

describe('validar respuestas del catálogo', () => {
  it('acepta las formas reales e ignora los campos que no usa', () => {
    expect(validarServicios([servicio({ personalizaciones: [] })])).toHaveLength(1)
    expect(validarPaquetes([paquete({ aeropuertos: [] })])).toHaveLength(1)
  })

  it('deja fuera lo inactivo', () => {
    expect(validarServicios([servicio({ activo: false })])).toEqual([])
  })

  it.each([
    ['no es una lista', { results: [] }],
    ['sin nombre', [servicio({ nombre: undefined })]],
    ['slug inseguro', [servicio({ slug: '../x' })]],
    ['empresa insegura', [servicio({ empresa_slug: 'a/b' })]],
    ['precio con letras', [servicio({ precio_base: 'gratis' })]],
    ['estrategia desconocida', [servicio({ estrategia_precio: 'por_kilo' })]],
    ['tipo de cambio en cero', [servicio({ tipo_cambio_usd: '0.0000' })]],
  ])('rechaza: %s', (_, json) => {
    expect(() => validarServicios(json)).toThrow()
  })

  it('rechaza un paquete sin sede', () => {
    expect(() => validarPaquetes([paquete({ sede_slug: null })])).toThrow()
  })
})

describe('aDolares', () => {
  it('redondea hacia arriba al dólar, como el sitio de reservas', () => {
    expect(aDolares('11290.00', '17.5000')).toBe(646)
  })
  it('no sube un monto exacto', () => {
    expect(aDolares('1750.00', '17.5000')).toBe(100)
  })
})

describe('toursDe', () => {
  it('servicio en español: pesos y su duración', () => {
    expect(toursDe([unServicio()], 'es')[0]).toEqual({
      clave: 'servicio:pesca-deportiva',
      tipo: 'servicio',
      slug: 'pesca-deportiva',
      nombre: 'Pesca deportiva',
      precio: { monto: '$11,290', moneda: 'MXN', estrategia: 'por_grupo' },
      duracion: '6–7 h',
      noches: null,
      ruta: '/es/servicio/sal-y-sol/pesca-deportiva',
    })
  })

  it('servicio en inglés: dólares, nombre y ruta en inglés', () => {
    expect(toursDe([unServicio()], 'en')[0]).toMatchObject({
      nombre: 'Sportfishing',
      precio: { monto: '$646', moneda: 'USD' },
      duracion: '6–7 hrs',
      ruta: '/en/servicio/sal-y-sol/pesca-deportiva',
    })
  })

  it('paquete: precio ancla, noches y ruta por sede', () => {
    expect(toursDe(validarPaquetes([paquete()]), 'es')[0]).toMatchObject({
      tipo: 'paquete',
      precio: { monto: '$47,100', estrategia: 'por_persona' },
      duracion: null,
      noches: 5,
      ruta: '/es/sede/la-ventana/paquete/paquete-5-noches',
    })
  })

  it('sin nombre en inglés, el tour no sale en inglés', () => {
    expect(toursDe([unServicio({ nombre_en: '' })], 'en')).toEqual([])
    expect(toursDe([unServicio({ nombre_en: null })], 'es')).toHaveLength(1)
  })

  it('por_ruta y precio nulo no muestran precio', () => {
    expect(toursDe([unServicio({ estrategia_precio: 'por_ruta' })], 'es')[0].precio).toBeNull()
    expect(toursDe([unServicio({ precio_base: null })], 'es')[0].precio).toBeNull()
  })

  it('duración vacía queda en null', () => {
    expect(toursDe([unServicio({ duracion: '' })], 'es')[0].duracion).toBeNull()
  })
})
