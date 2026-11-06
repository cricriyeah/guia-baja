import { describe, expect, it } from 'vitest'

import { ipHash } from '../../src/dominio/ip-hash'

describe('ipHash (spec §6, Solicitudes)', () => {
  it('SHA-256 con sal, estable y distinto por sal', () => {
    expect(ipHash('1.2.3.4', 's')).toMatch(/^[0-9a-f]{64}$/)
    expect(ipHash('1.2.3.4', 's')).toBe(ipHash('1.2.3.4', 's'))
    expect(ipHash('1.2.3.4', 's')).not.toBe(ipHash('1.2.3.4', 't'))
  })

  it('vector conocido: SHA-256 de «sal:ip», fija el algoritmo', () => {
    expect(ipHash('1.2.3.4', 'sal-prueba')).toBe('15b948126b51782c74b1120dc2ad02a69cc4192a57a05636df7619fe3061f3f3')
  })

  it('sin sal (vacía o solo espacios) no calcula: una IPv4 sin sal se revierte por fuerza bruta', () => {
    expect(() => ipHash('1.2.3.4', '')).toThrow()
    expect(() => ipHash('1.2.3.4', '   ')).toThrow()
  })
})
