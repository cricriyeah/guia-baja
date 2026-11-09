import { describe, expect, it } from 'vitest'

import { chipsVisita, filasVisita, tieneVisita, validarVisita, type VisitaPublica } from '../../src/dominio/visita'

const v = (extra: Partial<VisitaPublica> = {}): VisitaPublica => ({
  costoEntrada: null, entradaGratis: false, minutosDesdeZona: null, medio: null, comoLlegar: null, servicios: [], mejorHora: null, ...extra,
})

describe('validarVisita', () => {
  it('tiempo y medio van juntos', () => {
    expect(validarVisita({ minutosDesdeZona: 45 })).not.toBe(true)
    expect(validarVisita({ medio: 'auto' })).not.toBe(true)
    expect(validarVisita({ minutosDesdeZona: 45, medio: 'auto' })).toBe(true)
  })
  it('sin-servicios no se combina', () => {
    expect(validarVisita({ servicios: ['sin-servicios', 'sombra'] })).not.toBe(true)
    expect(validarVisita({ servicios: ['sin-servicios'] })).toBe(true)
  })
  it('vacío es válido', () => expect(validarVisita({})).toBe(true))
  it('sin valor es válido', () => expect(validarVisita(null)).toBe(true))
})

describe('filasVisita', () => {
  it('solo las filas con valor', () => {
    expect(filasVisita(v({ mejorHora: 'Temprano' }), 'es', 'La Paz')).toEqual([{ dato: 'Mejor hora', valor: 'Temprano' }])
  })
  it('«Gratis» gana a costoEntrada', () => {
    expect(filasVisita(v({ entradaGratis: true, costoEntrada: '$100' }), 'es', 'La Paz')[0]).toEqual({ dato: 'Entrada', valor: 'Gratis' })
  })
  it('tiempo con medio y zona, y servicios en su idioma', () => {
    const filas = filasVisita(v({ minutosDesdeZona: 45, medio: 'auto', servicios: ['sombra', 'banos'] }), 'en', 'La Paz')
    expect(filas).toContainEqual({ dato: 'Getting there', valor: '45 min by car from La Paz' })
    expect(filas).toContainEqual({ dato: 'Services', valor: 'Shade, Restrooms' })
  })
})

describe('chipsVisita', () => {
  it('costo y tiempo', () => {
    expect(chipsVisita(v({ costoEntrada: '$100 MXN', minutosDesdeZona: 30, medio: 'lancha' }), 'es', 'La Paz')).toEqual(['$100 MXN', '30 min en lancha desde La Paz'])
  })
  it('sin datos no hay chips', () => expect(chipsVisita(v(), 'es', 'La Paz')).toEqual([]))
})

describe('tieneVisita', () => {
  it('falso sin datos y verdadero con uno', () => {
    expect(tieneVisita(v())).toBe(false)
    expect(tieneVisita(v({ servicios: ['sombra'] }))).toBe(true)
  })
})
