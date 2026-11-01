import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { lecturaPublicaPublicada, soloPersonal } from '../acceso/reglas'
import { bloquesArticulo } from '../bloques/articulo'
import { camposSeo } from '../campos/seo'
import { campoSlug } from '../campos/slug'

export const CAMPOS_IDIOMA_ARTICULO = ['titulo', 'slug', 'resumen', 'cuerpo'] as const
export const CAMPOS_LOCALIZADOS_ARTICULO = CAMPOS_IDIOMA_ARTICULO

// El público no lee Users; el nombre del autor viaja copiado en el artículo.
// Lee con el adaptador de base (no Local API) para no tocar req.locale (regla de hooks del plan).
const copiarNombreAutor: CollectionBeforeChangeHook = async ({ data, req }) => {
  const autor = data?.autor
  const id = typeof autor === 'object' && autor !== null ? (autor as { id: number }).id : autor
  if (!id) return data
  const usuario = await req.payload.db.findOne<{ id: number; nombrePublico?: string }>({
    collection: 'users',
    where: { id: { equals: id } },
    req,
  })
  return { ...data, autorNombre: usuario?.nombrePublico ?? '' }
}

export const Articulos: CollectionConfig = {
  slug: 'articulos',
  admin: { useAsTitle: 'titulo', defaultColumns: ['titulo', 'autorNombre', '_status', 'publicadoEl'] },
  versions: { drafts: true, maxPerDoc: 50 },
  access: {
    read: lecturaPublicaPublicada,
    readVersions: soloPersonal,
    create: soloPersonal,
    update: soloPersonal,
    delete: soloPersonal,
  },
  hooks: { beforeChange: [copiarNombreAutor] },
  defaultSort: '-publicadoEl',
  fields: [
    { name: 'titulo', type: 'text', localized: true, required: true },
    campoSlug({ desde: 'titulo', localizado: true }),
    { name: 'zonas', type: 'relationship', relationTo: 'zonas', hasMany: true },
    { name: 'resumen', type: 'textarea', localized: true, maxLength: 160 },
    { name: 'portada', type: 'upload', relationTo: 'media', required: true },
    {
      name: 'autor',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }: { user?: { id: number } | null }) => user?.id,
    },
    { name: 'autorNombre', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'publicadoEl', type: 'date', defaultValue: () => new Date().toISOString(), admin: { position: 'sidebar' } },
    { name: 'actualizadoEl', type: 'date', defaultValue: () => new Date().toISOString(), admin: { position: 'sidebar' } },
    {
      name: 'cuerpo',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: bloquesArticulo })],
      }),
    },
    camposSeo(),
  ],
}
