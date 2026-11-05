import { describe, expect, it } from 'vitest'

import { abiertoAhora, estadoHorario, horarioSemana } from '../../src/dominio/horario'

// 2026-11-10 es martes. Las horas van en hora de BCS (UTC−7).
const a = (hhmm: string, dia = '10') => new Date(`2026-11-${dia}T${hhmm}:00-07:00`)

describe('estadoHorario (spec §6, Lugares.horario)', () => {
  it('sin filas no se sabe: null', () => {
    expect(estadoHorario([], a('10:00'))).toBeNull()
    expect(estadoHorario(null, a('10:00'))).toBeNull()
  })

  it('abierto dentro de un tramo, con minutos para cerrar', () => {
    expect(estadoHorario([{ dia: 'martes', abre: '08:00', cierra: '18:00' }], a('10:00'))).toEqual({
      abierto: true,
      cambiaEnMin: 480,
      proximaApertura: null,
    })
  })

  it('cerrado: la próxima apertura es mañana', () => {
    const h = [
      { dia: 'martes', abre: '08:00', cierra: '18:00' },
      { dia: 'miercoles', abre: '08:00', cierra: '18:00' },
    ]
    expect(estadoHorario(h, a('19:00'))).toEqual({ abierto: false, cambiaEnMin: 780, proximaApertura: { dia: 2, min: 480 } })
  })

  it('un tramo del lunes que pasa de medianoche sigue abierto el martes a la 1', () => {
    expect(estadoHorario([{ dia: 'lunes', abre: '20:00', cierra: '02:00' }], a('01:00'))).toMatchObject({ abierto: true, cambiaEnMin: 60 })
  })

  it('varios tramos el mismo día', () => {
    const h = [
      { dia: 'martes', abre: '08:00', cierra: '12:00' },
      { dia: 'martes', abre: '16:00', cierra: '20:00' },
    ]
    expect(estadoHorario(h, a('14:00'))).toEqual({ abierto: false, cambiaEnMin: 120, proximaApertura: { dia: 1, min: 960 } })
    expect(abiertoAhora(h, a('17:00'))).toBe(true)
  })

  it('horarioSemana: siete días en orden, con sus tramos ordenados', () => {
    const s = horarioSemana([
      { dia: 'martes', abre: '16:00', cierra: '20:00' },
      { dia: 'martes', abre: '08:00', cierra: '12:00' },
    ])
    expect(s.map((d) => d.dia)).toEqual(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'])
    expect(s[1].tramos).toEqual([{ abre: '08:00', cierra: '12:00' }, { abre: '16:00', cierra: '20:00' }])
    expect(s[0].tramos).toEqual([])
  })
})
