import { describe, expect, it } from 'vitest'

import { kmEnLineaRecta } from '../../src/dominio/distancia'

describe('kmEnLineaRecta (decisión 2)', () => {
  it('centro de La Paz a Balandra: unos 20 km', () => {
    expect(kmEnLineaRecta([-110.3128, 24.1426], [-110.3226, 24.3216])).toBeCloseTo(20, 0)
  })
  it('el mismo punto es 0', () => {
    expect(kmEnLineaRecta([-110.3, 24.1], [-110.3, 24.1])).toBe(0)
  })
})
