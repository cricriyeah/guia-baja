import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Imagen } from '../../src/sitio/ui/Imagen'

const imagen = { src: '/foto.webp', srcset: '/foto-480.webp 480w', ancho: 960, alto: 640, alt: 'Foto' } as never
const html = (props: { prioridad?: boolean; cargar?: 'lazy' | 'eager' }) => renderToStaticMarkup(createElement(Imagen, { imagen, ...props }))

describe('Imagen: prioridad de la foto principal (LCP, spec §11)', () => {
  it('con prioridad se pide antes y nunca en diferido', () => {
    const img = html({ prioridad: true })
    expect(img).toContain('fetchPriority="high"')
    expect(img).toContain('loading="eager"')
  })

  it('sin prioridad queda en diferido y no compite con la principal', () => {
    const img = html({})
    expect(img).not.toMatch(/fetchPriority/i)
    expect(img).toContain('loading="lazy"')
  })

  it('cargar="eager" no da prioridad: en la galería hay varias así', () => {
    expect(html({ cargar: 'eager' })).not.toMatch(/fetchPriority/i)
  })
})
