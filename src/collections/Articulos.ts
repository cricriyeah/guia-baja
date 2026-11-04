import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { lecturaPublicaPublicada, soloPersonal } from '../acceso/reglas'
import { bloquesArticulo } from '../bloques/articulo'
import { camposDestacado } from '../campos/destacado'
import { camposSeo } from '../campos/seo'
import { campoSlug } from '../campos/slug'
import { rutas } from '../dominio/rutas'
import { fechasDePublicacion, llenarLugaresCitados } from '../hooks/articulos'
import { destinoAlRetirarArticulo, hooksDeRedireccion } from '../redirecciones/hooks'

export const CAMPOS_IDIOMA_ARTICULO = ['titulo', 'slug', 'resumen', 'cuerpo'] as const
export const CAMPOS_LOCALIZADOS_ARTICULO = CAMPOS_IDIOMA_ARTICULO

const redireccion = hooksDeRedireccion({
  coleccion: 'articulos',
  camposIdioma: CAMPOS_IDIOMA_ARTICULO,
  camposLocalizados: CAMPOS_LOCALIZADOS_ARTICULO,
  rutaDe: rutas.articulo,
  destinoAlRetirar: destinoAlRetirarArticulo,
})

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
  hooks: {
    beforeChange: [copiarNombreAutor, fechasDePublicacion, llenarLugaresCitados, redireccion.beforeChange],
    afterChange: [redireccion.afterChange],
    beforeDelete: [redireccion.beforeDelete],
    afterDelete: [redireccion.afterDelete],
  },
  defaultSort: '-publicadoEl',
  fields: [
    { name: 'titulo', type: 'text', localized: true, required: true },
    campoSlug({ desde: 'titulo', localizado: true }),
    { name: 'zonas', type: 'relationship', relationTo: 'zonas', hasMany: true },
    {
      name: 'categorias',
      type: 'relationship',
      relationTo: 'categorias',
      hasMany: true,
      admin: { description: 'La primera da la etiqueta y el color del artículo.' },
    },
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
    { name: 'publicadoEl', type: 'date', admin: { position: 'sidebar', description: 'Se fija al publicar por primera vez.' } },
    { name: 'actualizadoEl', type: 'date', admin: { position: 'sidebar', readOnly: true, description: 'Se actualiza cada vez que se publica un cambio.' } },
    {
      name: 'cuerpo',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: bloquesArticulo })],
      }),
    },
    {
      name: 'lugaresCitados',
      type: 'relationship',
      relationTo: 'lugares',
      hasMany: true,
      admin: { hidden: true },
    },
    ...camposDestacado(),
    camposSeo(),
  ],
}
