import { describe, expect, it } from 'vitest'

import { clasificarErrorMapa } from '../../src/dominio/mapa'

describe('clasificarErrorMapa', () => {
  it('el estilo que falla antes de style.load es duro', () => expect(clasificarErrorMapa({}, false)).toBe('duro'))
  it('con sourceId es leve', () => expect(clasificarErrorMapa({ sourceId: 'teselas' }, false)).toBe('leve'))
  it('con tile es leve', () => expect(clasificarErrorMapa({ tile: {} }, false)).toBe('leve'))
  it('después de style.load es leve', () => expect(clasificarErrorMapa({}, true)).toBe('leve'))
})
