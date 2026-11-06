import { describe, expect, it } from 'vitest'

import { debeAnonimizar, ipHashVencido } from '../../src/dominio/conservacion'

const ahora = new Date('2026-11-10T12:00:00Z')
const s = (estado: string, estadoCambiadoEl: string, extra = {}) => ({ estado, estadoCambiadoEl, createdAt: '2025-01-01T00:00:00Z', anonimizadaEl: null, ...extra })

describe('conservación de Solicitudes (spec §12)', () => {
  it('rechazada se anonimiza ya', () => expect(debeAnonimizar(s('rechazada', '2026-11-09T00:00:00Z'), ahora)).toBe(true))
  it('sin cambio de estado en 12 meses (y no aceptada)', () => {
    expect(debeAnonimizar(s('en-contacto', '2025-11-09T00:00:00Z'), ahora)).toBe(true)
    expect(debeAnonimizar(s('en-contacto', '2025-11-11T00:00:00Z'), ahora)).toBe(false)
    expect(debeAnonimizar(s('aceptada', '2020-01-01T00:00:00Z'), ahora)).toBe(false)
  })
  it('ya anonimizada no se repite; sin estadoCambiadoEl cuenta la creación', () => {
    expect(debeAnonimizar(s('rechazada', '2026-11-09T00:00:00Z', { anonimizadaEl: '2026-11-09T00:00:00Z' }), ahora)).toBe(false)
    expect(debeAnonimizar({ estado: 'nueva', estadoCambiadoEl: null, createdAt: '2025-10-01T00:00:00Z', anonimizadaEl: null }, ahora)).toBe(true)
  })
  it('ipHash vence a las 24 h', () => {
    expect(ipHashVencido('2026-11-09T11:59:00Z', ahora)).toBe(true)
    expect(ipHashVencido('2026-11-09T12:01:00Z', ahora)).toBe(false)
  })
  it('una fecha ilegible cuenta como vencida (no falla abierto)', () => {
    expect(debeAnonimizar(s('en-contacto', 'no-es-fecha'), ahora)).toBe(true)
    expect(debeAnonimizar({ estado: 'nueva', estadoCambiadoEl: null, createdAt: 'basura', anonimizadaEl: null }, ahora)).toBe(true)
    expect(ipHashVencido('no-es-fecha', ahora)).toBe(true)
  })
})
