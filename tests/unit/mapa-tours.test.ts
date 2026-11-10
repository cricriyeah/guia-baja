import { describe, expect, it } from 'vitest'

import { puntosConTours } from '../../src/sitio/datos/mapa-tours'

const tour = (slug: string) => ({ clave: `servicio:${slug}`, nombre: slug.toUpperCase(), ruta: `/es/servicio/e/${slug}` })
const lugar = (extra: object = {}) => ({ slug: 'playa', nombre: 'Playa', zonaSlug: 'la-paz', coordenadas: [-110, 24] as [number, number], toursRelacionados: [] as string[], ...extra })
const opciones = { lang: 'es' as const, pieza: 'mapa-la-paz-playas', sitio: 'https://s.mx', precioDe: () => '$1,500' }

describe('puntosConTours', () => {
  it('arma el punto con nombre, precio, href con atribución y zona', () => {
    const [p] = puntosConTours([lugar({ toursRelacionados: ['servicio:a'] })], [tour('a')], opciones)
    expect(p).toMatchObject({ lng: -110, lat: 24, nombre: 'Playa', ruta: '/es/guia/lugares/playa' })
    expect(p.tours).toEqual([{ nombre: 'A', precio: '$1,500', href: 'https://s.mx/es/servicio/e/a?desde=guia&pieza=mapa-la-paz-playas', zona: 'la-paz' }])
  })
  it('a lo más 2 tours', () => {
    const claves = ['servicio:a', 'servicio:b', 'servicio:c']
    const [p] = puntosConTours([lugar({ toursRelacionados: claves })], [tour('a'), tour('b'), tour('c')], opciones)
    expect(p.tours).toHaveLength(2)
  })
  it('un tour que ya no está en el catálogo no sale', () => {
    const [p] = puntosConTours([lugar({ toursRelacionados: ['servicio:viejo'] })], [tour('a')], opciones)
    expect(p.tours).toEqual([])
  })
  it('catálogo caído: puntos sin tours', () => {
    const [p] = puntosConTours([lugar({ toursRelacionados: ['servicio:a'] })], [], opciones)
    expect(p.tours).toEqual([])
  })
  it('un lugar sin coordenadas no da punto', () => {
    expect(puntosConTours([lugar({ coordenadas: null })], [], opciones)).toEqual([])
  })
})
