import { describe, expect, it } from 'vitest'

import { rutas } from '../../src/dominio/rutas'

describe('rutas públicas (spec §7)', () => {
  it.each([
    [rutas.portada('es'), '/es/guia'],
    [rutas.portada('en'), '/en/guide'],
    [rutas.zona('es', 'la-paz'), '/es/guia/la-paz'],
    [rutas.categoriaEnZona('en', 'la-paz', 'restaurants'), '/en/guide/la-paz/restaurants'],
    [rutas.categoria('es', 'restaurantes'), '/es/guia/categoria/restaurantes'],
    [rutas.categoria('en', 'restaurants'), '/en/guide/category/restaurants'],
    [rutas.lugar('es', 'cafe-luna'), '/es/guia/lugares/cafe-luna'],
    [rutas.lugar('en', 'luna-cafe'), '/en/guide/places/luna-cafe'],
    [rutas.eventos('en'), '/en/guide/events'],
    [rutas.evento('es', 'carnaval'), '/es/guia/eventos/carnaval'],
    [rutas.articulo('en', 'what-to-do'), '/en/guide/articles/what-to-do'],
    [rutas.negocios('es'), '/es/guia/aparece-en-la-guia'],
    [rutas.negocios('en'), '/en/guide/get-listed'],
    [rutas.privacidad('es'), '/es/guia/privacidad'],
    [rutas.privacidad('en'), '/en/guide/privacy'],
    [rutas.buscar('es'), '/es/guia/buscar'],
    [rutas.buscar('en'), '/en/guide/search'],
  ])('%s', (obtenida, esperada) => {
    expect(obtenida).toBe(esperada)
  })
})
