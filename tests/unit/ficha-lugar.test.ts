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
  orden: 0, destacado: { activo: false, orden: 0 }, noIndexar: false, toursRelacionados: [], otrosNombres: [], enlazarMenciones: true, servicios: [],
  cuerpo: null, fotos: [], direccion: 'Calle Inventada 123', telefono: '+52 612 000 0000', whatsapp: '+52 612 000 0001',
  web: 'https://ejemplo.test', instagram: '@cafeduna', notaHorario: null, metaTitulo: null, metaDescripcion: null, media: {}, preguntas: [], visita: null,
}
let ficha = base
const zonasBase: unknown[] = [{ id: 1, slug: 'la-paz', nombre: 'La Paz', descripcion: null, coordenadas: [-110.3, 24.1] }]
let zonas = zonasBase

vi.mock('../../src/sitio/datos/cacheadas', () => ({
  lugaresCacheados: async () => [ficha],
  fichaLugarCacheada: async () => ficha,
  zonasActivasCacheadas: async () => zonas,
  categoriasCacheadas: async () => [{ id: 1, slug: 'cafes', nombre: 'Cafés', claseGrupo: 'g-comer', tipoSchema: 'CafeOrCoffeeShop' }],
  eventosCacheados: async () => [],
  articulosCacheados: async () => [],
  toursDeSede: async () => tours,
}))

const tourEspiritu = {
  clave: 'servicio:espiritu-santo', tipo: 'servicio' as const, slug: 'espiritu-santo', nombre: 'Tour Espíritu Santo',
  precio: { monto: '$11,290', moneda: 'MXN' as const, estrategia: 'por_grupo' as const }, duracion: '6 h', noches: null,
  ruta: '/es/servicio/sal-y-sol/espiritu-santo', foto: null, temporada: null,
}
let tours: (typeof tourEspiritu)[] = []

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

  it('con tour relacionado visible: sección, frase en el HTML y «Reservar tour» en la barra (spec de presencia §2.1)', async () => {
    tours = [tourEspiritu]
    const zonaConSede = { id: 1, slug: 'la-paz', nombre: 'La Paz', descripcion: null, sedeSlug: 'la-paz', coordenadas: [-110.3, 24.1] }
    zonas = [zonaConSede]
    const html = await pintar({ ...base, toursRelacionados: ['servicio:vieja', 'servicio:espiritu-santo'] })
    expect(html).toContain('Tours para conocer Café Duna')
    expect(html).toContain('Para conocer Café Duna: Tour Espíritu Santo, desde $11,290 MXN por grupo.')
    expect(html).toMatch(/<a [^>]*data-origen="barra-ficha"[^>]*>Reservar tour<\/a>/)
    expect(html).toContain('pieza=barra-lugar-cafe-duna')
    expect(html).toContain('pieza=relacionado-cafe-duna')
    tours = []
    zonas = zonasBase
  })

  it('sin tours relacionados visibles no hay sección ni «Reservar tour»', async () => {
    tours = [tourEspiritu]
    const html = await pintar({ ...base, toursRelacionados: ['servicio:vieja'] })
    expect(html).not.toContain('Tours para conocer')
    expect(html).not.toContain('barra-ficha')
    tours = []
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
