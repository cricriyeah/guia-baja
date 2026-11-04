import { describe, expect, it } from 'vitest'

import { categoriaDe, imagenDe, zonaDe } from '../../src/sitio/datos/mapeo'

const media = {
  id: 1,
  url: '/m/a.jpg',
  width: 3000,
  height: 2000,
  alt: { es: 'Playa', en: 'Beach' },
  credito: 'Ana',
  sizes: {
    s480: { url: '/m/a-480.webp', width: 480 },
    s960: { url: '/m/a-960.webp', width: 960 },
    s1600: { url: '/m/a-1600.webp', width: 1600 },
    og: { url: '/m/a-og.jpg', width: 1200 },
  },
}

describe('mapeos de Payload a tipos del sitio', () => {
  it('imagenDe arma srcset con los tres tamaños y el alt del idioma', () => {
    expect(imagenDe(media, 'en')).toEqual({
      src: '/m/a-960.webp',
      srcset: '/m/a-480.webp 480w, /m/a-960.webp 960w, /m/a-1600.webp 1600w',
      ancho: 3000,
      alto: 2000,
      alt: 'Beach',
      credito: 'Ana',
      og: '/m/a-og.jpg',
    })
  })

  it('imagenDe sin tamaños usa la original; un id suelto o null da null', () => {
    expect(imagenDe({ ...media, sizes: {} }, 'es')?.src).toBe('/m/a.jpg')
    expect(imagenDe(7, 'es')).toBeNull()
    expect(imagenDe(null, 'es')).toBeNull()
  })

  it('zonaDe: null si falta el nombre en el idioma', () => {
    const z = { id: 2, nombre: 'La Paz', slug: 'la-paz', sedeSlug: 'la-paz', coordenadas: [-110.3, 24.1], orden: 1, foto: null } as never
    expect(zonaDe(z, 'es')).toMatchObject({ id: 2, slug: 'la-paz', nombre: 'La Paz', sedeSlug: 'la-paz', coordenadas: [-110.3, 24.1] })
    expect(zonaDe({ ...(z as object), nombre: null } as never, 'en')).toBeNull()
  })

  it('categoriaDe: la clase CSS sale del grupo', () => {
    const c = { id: 3, nombre: 'Playas', slug: 'playas', grupo: 'mar', aplicaA: 'lugar', tipoSchema: 'Beach', orden: 2 } as never
    expect(categoriaDe(c)).toMatchObject({ claseGrupo: 'g-mar', grupo: 'mar', slug: 'playas' })
    expect(categoriaDe({ ...(c as object), grupo: 'comer-y-salir' } as never)?.claseGrupo).toBe('g-comer')
  })
})
