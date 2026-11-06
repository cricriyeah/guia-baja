// tests/unit/ficha-evento.test.ts
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { FichaEvento, TarjetaEvento, TarjetaLugar } from '../../src/sitio/datos/tipos'

// Fuera de Next, <Link> se simula como un <a> simple.
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: ReactNode }) => createElement('a', { href, ...resto }, children),
}))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('404') }, permanentRedirect: () => { throw new Error('308') } }))

const sinPatrocinio = { activo: false, desde: null, hasta: null }
const patrocinado = { activo: true, desde: null, hasta: '2999-01-01' }
const dias = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()

const lugarBase: TarjetaLugar = {
  id: 1, slug: 'cafe-duna', nombre: 'Café Duna', resumen: 'Café', zonaId: 1, zonaSlug: 'la-paz', categoriaIds: [1],
  foto: null, rangoPrecio: null, horario: [], caracteristicas: [], coordenadas: [-110.31, 24.14], patrocinio: sinPatrocinio,
  orden: 0, destacado: { activo: false, orden: 0 }, noIndexar: false,
}
const tarjeta = (id: number, slug: string, patrocinio: TarjetaEvento['patrocinio']): TarjetaEvento => ({
  id, slug, nombre: `Evento ${slug}`, resumen: 'Resumen', zonaId: 1, zonaSlug: 'la-paz', categoriaIds: [1], foto: null,
  inicio: dias(2), fin: null, gratis: true, precio: null, lugarId: 1, direccionLibre: null,
  patrocinio, orden: 0, destacado: { activo: false, orden: 0 }, noIndexar: false,
})
const ficha = (patrocinio: TarjetaEvento['patrocinio']): FichaEvento => ({
  ...tarjeta(10, 'principal', patrocinio), cuerpo: null, fotos: [], urlBoletos: null, metaTitulo: null, metaDescripcion: null, media: {},
})

let lugar: TarjetaLugar = lugarBase
let otro: TarjetaEvento = tarjeta(11, 'otro', sinPatrocinio)
let principal: FichaEvento = ficha(sinPatrocinio)

vi.mock('../../src/sitio/datos/cacheadas', () => ({
  lugaresCacheados: async () => [lugar],
  eventosCacheados: async () => [principal, otro],
  fichaEventoCacheada: async () => principal,
  zonasActivasCacheadas: async () => [{ id: 1, slug: 'la-paz', nombre: 'La Paz', descripcion: null, coordenadas: [-110.3, 24.1] }],
  categoriasCacheadas: async () => [{ id: 1, slug: 'cafes', nombre: 'Cafés', claseGrupo: 'g-comer', tipoSchema: 'CafeOrCoffeeShop' }],
  articulosCacheados: async () => [],
}))

const { default: FichaDeEvento } = await import('../../src/app/(sitio)/[lang]/guia/eventos/[slug]/page')

async function pintar(): Promise<string> {
  return renderToStaticMarkup(await FichaDeEvento({ params: Promise.resolve({ lang: 'es', slug: 'principal' }) }))
}
const tarjetas = (html: string) => html.match(/<a [^>]*class="lugar-ref[^>]*>.*?<\/a>/g) ?? []

describe('ficha de evento: patrocinio en las tarjetas (spec §6/§7)', () => {
  it('lugar y evento relacionado patrocinados: «Patrocinado» y rel="sponsored" en ambas tarjetas', async () => {
    lugar = { ...lugarBase, patrocinio: patrocinado }
    otro = tarjeta(11, 'otro', patrocinado)
    principal = ficha(sinPatrocinio)
    const lista = tarjetas(await pintar())
    expect(lista).toHaveLength(2)
    for (const a of lista) {
      expect(a).toContain('class="patrocinado"')
      expect(a).toMatch(/rel="sponsored"/)
    }
  })

  it('sin patrocinio no hay etiqueta ni rel', async () => {
    lugar = lugarBase
    otro = tarjeta(11, 'otro', sinPatrocinio)
    principal = ficha(sinPatrocinio)
    const html = await pintar()
    expect(tarjetas(html)).toHaveLength(2)
    expect(html).not.toContain('class="patrocinado"')
    expect(html).not.toContain('sponsored')
  })
})
