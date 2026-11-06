import { describe, expect, it } from 'vitest'

import { icsDeEvento, plegar } from '../../src/dominio/ics'

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

describe('plegado de líneas (RFC 5545, 75 octetos)', () => {
  const evento = (nombre: string) =>
    icsDeEvento({ uid: 'evento-7@guia', nombre, inicio: '2026-11-07T02:00:00.000Z', fin: null, lugar: 'Malecón', url: 'https://www.salysoltours.com/es/guia/eventos/trova' })
  const lineas = (ics: string) => ics.split('\r\n').slice(0, -1)
  const bytes = (s: string) => new TextEncoder().encode(s).length

  it('una línea corta no se toca', () => {
    expect(plegar('SUMMARY:Trova')).toBe('SUMMARY:Trova')
    expect(plegar('x'.repeat(75))).toBe('x'.repeat(75))
  })

  it('ninguna línea pasa de 75 octetos, la continuación empieza con un espacio y al desplegar queda el original', () => {
    const nombre = 'Festival de la ballena gris y el atardecer en la bahía de La Paz con música en vivo y mariscos frescos'
    const ics = evento(nombre)
    for (const l of lineas(ics)) expect(bytes(l)).toBeLessThanOrEqual(75)
    expect(lineas(ics).some((l) => l.startsWith(' '))).toBe(true)
    expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${nombre}\r\n`)
  })

  it('exactamente 76 octetos se parte en 75 y una continuación de 1 carácter', () => {
    expect(plegar('x'.repeat(76))).toBe(`${'x'.repeat(75)}\r\n x`)
  })

  it('nunca parte un carácter multibyte ni un par sustituto', () => {
    // Cada «ñ» pesa 2 octetos y cada emoji 4: se prueba en todos los desplazamientos posibles del corte.
    for (let relleno = 0; relleno < 8; relleno++) {
      const nombre = `${'a'.repeat(relleno)}${'ñ🌴'.repeat(40)}`
      const ics = evento(nombre)
      for (const l of lineas(ics)) {
        expect(bytes(l)).toBeLessThanOrEqual(75)
        // fatal: lanza si los octetos de la línea no son UTF-8 válido, o sea, si se partió un carácter.
        expect(() => new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(l))).not.toThrow()
      }
      expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${nombre}\r\n`)
    }
  })
})
