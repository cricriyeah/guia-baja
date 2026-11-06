import { describe, expect, it } from 'vitest'

import { fechaCompleta, fechaCorta, fechaLarga, horaDelDia, partesFecha, rangoEvento } from '../../src/dominio/fechas-evento'

describe('fechas de evento en hora de BCS', () => {
  it('partes en español', () => {
    const p = partesFecha('2026-11-07T02:00:00Z', 'es') // 6 nov, 7 p. m. en BCS
    expect(p.dia).toBe('6')
    expect(p.mes.toLowerCase()).toMatch(/^nov/)
    expect(p.diaSemana.toLowerCase()).toMatch(/^vie/)
    expect(p.hora).toMatch(/^7:00/)
  })

  it('partes en inglés', () => {
    const p = partesFecha('2026-11-07T02:00:00Z', 'en')
    expect(p.diaSemana).toMatch(/^Fri/)
    expect(p.mes).toMatch(/^Nov/)
  })

  it('rango del mismo día y sin fin', () => {
    expect(rangoEvento('2026-11-07T02:00:00Z', '2026-11-07T04:00:00Z', 'es')).toMatch(/^vie.* 6 nov.*7:00.*9:00/i)
    expect(rangoEvento('2026-11-07T02:00:00Z', null, 'es')).not.toMatch(/–/)
  })
})

describe('fechas sueltas, un solo mapa de idioma (es-MX / en-US) y la zona de la Baja', () => {
  const iso = '2026-11-07T02:00:00Z' // 6 nov, 7 p. m. en BCS (el 7 en UTC)
  it('fechaLarga y fechaCorta usan el día de la Baja y el idioma', () => {
    expect(fechaLarga(iso, 'es')).toMatch(/^6 nov.* 2026$/i)
    expect(fechaLarga(iso, 'en')).toMatch(/^Nov 6, 2026$/)
    expect(fechaCorta(iso, 'es')).toMatch(/^6 nov/i)
    expect(fechaCorta(iso, 'en')).toBe('Nov 6')
  })
  it('fechaCompleta (aviso de privacidad) y horaDelDia', () => {
    expect(fechaCompleta(new Date(iso), 'es')).toMatch(/^6 de noviembre de 2026$/)
    expect(fechaCompleta(new Date(iso), 'en')).toBe('November 6, 2026')
    expect(horaDelDia(new Date(iso), 'en')).toMatch(/^7:00\s?PM$/)
  })
})

