import { describe, expect, it } from 'vitest'

import { icsDeEvento } from '../../src/dominio/ics'

describe('archivo .ics del evento', () => {
  it('formato iCalendar con fechas UTC y texto escapado', () => {
    const ics = icsDeEvento({
      uid: 'evento-7@guia', nombre: 'Trova, al atardecer', inicio: '2026-11-07T02:00:00.000Z', fin: null,
      lugar: 'Malecón; La Paz', url: 'https://www.salysoltours.com/es/guia/eventos/trova',
    })
    expect(ics).toContain('BEGIN:VCALENDAR\r\n')
    expect(ics).toContain('DTSTART:20261107T020000Z\r\n')
    expect(ics).toContain('DTEND:20261107T040000Z\r\n') // sin fin: dos horas
    expect(ics).toContain('SUMMARY:Trova\\, al atardecer\r\n')
    expect(ics).toContain('LOCATION:Malecón\\; La Paz\r\n')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
})
