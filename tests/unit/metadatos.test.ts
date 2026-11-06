import { describe, expect, it } from 'vitest'

import { metadatos } from '../../src/sitio/seo/metadatos'

const base = { lang: 'es' as const, titulo: 'La Paz', descripcion: 'Qué hacer', ruta: '/es/guia/la-paz' }
const versiones = [
  { lang: 'es' as const, ruta: '/es/guia/la-paz', indexable: true },
  { lang: 'en' as const, ruta: '/en/guide/la-paz', indexable: true },
]

describe('metadatos (spec §9)', () => {
  it('indexable: canónica, hreflang y robots index', () => {
    const m = metadatos({ ...base, indexable: true, versiones })
    expect(m.alternates).toEqual({
      canonical: '/es/guia/la-paz',
      languages: { 'es-MX': '/es/guia/la-paz', 'en-US': '/en/guide/la-paz', 'x-default': '/es/guia/la-paz' },
    })
    expect(m.robots).toEqual({ index: true, follow: true })
  })

  it('no indexable: noindex y sin hreflang', () => {
    const m = metadatos({ ...base, indexable: false, versiones })
    expect(m.alternates).toEqual({ canonical: '/es/guia/la-paz' })
    expect(m.robots).toEqual({ index: false, follow: true })
  })

  it('página N ≥ 2: el título (y el de Open Graph) lleva el número, en cada idioma', () => {
    const p2 = metadatos({ ...base, indexable: true, versiones, pagina: 2 })
    expect(p2.title).toBe('La Paz — Página 2')
    expect(p2.openGraph).toMatchObject({ title: 'La Paz — Página 2' })
    expect(metadatos({ ...base, lang: 'en', indexable: true, versiones, pagina: 3 }).title).toBe('La Paz — Page 3')
  })

  it('página 1 o sin página: el título queda igual', () => {
    expect(metadatos({ ...base, indexable: true, versiones }).title).toBe('La Paz')
    expect(metadatos({ ...base, indexable: true, versiones, pagina: 1 }).title).toBe('La Paz')
  })

  it('Open Graph con el idioma', () => {
    expect(metadatos({ ...base, lang: 'en', indexable: true, versiones }).openGraph).toMatchObject({ locale: 'en_US', title: 'La Paz' })
  })

  it('siteName sale en el idioma de la página', () => {
    expect(metadatos({ ...base, indexable: true, versiones }).openGraph).toMatchObject({ siteName: 'Guía de la Baja' })
    expect(metadatos({ ...base, lang: 'en', indexable: true, versiones }).openGraph).toMatchObject({ siteName: 'Baja Guide' })
  })

  it('imagenOg: imagen 1200×630 en Open Graph y tarjeta grande en Twitter', () => {
    const m = metadatos({ ...base, indexable: true, versiones, imagenOg: '/guia-assets/og/es/zona/la-paz' })
    expect(m.openGraph).toMatchObject({ images: [{ url: '/guia-assets/og/es/zona/la-paz', width: 1200, height: 630 }] })
    expect(m.twitter).toEqual({ card: 'summary_large_image' })
  })

  it('sin imagenOg: ni images ni twitter', () => {
    const m = metadatos({ ...base, indexable: true, versiones })
    expect(m.openGraph).not.toHaveProperty('images')
    expect(m.twitter).toBeUndefined()
  })
})
