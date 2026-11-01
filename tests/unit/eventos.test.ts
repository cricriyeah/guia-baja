import { describe, expect, it } from 'vitest'

import { esEventoProximo } from '../../src/dominio/eventos'

const ahora = new Date('2026-11-14T20:00:00Z')

describe('esEventoProximo: (fin ?? inicio) ≥ ahora', () => {
  it('sin fin, usa inicio', () => {
    expect(esEventoProximo({ inicio: '2026-11-14T21:00:00Z' }, ahora)).toBe(true)
    expect(esEventoProximo({ inicio: '2026-11-14T19:00:00Z' }, ahora)).toBe(false)
  })
  it('con fin, usa fin', () => {
    expect(esEventoProximo({ inicio: '2026-11-13T00:00:00Z', fin: '2026-11-15T00:00:00Z' }, ahora)).toBe(true)
    expect(esEventoProximo({ inicio: '2026-11-13T00:00:00Z', fin: '2026-11-14T19:00:00Z' }, ahora)).toBe(false)
  })
  it('justo en el límite es próximo', () => {
    expect(esEventoProximo({ inicio: '2026-11-14T20:00:00Z' }, ahora)).toBe(true)
  })
})
