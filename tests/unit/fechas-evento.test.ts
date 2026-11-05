import { describe, expect, it } from 'vitest'

import { partesFecha, rangoEvento } from '../../src/dominio/fechas-evento'

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
