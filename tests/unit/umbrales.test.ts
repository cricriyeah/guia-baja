import { describe, expect, it } from 'vitest'

import { combinacionIndexable, combinacionTienePagina } from '../../src/dominio/umbrales'

describe('umbrales de combinaciones zona × categoría', () => {
  it('hay página con al menos 1 lugar', () => {
    expect(combinacionTienePagina(0)).toBe(false)
    expect(combinacionTienePagina(1)).toBe(true)
  })
  it('se indexa con al menos 3 lugares', () => {
    expect(combinacionIndexable(2)).toBe(false)
    expect(combinacionIndexable(3)).toBe(true)
  })
})
