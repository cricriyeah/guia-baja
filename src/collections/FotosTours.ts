import type { CollectionConfig, TextField } from 'payload'

import { lecturaPublica, soloPersonal } from '../acceso/reglas'
import { esSlugValido } from '../dominio/slugs'

const slugDelCatalogo = (name: string, description: string): TextField => ({
  name,
  type: 'text',
  required: true,
  admin: { description },
  validate: (v: unknown) => (typeof v === 'string' && esSlugValido(v) ? true : 'Slug inválido (minúsculas, números y guiones).'),
})

// Foto y temporada de un tour del catálogo (spec §6 y §8.1): el catálogo no las manda.
export const FotosTours: CollectionConfig = {
  slug: 'fotos-tours',
  labels: { singular: 'Foto de tour', plural: 'Fotos de tours' },
  admin: { useAsTitle: 'slug', defaultColumns: ['slug', 'sedeSlug', 'tipo', 'updatedAt'] },
  access: { read: lecturaPublica, create: soloPersonal, update: soloPersonal, delete: soloPersonal },
  indexes: [{ fields: ['sedeSlug', 'tipo', 'slug'], unique: true }],
  fields: [
    slugDelCatalogo('sedeSlug', 'Sede del sitio de reservas (la-paz, la-ventana, puerto-chale).'),
    {
      name: 'tipo',
      type: 'select',
      required: true,
      options: [
        { label: 'Servicio', value: 'servicio' },
        { label: 'Paquete', value: 'paquete' },
      ],
    },
    slugDelCatalogo('slug', 'Slug del servicio o paquete en el catálogo.'),
    { name: 'foto', type: 'upload', relationTo: 'media', required: true },
    { name: 'temporada', type: 'text', localized: true, admin: { description: 'Opcional, p. ej. «enero a marzo».' } },
  ],
}
