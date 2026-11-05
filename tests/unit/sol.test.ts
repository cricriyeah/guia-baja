import { describe, expect, it } from 'vitest'

import { puestaDelSol } from '../../src/dominio/sol'

const horaBCS = (iso: string) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mazatlan', hour: '2-digit', hourCycle: 'h23' }).format(new Date(iso)))

describe('puestaDelSol', () => {
  it('en La Paz en noviembre el sol se pone entre las 17 y las 18 h', () => {
    expect(horaBCS(puestaDelSol(new Date('2026-11-10T12:00:00-07:00'), 24.1426, -110.3128))).toBe(17)
  })
  it('en junio, entre las 19 y las 20 h', () => {
    expect(horaBCS(puestaDelSol(new Date('2026-06-21T12:00:00-07:00'), 24.1426, -110.3128))).toBe(19)
  })
})
