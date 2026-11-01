import { describe, expect, it } from 'vitest'

import { inicioDelDiaMazatlan } from '../../src/dominio/fechas'
import { patrocinioDeclarado, patrocinioVigente } from '../../src/dominio/patrocinio'

// Payload puede guardar un día como medianoche local (07:00Z) o como mediodía UTC: los dos son el mismo día en BCS.
describe('inicioDelDiaMazatlan', () => {
  it('medianoche de BCS guardada en UTC', () => {
    expect(inicioDelDiaMazatlan('2026-11-01T07:00:00.000Z').toISOString()).toBe('2026-11-01T07:00:00.000Z')
  })
  it('mediodía UTC del mismo día', () => {
    expect(inicioDelDiaMazatlan('2026-11-01T12:00:00.000Z').toISOString()).toBe('2026-11-01T07:00:00.000Z')
  })
})

const p = { activo: true, desde: '2026-11-01T12:00:00.000Z', hasta: '2026-12-01T12:00:00.000Z' }

describe('patrocinioVigente: activo y desde ≤ ahora < hasta', () => {
  it('antes de desde no está vigente', () => {
    expect(patrocinioVigente(p, new Date('2026-11-01T06:59:59Z'))).toBe(false)
  })
  it('desde las 00:00 de BCS del día desde está vigente', () => {
    expect(patrocinioVigente(p, new Date('2026-11-01T07:00:00Z'))).toBe(true)
  })
  it('a las 00:00 de BCS del día hasta ya no está vigente', () => {
    expect(patrocinioVigente(p, new Date('2026-12-01T07:00:00Z'))).toBe(false)
  })
  it('inactivo o incompleto nunca está vigente', () => {
    expect(patrocinioVigente({ ...p, activo: false }, new Date('2026-11-15T00:00:00Z'))).toBe(false)
    expect(patrocinioVigente({ activo: true, hasta: p.hasta }, new Date('2026-11-15T00:00:00Z'))).toBe(false)
    expect(patrocinioVigente(null)).toBe(false)
  })
})

describe('patrocinioDeclarado: activo y ahora < hasta (aunque no haya empezado)', () => {
  it('se declara antes de desde', () => {
    expect(patrocinioDeclarado(p, new Date('2026-10-20T00:00:00Z'))).toBe(true)
  })
  it('deja de declararse al llegar hasta', () => {
    expect(patrocinioDeclarado(p, new Date('2026-12-01T07:00:00Z'))).toBe(false)
  })
  it('inactivo no se declara', () => {
    expect(patrocinioDeclarado({ ...p, activo: false }, new Date('2026-11-15T00:00:00Z'))).toBe(false)
  })
})
