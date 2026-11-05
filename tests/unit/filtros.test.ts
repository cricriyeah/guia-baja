import { describe, expect, it } from 'vitest'

import { consultaDeFiltros, filtrarEventos, filtrarLugares, hayFiltros, leerFiltros } from '../../src/dominio/filtros'

const p = (q: string) => new URLSearchParams(q)

describe('filtros de listados (spec §7)', () => {
  it('lee solo valores de la lista cerrada', () => {
    expect(leerFiltros(p('precio=$$&abierto=1&caracteristica=para-ninos&zona=la-paz&x=1'))).toEqual({
      precio: '$$',
      abierto: true,
      caracteristica: 'para-ninos',
      zona: 'la-paz',
    })
    expect(leerFiltros(p('precio=$$$$$&abierto=si&caracteristica=otra&zona=No%20Slug'))).toEqual({})
    expect(leerFiltros(p('desde=2026-11-01&hasta=2026-11-30'))).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' })
    expect(leerFiltros(p('desde=ayer'))).toEqual({})
  })

  it('consultaDeFiltros es la inversa, en orden fijo', () => {
    expect(consultaDeFiltros({ zona: 'la-paz', precio: '$' })).toBe('precio=%24&zona=la-paz')
    expect(leerFiltros(p(consultaDeFiltros({ caracteristica: 'con-comida', abierto: true })))).toEqual({ caracteristica: 'con-comida', abierto: true })
    expect(hayFiltros({})).toBe(false)
  })

  it('filtra lugares por precio, característica, zona y abierto ahora', () => {
    const martes10 = '2026-11-10T17:00:00.000Z' // 10:00 en BCS
    const ls = [
      { id: 1, rangoPrecio: '$', caracteristicas: ['para-ninos'], zonaSlug: 'la-paz', horario: [{ dia: 'martes', abre: '08:00', cierra: '18:00' }] },
      { id: 2, rangoPrecio: '$$', caracteristicas: [], zonaSlug: 'la-ventana', horario: [] },
    ]
    expect(filtrarLugares(ls, { precio: '$' }, martes10).map((l) => l.id)).toEqual([1])
    expect(filtrarLugares(ls, { caracteristica: 'para-ninos' }, martes10).map((l) => l.id)).toEqual([1])
    expect(filtrarLugares(ls, { zona: 'la-ventana' }, martes10).map((l) => l.id)).toEqual([2])
    // Sin horario no se sabe si está abierto: no entra en «abierto ahora».
    expect(filtrarLugares(ls, { abierto: true }, martes10).map((l) => l.id)).toEqual([1])
  })

  it('filtra eventos por zona y por días de BCS', () => {
    const es = [
      { id: 1, inicio: '2026-11-07T02:00:00Z', zonaSlug: 'la-paz' }, // 6 nov en BCS
      { id: 2, inicio: '2026-11-20T18:00:00Z', zonaSlug: 'la-ventana' },
    ]
    expect(filtrarEventos(es, { hasta: '2026-11-06' }).map((e) => e.id)).toEqual([1])
    expect(filtrarEventos(es, { desde: '2026-11-07' }).map((e) => e.id)).toEqual([2])
    expect(filtrarEventos(es, { zona: 'la-paz' }).map((e) => e.id)).toEqual([1])
  })
})
