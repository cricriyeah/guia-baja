import { describe, expect, it } from 'vitest'

import { autorizado } from '../../src/cron/autorizar'

const pedir = (h?: string) => new Request('https://x.test/api/cron/hora', { headers: h ? { authorization: h } : {} })

describe('autorizar crones', () => {
  it('Bearer con el secreto', () => {
    expect(autorizado(pedir('Bearer s3cr3t'), 's3cr3t')).toBe(true)
    expect(autorizado(pedir('Bearer otro'), 's3cr3t')).toBe(false)
    expect(autorizado(pedir(), 's3cr3t')).toBe(false)
  })
  it('token incorrecto de la misma longitud', () => expect(autorizado(pedir('Bearer s3cr3x'), 's3cr3t')).toBe(false))
  it('token de distinta longitud', () => {
    expect(autorizado(pedir('Bearer s3cr3t-largo'), 's3cr3t')).toBe(false)
    expect(autorizado(pedir('Bearer s3'), 's3cr3t')).toBe(false)
  })
  it('sin secreto configurado, nunca', () => {
    expect(autorizado(pedir('Bearer '), '')).toBe(false)
    expect(autorizado(pedir('Bearer undefined'), undefined)).toBe(false)
    expect(autorizado(pedir(), undefined)).toBe(false)
    expect(autorizado(pedir(''), '')).toBe(false)
  })
})
