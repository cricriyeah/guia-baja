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

  it('Open Graph con el idioma', () => {
    expect(metadatos({ ...base, lang: 'en', indexable: true, versiones }).openGraph).toMatchObject({ locale: 'en_US', title: 'La Paz' })
  })
})
