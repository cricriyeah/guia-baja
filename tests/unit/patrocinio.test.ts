import { describe, expect, it } from 'vitest'

import { inicioDelDiaGuardado, inicioDelDiaMazatlan } from '../../src/dominio/fechas'
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

// P22: Payload 3.92.1 guarda un campo dayOnly como 00:00Z cuando llega por la Local API/seed («2026-11-01»)
// y como 12:00Z cuando lo elige el panel. El día elegido es el día calendario UTC del valor guardado.
describe('inicioDelDiaGuardado (campos dayOnly de Payload)', () => {
  it('00:00Z (Local API) es el mismo día en BCS, no el anterior', () => {
    expect(inicioDelDiaGuardado('2026-11-01T00:00:00.000Z').toISOString()).toBe('2026-11-01T07:00:00.000Z')
  })
  it('12:00Z (panel) es el mismo día', () => {
    expect(inicioDelDiaGuardado('2026-11-01T12:00:00.000Z').toISOString()).toBe('2026-11-01T07:00:00.000Z')
  })
  it('07:00Z (medianoche BCS) es el mismo día', () => {
    expect(inicioDelDiaGuardado('2026-11-01T07:00:00.000Z').toISOString()).toBe('2026-11-01T07:00:00.000Z')
  })
  it('acepta Date', () => {
    expect(inicioDelDiaGuardado(new Date('2026-11-01T00:00:00.000Z')).toISOString()).toBe('2026-11-01T07:00:00.000Z')
  })
})

describe('patrocinioVigente con fechas 00:00Z de la Local API', () => {
  const q = { activo: true, desde: '2026-11-01T00:00:00.000Z', hasta: '2026-12-01T00:00:00.000Z' }
  it('no empieza un día antes', () => {
    expect(patrocinioVigente(q, new Date('2026-11-01T06:59:59Z'))).toBe(false)
    expect(patrocinioVigente(q, new Date('2026-11-01T07:00:00Z'))).toBe(true)
  })
  it('termina a las 00:00 de BCS del día hasta', () => {
    expect(patrocinioVigente(q, new Date('2026-12-01T06:59:59Z'))).toBe(true)
    expect(patrocinioVigente(q, new Date('2026-12-01T07:00:00Z'))).toBe(false)
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
