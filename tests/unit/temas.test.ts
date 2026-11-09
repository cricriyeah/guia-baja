import { describe, expect, it } from 'vitest'

import type { TarjetaLugar } from '../../src/sitio/datos/tipos'
import { lugaresDeTema, temaIndexable, type CriteriosTema } from '../../src/dominio/temas'

const sinP = { activo: false, desde: null, hasta: null }
const l = (id: number, extra: Partial<TarjetaLugar> = {}) => ({
  id, nombre: `L${id}`, zonaId: 1, categoriaIds: [1], caracteristicas: [], servicios: [], patrocinio: sinP, orden: 100, ...extra,
}) as TarjetaLugar
const c = (extra: Partial<CriteriosTema> = {}): CriteriosTema => ({ zonaId: 1, categoriaIds: [], caracteristicas: [], servicios: [], lugaresFijosIds: [], ...extra })
const ahora = new Date('2026-11-08T12:00:00Z')
const lista = (lugares: TarjetaLugar[], crit: CriteriosTema) => lugaresDeTema(crit, { lugares, zonasActivasIds: [1, 2] }, ahora).map((x) => x.id)

describe('lugaresDeTema', () => {
  it('los fijos van primero y en su orden', () => {
    expect(lista([l(1), l(2), l(3)], c({ lugaresFijosIds: [3, 1] }))).toEqual([3, 1])
  })
  it('sin criterios: solo los fijos', () => expect(lista([l(1), l(2)], c())).toEqual([]))
  it('categorías con «o» y características con «y», combinadas', () => {
    const ls = [l(1, { categoriaIds: [1], caracteristicas: ['para-ninos'] }), l(2, { categoriaIds: [2], caracteristicas: ['para-ninos', 'con-comida'] }), l(3, { categoriaIds: [3], caracteristicas: ['para-ninos'] })]
    expect(lista(ls, c({ categoriaIds: [1, 2], caracteristicas: ['para-ninos'] }))).toEqual([1, 2])
    expect(lista(ls, c({ categoriaIds: [1, 2], caracteristicas: ['para-ninos', 'con-comida'] }))).toEqual([2])
  })
  it('servicios con «y»', () => {
    expect(lista([l(1, { servicios: ['sombra'] }), l(2, { servicios: ['sombra', 'banos'] })], c({ servicios: ['sombra', 'banos'] }))).toEqual([2])
  })
  it('no repite un fijo que también cumple los criterios', () => {
    expect(lista([l(1, { categoriaIds: [1] }), l(2, { categoriaIds: [1] })], c({ lugaresFijosIds: [2], categoriaIds: [1] }))).toEqual([2, 1])
  })
  it('respeta la zona', () => {
    expect(lista([l(1, { categoriaIds: [1] }), l(2, { categoriaIds: [1], zonaId: 2 })], c({ categoriaIds: [1] }))).toEqual([1])
  })
  it('sin zona: todas las activas', () => {
    expect(lista([l(1, { categoriaIds: [1] }), l(2, { categoriaIds: [1], zonaId: 2 }), l(3, { categoriaIds: [1], zonaId: 9 })], c({ zonaId: null, categoriaIds: [1] }))).toEqual([1, 2])
  })
  it('máximo 24', () => {
    const ls = Array.from({ length: 30 }, (_, i) => l(i + 1, { categoriaIds: [1] }))
    expect(lista(ls, c({ categoriaIds: [1] }))).toHaveLength(24)
  })
  it('el patrocinio vigente sube, como en los listados', () => {
    const vigente = { activo: true, desde: '2026-01-01', hasta: '2027-01-01' }
    expect(lista([l(1, { categoriaIds: [1] }), l(2, { categoriaIds: [1], patrocinio: vigente })], c({ categoriaIds: [1] }))[0]).toBe(2)
  })
  it('un fijo que no existe en el idioma se omite', () => expect(lista([l(1)], c({ lugaresFijosIds: [9, 1] }))).toEqual([1]))
})

describe('temaIndexable', () => {
  it('desde 3', () => {
    expect(temaIndexable(2)).toBe(false)
    expect(temaIndexable(3)).toBe(true)
  })
})
