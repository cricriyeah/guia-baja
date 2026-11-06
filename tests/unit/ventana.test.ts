import { describe, expect, it } from 'vitest'

import { cayoEnVentana, instantesDeCambio } from '../../src/dominio/ventana'

describe('ventana del cron (spec §10)', () => {
  const ahora = new Date('2026-11-10T08:05:00Z') // 01:05 en BCS
  it('cayó en los últimos 65 minutos', () => {
    expect(cayoEnVentana(new Date('2026-11-10T07:05:00Z'), ahora)).toBe(true)
    expect(cayoEnVentana(new Date('2026-11-10T06:59:00Z'), ahora)).toBe(false)
    expect(cayoEnVentana(new Date('2026-11-10T08:06:00Z'), ahora)).toBe(false)
  })
  it('patrocinio de solo día cuenta desde las 00:00 de BCS', () => {
    const i = instantesDeCambio({ patrocinio: { desde: '2026-11-10T00:00:00.000Z', hasta: null }, inicio: null, fin: null })
    expect(i.map((d) => d.toISOString())).toEqual(['2026-11-10T07:00:00.000Z'])
    expect(cayoEnVentana(i[0], ahora)).toBe(true)
  })
  it('evento: inicio y fin', () => {
    expect(instantesDeCambio({ inicio: '2026-11-10T08:00:00Z', fin: '2026-11-10T10:00:00Z' })).toHaveLength(2)
  })
  it('sin fechas no hay instantes', () => {
    expect(instantesDeCambio({})).toEqual([])
    expect(instantesDeCambio({ patrocinio: null, inicio: null, fin: null })).toEqual([])
  })
})
