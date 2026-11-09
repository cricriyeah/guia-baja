import { ValidationError, type CollectionConfig, type TextField } from 'payload'

import { lecturaPublica, soloPersonal } from '../acceso/reglas'
import { esSlugValido } from '../dominio/slugs'
import { MESES, registroTourConDatos } from '../dominio/temporada'
import { hooksDeRevalidacion } from '../revalidacion/hooks'

const revalidacion = hooksDeRevalidacion('fotos-tours')

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
  labels: { singular: 'Foto y temporada de tour', plural: 'Fotos y temporadas de tours' },
  admin: { useAsTitle: 'slug', defaultColumns: ['slug', 'sedeSlug', 'tipo', 'updatedAt'] },
  access: { read: lecturaPublica, create: soloPersonal, update: soloPersonal, delete: soloPersonal },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc, req }) => {
        if (!registroTourConDatos({ ...originalDoc, ...data }, req.locale)) {
          throw new ValidationError({ collection: 'fotos-tours', errors: [{ path: 'foto', message: 'Agrega una foto, los meses o la temporada.' }] })
        }
        return data
      },
    ],
    afterChange: [revalidacion.afterChange],
    afterDelete: [revalidacion.afterDelete],
  },
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
    { name: 'foto', type: 'upload', relationTo: 'media', required: false },
    { name: 'temporada', type: 'text', localized: true, admin: { description: 'Opcional, p. ej. «enero a marzo».' } },
    {
      name: 'meses',
      type: 'select',
      hasMany: true,
      options: MESES.map((m) => ({ label: { es: m.es, en: m.en }, value: String(m.valor) })),
      admin: { description: 'Meses en que el tour está en temporada. Ordena las listas y pone la etiqueta «En temporada».' },
    },
  ],
}
