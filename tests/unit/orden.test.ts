import { describe, expect, it } from 'vitest'

import { ordenarListado } from '../../src/dominio/orden'

const ahora = new Date('2026-11-10T12:00:00-07:00')
const vig = (desde: string) => ({ activo: true, desde, hasta: '2026-12-31' })

describe('ordenarListado (spec §7)', () => {
  it('hasta 2 patrocinios vigentes arriba, por desde más antiguo y luego nombre', () => {
    const items = [
      { nombre: 'A', orden: 1 },
      { nombre: 'P3', orden: 50, patrocinio: vig('2026-11-05') },
      { nombre: 'P1', orden: 90, patrocinio: vig('2026-11-01') },
      { nombre: 'P2b', orden: 90, patrocinio: vig('2026-11-03') },
      { nombre: 'P2a', orden: 90, patrocinio: vig('2026-11-03') },
    ]
    expect(ordenarListado(items, ahora).map((i) => i.nombre)).toEqual(['P1', 'P2a', 'A', 'P3', 'P2b'])
  })

  it('un patrocinio declarado pero no vigente no sube', () => {
    const items = [{ nombre: 'B', orden: 1 }, { nombre: 'F', orden: 9, patrocinio: vig('2026-12-01') }]
    expect(ordenarListado(items, ahora).map((i) => i.nombre)).toEqual(['B', 'F'])
  })

  it('el resto por orden y luego nombre; sin orden cuenta como 100', () => {
    const items = [{ nombre: 'C' }, { nombre: 'B', orden: 100 }, { nombre: 'Z', orden: 5 }]
    expect(ordenarListado(items, ahora).map((i) => i.nombre)).toEqual(['Z', 'B', 'C'])
  })

  it('en eventos el resto va por inicio', () => {
    const items = [
      { nombre: 'Tarde', inicio: '2026-11-20T18:00:00Z' },
      { nombre: 'Pronto', inicio: '2026-11-12T18:00:00Z' },
    ]
    expect(ordenarListado(items, ahora, { porInicio: true }).map((i) => i.nombre)).toEqual(['Pronto', 'Tarde'])
  })
})
