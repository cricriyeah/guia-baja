// tests/unit/ficha-lugar.test.ts
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { FichaLugar } from '../../src/sitio/datos/tipos'

// Fuera de Next, <Link> se simula como un <a> simple.
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: ReactNode }) => createElement('a', { href, ...resto }, children),
}))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('404') }, permanentRedirect: () => { throw new Error('308') } }))

// renderToStaticMarkup no pinta componentes async; los tours se prueban en tests/e2e/tours.spec.ts.
vi.mock('../../src/sitio/ui/ToursEnZona', () => ({ ToursEnZona: () => null, BloqueTours: () => null }))

const sinPatrocinio = { activo: false, desde: null, hasta: null }
const base: FichaLugar = {
  id: 1, slug: 'cafe-duna', nombre: 'Café Duna', resumen: 'Café de prueba', zonaId: 1, zonaSlug: 'la-paz', categoriaIds: [1],
  foto: null, rangoPrecio: '$$', horario: [], caracteristicas: [], coordenadas: [-110.31, 24.14], patrocinio: sinPatrocinio,
  orden: 0, destacado: { activo: false, orden: 0 }, noIndexar: false, toursRelacionados: [],
  cuerpo: null, fotos: [], direccion: 'Calle Inventada 123', telefono: '+52 612 000 0000', whatsapp: '+52 612 000 0001',
  web: 'https://ejemplo.test', instagram: '@cafeduna', notaHorario: null, metaTitulo: null, metaDescripcion: null, media: {},
}
let ficha = base

vi.mock('../../src/sitio/datos/cacheadas', () => ({
  lugaresCacheados: async () => [ficha],
  fichaLugarCacheada: async () => ficha,
  zonasActivasCacheadas: async () => [{ id: 1, slug: 'la-paz', nombre: 'La Paz', descripcion: null, coordenadas: [-110.3, 24.1] }],
  categoriasCacheadas: async () => [{ id: 1, slug: 'cafes', nombre: 'Cafés', claseGrupo: 'g-comer', tipoSchema: 'CafeOrCoffeeShop' }],
  eventosCacheados: async () => [],
  articulosCacheados: async () => [],
}))

const { default: FichaDeLugar } = await import('../../src/app/(sitio)/[lang]/guia/lugares/[slug]/page')

async function pintar(f: FichaLugar): Promise<string> {
  ficha = f
  return renderToStaticMarkup(await FichaDeLugar({ params: Promise.resolve({ lang: 'es', slug: f.slug }) }))
}
const enlacesDeContacto = (html: string, canal: string) => html.match(new RegExp(`<a [^>]*data-canal="${canal}"[^>]*>`, 'g')) ?? []

describe('ficha de lugar', () => {
  it('«Cómo llegar» con data-evento junto a la dirección: cabeza, pie del mapa, lateral y barra inferior', async () => {
    const html = await pintar(base)
    const enlaces = enlacesDeContacto(html, 'mapa')
    expect(enlaces).toHaveLength(4)
    for (const a of enlaces) {
      expect(a).toContain('data-evento="contacto_lugar"')
      expect(a).toContain('data-lugar="cafe-duna"')
      expect(a).toContain('href="https://www.google.com/maps/dir/?api=1&amp;destination=24.14,-110.31"')
    }
    expect(html).toMatch(/class="mapa__pie"><span>Calle Inventada 123<\/span><a [^>]*data-canal="mapa"/)
    expect(html).toMatch(/class="ficha-datos__fila"><span>Calle Inventada 123<\/span><a [^>]*data-canal="mapa"/)
    expect(html).toContain('"@type":"GeoCoordinates"')
    expect(html).toContain('"@type":"CafeOrCoffeeShop"')
  })

  it('sin coordenadas no pinta mapa ni «Cómo llegar»', async () => {
    const html = await pintar({ ...base, coordenadas: null })
    expect(enlacesDeContacto(html, 'mapa')).toHaveLength(0)
    expect(html).not.toContain('class="mapa"')
  })

  it('sin patrocinio, los links externos no llevan rel="sponsored"', async () => {
    const html = await pintar(base)
    expect(html).not.toContain('sponsored')
    expect(html).not.toContain('class="patrocinado"')
  })

  it('con patrocinio declarado: «Patrocinado» y rel="sponsored" en todos los links externos y de contacto', async () => {
    const html = await pintar({ ...base, patrocinio: { activo: true, desde: null, hasta: '2999-01-01' } })
    expect(html).toContain('class="patrocinado"')
    for (const canal of ['mapa', 'web', 'instagram', 'telefono', 'whatsapp']) {
      const enlaces = enlacesDeContacto(html, canal)
      expect(enlaces.length).toBeGreaterThan(0)
      for (const a of enlaces) expect(a).toMatch(/rel="[^"]*sponsored[^"]*"/)
    }
  })
})
