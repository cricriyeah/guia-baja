import { describe, expect, it } from 'vitest'

import type { TourConFoto } from '../../src/sitio/datos/cacheadas'
import type { FichaLugar } from '../../src/sitio/datos/tipos'
import { lugarLd, toursLd } from '../../src/sitio/seo/jsonld'

const base = 'https://www.salysoltours.com'
const tour = (extra: Partial<TourConFoto> = {}): TourConFoto => ({
  clave: 'servicio:a', tipo: 'servicio', slug: 'a', nombre: 'Tour A', duracion: null, noches: null, ruta: '/es/servicio/e/a',
  precio: { monto: '$1,500', valor: 1500, moneda: 'MXN', estrategia: 'por_persona' }, foto: null, temporada: null, meses: [], enTemporada: false, ...extra,
})
const trip = (t: TourConFoto, c = {}) => (toursLd([t], { lang: 'es', base, ...c }) as unknown as { itemListElement: { item: Record<string, never> }[] }).itemListElement[0].item

describe('toursLd', () => {
  it('por persona: minPrice numérico y unidad', () => {
    expect(trip(tour())).toMatchObject({
      '@type': 'TouristTrip', name: 'Tour A', url: `${base}/es/servicio/e/a`,
      offers: { '@type': 'Offer', url: `${base}/es/servicio/e/a`, priceSpecification: { '@type': 'UnitPriceSpecification', minPrice: 1500, priceCurrency: 'MXN', unitText: 'por persona' } },
      provider: { '@type': 'Organization', name: 'Sun Baja', url: base },
    })
  })
  it('por grupo lleva su unidad', () => {
    const t = tour({ precio: { monto: '$11,290', valor: 11290, moneda: 'MXN', estrategia: 'por_grupo' } })
    expect(trip(t)).toMatchObject({ offers: { priceSpecification: { minPrice: 11290, unitText: 'por grupo' } } })
  })
  it('paquete', () => {
    expect(trip(tour({ tipo: 'paquete', noches: 5 }))).toMatchObject({ offers: { priceSpecification: { minPrice: 1500 } } })
  })
  it('tarifa fija: sin unitText', () => {
    const t = tour({ precio: { monto: '$900', valor: 900, moneda: 'MXN', estrategia: 'tarifa_fija' } })
    expect(trip(t).offers).not.toHaveProperty('priceSpecification.unitText')
  })
  it('sin precio: sin offers', () => expect(trip(tour({ precio: null }))).not.toHaveProperty('offers'))
  it('en inglés, USD', () => {
    const t = tour({ precio: { monto: '$86', valor: 86, moneda: 'USD', estrategia: 'por_persona' } })
    expect(trip(t, { lang: 'en' })).toMatchObject({ offers: { priceSpecification: { minPrice: 86, priceCurrency: 'USD', unitText: 'per person' } } })
  })
  it('con y sin itinerary hacia el lugar', () => {
    expect(trip(tour(), { lugarId: `${base}/es/guia/lugares/x#lugar` })).toMatchObject({ itinerary: { '@id': `${base}/es/guia/lugares/x#lugar` } })
    expect(trip(tour())).not.toHaveProperty('itinerary')
  })
})

describe('lugarLd', () => {
  const l = {
    nombre: 'Playa', resumen: 'R', fotos: [], direccion: null, coordenadas: null, telefono: null, rangoPrecio: null, horario: [],
    visita: { costoEntrada: null, entradaGratis: true, minutosDesdeZona: null, medio: null, comoLlegar: null, servicios: ['sombra', 'sin-servicios'], mejorHora: null },
  } as unknown as FichaLugar
  const c = { url: '/es/guia/lugares/playa', tipoSchema: 'Beach', zonaNombre: 'La Paz', base, lang: 'es' as const }
  it('@id, gratis y servicios, sin publicar sin-servicios', () => {
    expect(lugarLd(l, c)).toMatchObject({
      '@id': `${base}/es/guia/lugares/playa#lugar`,
      isAccessibleForFree: true,
      amenityFeature: [{ '@type': 'LocationFeatureSpecification', name: 'Sombra', value: true }],
    })
  })
  it('sin visita: sin esas llaves', () => {
    const r = lugarLd({ ...l, visita: null }, c)
    expect(r).not.toHaveProperty('isAccessibleForFree')
    expect(r).not.toHaveProperty('amenityFeature')
  })
})
