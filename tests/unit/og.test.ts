import { afterEach, describe, expect, it, vi } from 'vitest'

import { fotoDeFondo, recortarTituloOg, rutaOg, segmentosOgValidos, tamanoTituloOg } from '../../src/sitio/seo/og'

describe('rutaOg', () => {
  it('bajo /guia-assets (lo reescribe el sitio de reservas), con slugs', () => {
    expect(rutaOg('en', 'lugar', ['balandra'])).toBe('/guia-assets/og/en/lugar/balandra')
    expect(rutaOg('es', 'portada')).toBe('/guia-assets/og/es/portada')
    expect(rutaOg('es', 'categoria-zona', ['la-paz', 'playas'])).toBe('/guia-assets/og/es/categoria-zona/la-paz/playas')
  })
})

describe('título de la imagen OG', () => {
  it('el tamaño baja con el largo para que quepa en 1200×630', () => {
    expect(tamanoTituloOg('Balandra')).toBe(64)
    expect(tamanoTituloOg('x'.repeat(60))).toBeLessThan(64)
    expect(tamanoTituloOg('x'.repeat(200))).toBeLessThan(tamanoTituloOg('x'.repeat(60)))
  })

  it('recorta con elipsis lo que no cabe ni con la letra más chica', () => {
    expect(recortarTituloOg('Balandra')).toBe('Balandra')
    const largo = recortarTituloOg('palabra '.repeat(80))
    expect(largo.length).toBeLessThanOrEqual(120)
    expect(largo.endsWith('…')).toBe(true)
  })

  it('colapsa espacios y saltos de línea', () => {
    expect(recortarTituloOg('  Cocina\n  Marea   Alta ')).toBe('Cocina Marea Alta')
  })
})

describe('segmentosOgValidos', () => {
  it('exige el número exacto de segmentos y un tipo conocido', () => {
    expect(segmentosOgValidos('portada', [])).toBe(true)
    expect(segmentosOgValidos('categoria-zona', ['la-paz', 'playas'])).toBe(true)
    expect(segmentosOgValidos('zona', ['la-paz', 'extra'])).toBe(false)
    expect(segmentosOgValidos('lugar', [])).toBe(false)
    expect(segmentosOgValidos('constructor', [])).toBe(false)
  })
})

describe('fotoDeFondo', () => {
  afterEach(() => vi.unstubAllGlobals())
  const responder = (r: Response | Error) => vi.stubGlobal('fetch', vi.fn(() => (r instanceof Error ? Promise.reject(r) : Promise.resolve(r))))

  it('sin foto, null y sin pedir nada', async () => {
    responder(new Error('no debe llamarse'))
    expect(await fotoDeFondo(null, 'https://x.test')).toBeNull()
  })

  it('JPEG correcto: data URI', async () => {
    responder(new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } }))
    expect(await fotoDeFondo('/media/a.jpg', 'https://x.test')).toBe('data:image/jpeg;base64,AQID')
  })

  it('error de red, 404, WebP o demasiado grande: null (fondo de marca)', async () => {
    responder(new Error('timeout'))
    expect(await fotoDeFondo('/a.jpg', 'https://x.test')).toBeNull()
    responder(new Response('no', { status: 404, headers: { 'content-type': 'image/jpeg' } }))
    expect(await fotoDeFondo('/a.jpg', 'https://x.test')).toBeNull()
    responder(new Response(new Uint8Array([1]), { headers: { 'content-type': 'image/webp' } }))
    expect(await fotoDeFondo('/a.jpg', 'https://x.test')).toBeNull()
    responder(new Response(new Uint8Array(5 * 1024 * 1024), { headers: { 'content-type': 'image/png' } }))
    expect(await fotoDeFondo('/a.jpg', 'https://x.test')).toBeNull()
  })
})
