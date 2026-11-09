import type { Block } from 'payload'

import { esClaveDeTour } from '../dominio/presencia'

export const bloquesArticulo: Block[] = [
  {
    slug: 'tarjetaLugar',
    labels: { singular: 'Tarjeta de lugar', plural: 'Tarjetas de lugar' },
    fields: [{ name: 'lugar', type: 'relationship', relationTo: 'lugares', required: true }],
  },
  {
    slug: 'tarjetaEvento',
    labels: { singular: 'Tarjeta de evento', plural: 'Tarjetas de evento' },
    fields: [{ name: 'evento', type: 'relationship', relationTo: 'eventos', required: true }],
  },
  {
    slug: 'toursZona',
    labels: { singular: 'Tours en esta zona', plural: 'Tours en esta zona' },
    fields: [{ name: 'zona', type: 'relationship', relationTo: 'zonas', required: true }],
  },
  {
    slug: 'preguntasFrecuentes',
    labels: { singular: 'Preguntas frecuentes', plural: 'Preguntas frecuentes' },
    fields: [
      {
        name: 'preguntas',
        type: 'array',
        minRows: 1,
        fields: [
          { name: 'pregunta', type: 'text', required: true },
          { name: 'respuesta', type: 'textarea', required: true },
        ],
      },
    ],
  },
  {
    slug: 'tour',
    labels: { singular: 'Tour', plural: 'Tours' },
    fields: [
      { name: 'zona', type: 'relationship', relationTo: 'zonas', required: true },
      {
        name: 'tour',
        type: 'text',
        required: true,
        validate: (v: unknown) => (typeof v === 'string' && esClaveDeTour(v) ? true : 'Elige un tour del catálogo.'),
        admin: { components: { Field: { path: '/admin/ToursRelacionados#ToursRelacionados', clientProps: { modo: 'uno' } } } },
      },
    ],
  },
]
