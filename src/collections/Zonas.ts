import type { CollectionConfig } from 'payload'

import { soloPersonal, zonasPublicas } from '../acceso/reglas'
import { campoSlug } from '../campos/slug'
import { esSlugReservadoZona, esSlugValido } from '../dominio/slugs'

export const Zonas: CollectionConfig = {
  slug: 'zonas',
  admin: { useAsTitle: 'nombre', defaultColumns: ['nombre', 'slug', 'activa', 'orden'] },
  access: { read: zonasPublicas, create: soloPersonal, update: soloPersonal, delete: soloPersonal },
  defaultSort: 'orden',
  fields: [
    { name: 'nombre', type: 'text', localized: true, required: true },
    campoSlug({
      desde: 'nombre',
      localizado: false,
      validarExtra: (s) => (esSlugReservadoZona(s) ? 'Ese slug está reservado por una ruta de la guía.' : true),
    }),
    { name: 'descripcion', type: 'textarea', localized: true },
    { name: 'foto', type: 'upload', relationTo: 'media' },
    { name: 'coordenadas', type: 'point' },
    { name: 'orden', type: 'number', defaultValue: 100 },
    { name: 'activa', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    {
      name: 'sedeSlug',
      type: 'text',
      unique: true,
      admin: { description: 'Slug de la sede del sitio de reservas (la-paz, la-ventana, puerto-chale).' },
      validate: (v: unknown) =>
        v === null || v === undefined || v === '' || (typeof v === 'string' && esSlugValido(v))
          ? true
          : 'Slug de sede inválido.',
    },
  ],
}
