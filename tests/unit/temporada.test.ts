import { describe, expect, it } from 'vitest'

import { enTemporada, mesEnBCS, mesesATexto, ordenarPorTemporada, registroTourConDatos, unoPorZona } from '../../src/dominio/temporada'

describe('mesesATexto', () => {
  it('rango que cruza diciembre', () => expect(mesesATexto([11, 12, 1, 2, 3, 4], 'es')).toBe('noviembre a abril'))
  it('varios rangos', () => expect(mesesATexto([1, 2, 7], 'es')).toBe('enero a febrero y julio'))
  it('un mes', () => expect(mesesATexto([3], 'es')).toBe('marzo'))
  it('todo el año', () => expect(mesesATexto([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'es')).toBe('todo el año'))
  it('sin meses', () => expect(mesesATexto([], 'es')).toBeNull())
  it('en inglés', () => expect(mesesATexto([1, 2, 7], 'en')).toBe('January to February and July'))
  it('tres rangos', () => expect(mesesATexto([1, 4, 7], 'es')).toBe('enero, abril y julio'))
})

describe('mesEnBCS y enTemporada', () => {
  // America/Mazatlan es UTC-7: el 1 de noviembre a las 06:30 UTC todavía es 31 de octubre a las 23:30 en BCS.
  it('usa la hora de BCS en el último día del mes a las 23:30', () => {
    expect(mesEnBCS(new Date('2026-11-01T06:30:00Z'))).toBe(10)
    expect(mesEnBCS(new Date('2026-11-01T07:30:00Z'))).toBe(11)
  })
  it('enTemporada', () => {
    expect(enTemporada([1, 2], 2)).toBe(true)
    expect(enTemporada([1, 2], 3)).toBe(false)
    expect(enTemporada([], 3)).toBe(false)
  })
})

describe('ordenarPorTemporada', () => {
  it('pone primero los de temporada y conserva el orden dentro de cada grupo', () => {
    const t = [{ n: 'a', meses: [] }, { n: 'b', meses: [5] }, { n: 'c', meses: [1] }, { n: 'd', meses: [5] }]
    expect(ordenarPorTemporada(t, 5).map((x) => x.n)).toEqual(['b', 'd', 'a', 'c'])
  })
})

describe('registroTourConDatos', () => {
  it('vacío en es: rechazado', () => expect(registroTourConDatos({}, 'es')).toBe(false))
  it('meses vacío cuenta como vacío', () => expect(registroTourConDatos({ meses: [] }, 'es')).toBe(false))
  it('con meses, foto o temporada en es: aceptado', () => {
    expect(registroTourConDatos({ meses: ['1'] }, 'es')).toBe(true)
    expect(registroTourConDatos({ foto: 3 }, 'es')).toBe(true)
    expect(registroTourConDatos({ temporada: 'enero' }, 'es')).toBe(true)
  })
  it('en en no rechaza: temporada está localizada', () => {
    expect(registroTourConDatos({ temporada: 'January' }, 'en')).toBe(true)
    expect(registroTourConDatos({}, 'en')).toBe(true)
  })
})

describe('unoPorZona', () => {
  it('toma uno por zona y luego completa hasta el máximo', () => {
    const listas = [[{ n: 'a1' }, { n: 'a2' }], [{ n: 'b1' }], []]
    expect(unoPorZona(listas, 3).map((x) => x.n)).toEqual(['a1', 'b1', 'a2'])
  })
  it('sin tours', () => expect(unoPorZona([[], []], 3)).toEqual([]))
})
