import { describe, expect, it } from 'vitest'

import { articuloLd, eventoLd, faqLd, lugarLd } from '../../src/sitio/seo/jsonld'

const base = 'https://www.salysoltours.com'
const img = { src: '/m/a.webp', srcset: '', ancho: 1, alto: 1, alt: '', credito: null, og: null }

describe('JSON-LD de documentos (spec §9)', () => {
  it('lugar con el tipo de su categoría principal', () => {
    const ld = lugarLd(
      {
        nombre: 'Playa Balandra', resumen: 'Agua baja', fotos: [img], direccion: 'Km 25', coordenadas: [-110.32, 24.32],
        telefono: '612', rangoPrecio: '$', horario: [{ dia: 'martes', abre: '08:00', cierra: '18:00' }],
      } as never,
      { url: '/es/guia/lugares/balandra', tipoSchema: 'Beach', zonaNombre: 'La Paz', base, lang: 'es' },
    )
    expect(ld).toMatchObject({
      '@type': 'Beach',
      name: 'Playa Balandra',
      url: 'https://www.salysoltours.com/es/guia/lugares/balandra',
      image: ['https://www.salysoltours.com/m/a.webp'],
      geo: { '@type': 'GeoCoordinates', latitude: 24.32, longitude: -110.32 },
      telephone: '612',
      priceRange: '$',
      address: { '@type': 'PostalAddress', streetAddress: 'Km 25', addressLocality: 'La Paz', addressRegion: 'Baja California Sur', addressCountry: 'MX' },
      openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Tuesday', opens: '08:00', closes: '18:00' }],
    })
  })

  it('evento gratis en un lugar', () => {
    const ld = eventoLd(
      { nombre: 'Trova', resumen: 'r', inicio: '2026-11-07T02:00:00.000Z', fin: null, gratis: true, fotos: [], urlBoletos: null, direccionLibre: null } as never,
      { url: '/es/guia/eventos/trova', lugar: { nombre: 'Malecón' } as never, zonaNombre: 'La Paz', base },
    )
    expect(ld).toMatchObject({
      '@type': 'Event',
      startDate: '2026-11-07T02:00:00.000Z',
      eventStatus: 'https://schema.org/EventScheduled',
      isAccessibleForFree: true,
      location: { '@type': 'Place', name: 'Malecón' },
    })
    expect(ld).not.toHaveProperty('endDate')
  })

  it('artículo y preguntas', () => {
    const ld = articuloLd(
      { titulo: 'Siete mesas', resumen: 'r', portada: img, autorNombre: 'Ana', publicadoEl: '2026-10-20T00:00:00.000Z', actualizadoEl: null } as never,
      { url: '/es/guia/articulos/siete', lang: 'es', base },
    )
    expect(ld).toMatchObject({ '@type': 'Article', headline: 'Siete mesas', author: { '@type': 'Person', name: 'Ana' }, dateModified: '2026-10-20T00:00:00.000Z', inLanguage: 'es-MX' })
    expect(faqLd([{ pregunta: '¿Hora?', respuesta: 'A la 1.' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: '¿Hora?', acceptedAnswer: { '@type': 'Answer', text: 'A la 1.' } }],
    })
  })
})
