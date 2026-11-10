import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { TourConFoto } from '../../src/sitio/datos/cacheadas'
import { TarjetaTour } from '../../src/sitio/ui/TarjetaTour'

const tour: TourConFoto = {
  clave: 'servicio:a', tipo: 'servicio', slug: 'a', nombre: 'Tour A', duracion: '6 h', noches: null, ruta: '/es/servicio/e/a',
  precio: { monto: '$11,290', valor: 11290, moneda: 'MXN', estrategia: 'por_grupo' }, foto: null, temporada: 'enero a marzo', meses: [1], enTemporada: true, paraQuien: [], gustos: [], jornada: null,
}
const enlace = { href: 'https://x.test/a?desde=guia&pieza=tour-articulo-b', 'data-evento': 'tour_clic', 'data-zona': 'la-paz', 'data-origen': 'articulo' }

describe('TarjetaTour', () => {
  const html = renderToStaticMarkup(createElement(TarjetaTour, { lang: 'es', tour, enlace }))
  it('nombre, atribución, «Ver tour» y etiqueta', () => {
    expect(html).toContain('Tour A')
    expect(html).toContain('pieza=tour-articulo-b')
    expect(html).toContain('data-origen="articulo"')
    expect(html).toContain('Ver tour')
    expect(html).toContain('En temporada')
  })
  it('frase en texto plano con el precio', () => {
    expect(html).toContain('Tour A, desde $11,290 MXN por grupo.')
  })
})
