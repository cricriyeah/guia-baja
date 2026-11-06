import { describe, expect, it } from 'vitest'

import { entradasSitemap, xmlSitemap } from '../../src/sitio/seo/sitemap'

const zona = { id: 1, slug: 'la-paz', nombre: 'La Paz' }
const cat = (slug: string) => ({ id: 5, slug, nombre: slug, aplicaA: 'lugar' })
const lugar = (id: number, slug: string, noIndexar = false) => ({ id, slug, zonaId: 1, categoriaIds: [5], noIndexar })
const vacio = { eventos: [], articulos: [], avisoExiste: true }

const datos = {
  es: { ...vacio, zonas: [zona], categorias: [cat('playas')], lugares: [lugar(1, 'a'), lugar(2, 'b'), lugar(3, 'c', true)] },
  en: { ...vacio, zonas: [zona], categorias: [cat('beaches')], lugares: [lugar(1, 'a-en')] },
} as never

describe('sitemap (spec §9)', () => {
  const rutas = (e: { ruta: string }[]) => e.map((x) => x.ruta)

  it('sin GUIA_INDEXABLE no hay nada', () => expect(entradasSitemap(datos, false)).toEqual([]))

  it('solo URLs indexables; la búsqueda nunca', () => {
    const r = rutas(entradasSitemap(datos, true))
    expect(r).toContain('/es/guia')
    expect(r).toContain('/en/guide/la-paz')
    expect(r).toContain('/es/guia/lugares/a')
    expect(r).not.toContain('/es/guia/lugares/c') // noIndexar
    expect(r).toContain('/es/guia/la-paz/playas') // 3 lugares en es
    expect(r).not.toContain('/en/guide/la-paz/beaches') // 1 en en: noindex
    expect(r.some((x) => x.includes('buscar') || x.includes('search'))).toBe(false)
  })

  it('alternos solo entre versiones indexables', () => {
    const e = entradasSitemap(datos, true)
    expect(e.find((x) => x.ruta === '/es/guia/lugares/a')?.alternos).toMatchObject({ 'en-US': '/en/guide/places/a-en' })
    expect(e.find((x) => x.ruta === '/es/guia/la-paz/playas')?.alternos).toEqual({})
  })

  it('XML con URLs absolutas y xhtml:link', () => {
    const xml = xmlSitemap([{ ruta: '/es/guia', alternos: { 'es-MX': '/es/guia', 'en-US': '/en/guide', 'x-default': '/es/guia' } }], 'https://www.salysoltours.com')
    expect(xml).toContain('<loc>https://www.salysoltours.com/es/guia</loc>')
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en-US" href="https://www.salysoltours.com/en/guide"/>')
  })
})
