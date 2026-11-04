import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { listaLd, migasLd } from '../../src/sitio/seo/jsonld'
import { JsonLd } from '../../src/sitio/ui/JsonLd'

const base = 'https://www.salysoltours.com'

describe('JSON-LD de base (spec §9)', () => {
  it('BreadcrumbList con URLs absolutas', () => {
    expect(migasLd([{ nombre: 'Guía', ruta: '/es/guia' }, { nombre: 'La Paz', ruta: '/es/guia/la-paz' }], base)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Guía', item: 'https://www.salysoltours.com/es/guia' },
        { '@type': 'ListItem', position: 2, name: 'La Paz', item: 'https://www.salysoltours.com/es/guia/la-paz' },
      ],
    })
  })

  it('ItemList', () => {
    expect(listaLd([{ nombre: 'A', ruta: '/es/guia/lugares/a' }], base).itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'A', url: 'https://www.salysoltours.com/es/guia/lugares/a' },
    ])
  })

  it('<JsonLd> escapa «<» para que el texto no cierre el script', () => {
    const html = renderToStaticMarkup(createElement(JsonLd, { datos: { name: '</script><b>x' } }))
    expect(html).toBe('<script type="application/ld+json">{"name":"\u003c/script>\u003cb>x"}</script>')
  })
})
