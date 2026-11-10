import { describe, expect, it } from 'vitest'

import { esEnlaceSeguro } from '../../src/dominio/enlaces'

describe('esEnlaceSeguro', () => {
  it('acepta esquemas seguros, rutas propias y anclas', () => {
    for (const u of ['https://x.mx', 'http://x.mx', 'mailto:a@b.mx', 'tel:+52', '/es/guia', '#a']) expect(esEnlaceSeguro(u), u).toBe(true)
  })
  it('rechaza scripts, protocolo relativo y caracteres de control', () => {
    for (const u of ['javascript:alert(1)', '//x.mx', '/\\x.mx', '/\t/x.mx', 'www.x.mx']) expect(esEnlaceSeguro(u), u).toBe(false)
  })
})
