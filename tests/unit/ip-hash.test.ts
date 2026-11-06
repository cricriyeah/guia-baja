import { describe, expect, it } from 'vitest'

import { ipHash } from '../../src/dominio/ip-hash'

describe('ipHash (spec §6, Solicitudes)', () => {
  it('SHA-256 con sal, estable y distinto por sal', () => {
    expect(ipHash('1.2.3.4', 's')).toMatch(/^[0-9a-f]{64}$/)
    expect(ipHash('1.2.3.4', 's')).toBe(ipHash('1.2.3.4', 's'))
    expect(ipHash('1.2.3.4', 's')).not.toBe(ipHash('1.2.3.4', 't'))
  })
})
