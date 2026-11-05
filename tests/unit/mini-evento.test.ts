import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { TarjetaEvento } from '../../src/sitio/datos/tipos'
import { MiniEvento } from '../../src/sitio/ui/tarjetas/MiniEvento'

const evento = (patrocinio: TarjetaEvento['patrocinio']): TarjetaEvento => ({
  id: 1, slug: 'fiesta', nombre: 'Fiesta', resumen: '', zonaId: 1, zonaSlug: 'la-paz', categoriaIds: [], foto: null,
  inicio: '2099-01-10T18:00:00.000Z', fin: null, gratis: true, precio: null, lugarId: null, direccionLibre: 'Malecón',
  patrocinio, orden: 0, destacado: { activo: false, orden: 0 }, noIndexar: false,
})

describe('<MiniEvento> (spec §7: patrocinio declarado)', () => {
  it('un evento con patrocinio declarado lleva «Patrocinado» y rel="sponsored"', () => {
    const html = renderToStaticMarkup(createElement(MiniEvento, { lang: 'es', evento: evento({ activo: true, desde: '2020-01-01', hasta: '2099-12-31' }) }))
    expect(html).toContain('Patrocinado')
    expect(html).toContain('rel="sponsored"')
  })

  it('sin patrocinio no lleva etiqueta ni rel', () => {
    const html = renderToStaticMarkup(createElement(MiniEvento, { lang: 'es', evento: evento({ activo: false, desde: null, hasta: null }) }))
    expect(html).not.toContain('Patrocinado')
    expect(html).not.toContain('sponsored')
  })
})
