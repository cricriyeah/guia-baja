import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EnlaceWhatsapp } from '../../src/sitio/ui/EnlaceWhatsapp'

describe('EnlaceWhatsapp', () => {
  const props = { lang: 'es' as const, digitos: '5210000000000', nombre: 'La Paz', zona: 'la-paz', origen: 'barra' as const }
  it('texto, evento y mensaje', () => {
    const html = renderToStaticMarkup(createElement(EnlaceWhatsapp, props))
    expect(html).toContain('https://wa.me/5210000000000?text=Hola')
    expect(html).toContain('data-evento="whatsapp_clic"')
    expect(html).toContain('data-origen="barra"')
    expect(html).toContain('¿Dudas? Pregunta por WhatsApp')
    expect(html).toContain('rel="noopener"')
  })
  it('icono con aria-label', () => {
    const html = renderToStaticMarkup(createElement(EnlaceWhatsapp, { ...props, icono: true }))
    expect(html).toContain('aria-label="Preguntar por WhatsApp"')
    expect(html).not.toContain('¿Dudas?')
  })
})
