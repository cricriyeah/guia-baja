// tests/unit/textos.test.ts
import { describe, expect, it } from 'vitest'

import { textos } from '../../src/sitio/textos'

const forma = (o: unknown): unknown =>
  o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'function' ? 'fn' : forma(v)])) : typeof o

describe('textos de la interfaz', () => {
  it('español e inglés tienen exactamente las mismas llaves', () => {
    expect(forma(textos('en'))).toEqual(forma(textos('es')))
  })

  it('el puente nombra la zona', () => {
    expect(textos('es').cabecera.toursEn('La Paz')).toBe('Tours en La Paz')
    expect(textos('en').cabecera.toursEn('La Paz')).toBe('Tours in La Paz')
  })
})
