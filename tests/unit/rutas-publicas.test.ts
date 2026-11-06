import { describe, expect, it } from 'vitest'

import { resolverRutaPublica, rutaPublicaDesdeArbol } from '../../src/dominio/rutas-publicas'

const r = (url: string) => {
  const u = new URL(url, 'https://x.test')
  return resolverRutaPublica(u.pathname, u.searchParams)
}

describe('resolverRutaPublica (spec §4, §7)', () => {
  it.each([
    ['/es/guia', { tipo: 'pasar' }],
    ['/es/guia/la-paz/playas', { tipo: 'pasar' }],
    ['/es/guia/lugares/balandra', { tipo: 'pasar' }],
    ['/guia-sitemap.xml', { tipo: 'pasar' }],
    ['/es/guia/lugares/balandra?gclid=1', { tipo: 'pasar' }],
  ])('deja pasar %s', (url, accion) => expect(r(url)).toEqual(accion))

  it.each([
    ['/en/guide', '/en/guia'],
    ['/en/guide/la-paz', '/en/guia/la-paz'],
    ['/en/guide/la-paz/beaches', '/en/guia/la-paz/beaches'],
    ['/en/guide/places/balandra', '/en/guia/lugares/balandra'],
    ['/en/guide/events', '/en/guia/eventos'],
    ['/en/guide/events/museum-night', '/en/guia/eventos/museum-night'],
    ['/en/guide/articles/fish', '/en/guia/articulos/fish'],
    ['/en/guide/category/beaches', '/en/guia/categoria/beaches'],
    ['/en/guide/get-listed', '/en/guia/aparece-en-la-guia'],
    ['/en/guide/privacy', '/en/guia/privacidad'],
    ['/en/guide/search?q=taco', '/en/guia/buscar?q=taco'],
    ['/en/guide/places/balandra/', '/en/guia/lugares/balandra'],
  ])('reescribe %s → %s', (url, destino) => expect(r(url)).toEqual({ tipo: 'reescribir', destino }))

  it.each([
    ['/en/guia', 'en'],
    ['/es/guide', 'es'],
    ['/es/guia/places/x', 'es'],
    ['/en/guide/lugares/x', 'en'],
    ['/es/guia/--', 'es'],
    ['/es/guia/la-paz/playas/--pagina/2', 'es'],
    ['/en/guide/events/--filtros', 'en'],
  ])('404 para %s', (url, lang) => expect(r(url)).toEqual({ tipo: 'noEncontrado', lang }))

  it.each([
    ['/es/guia/wp-login.php', 'es'],
    ['/en/guide/.env', 'en'],
    ['/es/guia/La-Paz', 'es'],
    ['/es/guia/la-paz/playas%20x', 'es'],
  ])('404 único para el segmento que no es slug en %s', (url, lang) => expect(r(url)).toEqual({ tipo: 'noEncontrado', lang }))

  it('un listado válido con ?pagina=2 sigue reescribiendo igual tras el filtro de slugs', () => {
    expect(r('/es/guia/la-paz/playas?pagina=2')).toEqual({ tipo: 'reescribir', destino: '/es/guia/la-paz/playas/--pagina/2' })
  })

  it('lleva ?pagina=N de un listado a su segmento interno', () => {
    expect(r('/es/guia/la-paz/playas?pagina=2')).toEqual({ tipo: 'reescribir', destino: '/es/guia/la-paz/playas/--pagina/2' })
    expect(r('/en/guide/category/beaches?pagina=3')).toEqual({ tipo: 'reescribir', destino: '/en/guia/categoria/beaches/--pagina/3' })
    expect(r('/es/guia/eventos?pagina=2')).toEqual({ tipo: 'reescribir', destino: '/es/guia/eventos/--pagina/2' })
  })

  it('redirige ?pagina=1 a la URL sin ese parámetro (308) y conserva los demás', () => {
    expect(r('/en/guide/la-paz/beaches?pagina=1')).toEqual({ tipo: 'redirigir', destino: '/en/guide/la-paz/beaches' })
    expect(r('/es/guia/eventos?pagina=1&gclid=x')).toEqual({ tipo: 'redirigir', destino: '/es/guia/eventos?gclid=x' })
  })

  it('una página inválida es 404', () => {
    expect(r('/es/guia/eventos?pagina=0')).toEqual({ tipo: 'noEncontrado', lang: 'es' })
    expect(r('/es/guia/eventos?pagina=abc')).toEqual({ tipo: 'noEncontrado', lang: 'es' })
    expect(r('/es/guia/eventos?pagina=02')).toEqual({ tipo: 'noEncontrado', lang: 'es' })
  })

  it('un listado con filtros va a su ruta interna dinámica, con la consulta completa', () => {
    expect(r('/es/guia/la-paz/playas?caracteristica=para-ninos&pagina=2')).toEqual({
      tipo: 'reescribir',
      destino: '/es/guia/la-paz/playas/--filtros?caracteristica=para-ninos&pagina=2',
    })
    expect(r('/en/guide/events?zona=la-paz')).toEqual({ tipo: 'reescribir', destino: '/en/guia/eventos/--filtros?zona=la-paz' })
  })

  it('?pagina=1 con filtros redirige a la misma consulta sin pagina, no reescribe', () => {
    expect(r('/es/guia/la-paz/playas?caracteristica=para-ninos&pagina=1')).toEqual({
      tipo: 'redirigir',
      destino: '/es/guia/la-paz/playas?caracteristica=para-ninos',
    })
    expect(r('/en/guide/events?pagina=1&zona=la-paz&abierto=1')).toEqual({
      tipo: 'redirigir',
      destino: '/en/guide/events?zona=la-paz&abierto=1',
    })
  })

  it('?pagina y filtros fuera de un listado no cambian nada', () => {
    expect(r('/es/guia/lugares/balandra?pagina=2')).toEqual({ tipo: 'pasar' })
    expect(r('/es/guia/la-paz?zona=x')).toEqual({ tipo: 'pasar' })
  })

  it('no toca rutas que no son de la guía', () => {
    expect(r('/es')).toEqual({ tipo: 'pasar' })
    expect(r('/es/otra-cosa')).toEqual({ tipo: 'pasar' })
  })
})

describe('rutaPublicaDesdeArbol', () => {
  it.each([
    ['es', [], '/es/guia'],
    ['en', [], '/en/guide'],
    ['en', ['lugares', 'balandra'], '/en/guide/places/balandra'],
    ['en', ['la-paz', 'beaches'], '/en/guide/la-paz/beaches'],
    ['es', ['aparece-en-la-guia'], '/es/guia/aparece-en-la-guia'],
    ['en', ['eventos'], '/en/guide/events'],
  ] as const)('%s %j → %s', (lang, segs, ruta) => expect(rutaPublicaDesdeArbol(lang, [...segs])).toBe(ruta))

  it('ida y vuelta: lo que reescribe el proxy vuelve a la ruta pública', () => {
    for (const url of ['/en/guide/places/x', '/en/guide/category/y', '/en/guide/la-paz/beaches', '/en/guide/get-listed']) {
      const accion = r(url)
      if (accion.tipo !== 'reescribir') throw new Error(url)
      const [, lang, , ...segs] = accion.destino.split('/')
      expect(rutaPublicaDesdeArbol(lang as 'en', segs)).toBe(url)
    }
  })
})
