import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { campoSoloPersonal, lecturaPublicaPublicada, soloPersonal } from '../acceso/reglas'
import { bloquesArticulo } from '../bloques/articulo'
import { hooksDeIndice } from '../busqueda/hooks'
import { camposDestacado } from '../campos/destacado'
import { camposSeo } from '../campos/seo'
import { campoSlug } from '../campos/slug'
import { CARACTERISTICAS } from '../dominio/caracteristicas'
import { CAMPOS_IDIOMA, CAMPOS_LOCALIZADOS } from '../dominio/idioma'
import { esClaveDeTour } from '../dominio/presencia'
import { rutas } from '../dominio/rutas'
import { SERVICIOS_VISITA } from '../dominio/visita'
import { copiarNombreAutor, fechasDePublicacion } from '../hooks/articulos'
import { calcularLugaresQueCoinciden, validarToursDeTema } from '../hooks/temas'
import { destinoAlRetirarPlan, hooksDeRedireccion } from '../redirecciones/hooks'
import { hooksDeRevalidacion } from '../revalidacion/hooks'

const revalidacion = hooksDeRevalidacion('temas')
const indice = hooksDeIndice('tema')
const redireccion = hooksDeRedireccion({
  coleccion: 'temas',
  camposIdioma: CAMPOS_IDIOMA.temas,
  camposLocalizados: CAMPOS_LOCALIZADOS.temas,
  rutaDe: rutas.tema,
  destinoAlRetirar: destinoAlRetirarPlan,
})

export const Temas: CollectionConfig = {
  slug: 'temas',
  labels: { singular: 'Tema', plural: 'Temas' },
  admin: { useAsTitle: 'titulo', defaultColumns: ['titulo', 'zona', '_status', 'publicadoEl'] },
  versions: { drafts: { schedulePublish: true }, maxPerDoc: 50 },
  access: { read: lecturaPublicaPublicada, readVersions: soloPersonal, create: soloPersonal, update: soloPersonal, delete: soloPersonal },
  hooks: {
    beforeValidate: [validarToursDeTema],
    beforeChange: [copiarNombreAutor, fechasDePublicacion, redireccion.beforeChange],
    afterChange: [redireccion.afterChange, revalidacion.afterChange, indice.afterChange],
    beforeDelete: [redireccion.beforeDelete],
    afterDelete: [redireccion.afterDelete, revalidacion.afterDelete, indice.afterDelete],
  },
  defaultSort: '-publicadoEl',
  fields: [
    { name: 'titulo', type: 'text', localized: true, required: true },
    campoSlug({ desde: 'titulo', localizado: true }),
    { name: 'zona', type: 'relationship', relationTo: 'zonas', index: true, admin: { description: 'Sin zona, el tema es de toda la Baja.' } },
    { name: 'resumen', type: 'textarea', localized: true, maxLength: 160 },
    { name: 'portada', type: 'upload', relationTo: 'media' },
    { name: 'autor', type: 'relationship', relationTo: 'users', required: true, defaultValue: ({ user }: { user?: { id: number } | null }) => user?.id },
    { name: 'autorNombre', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'publicadoEl', type: 'date', admin: { position: 'sidebar' } },
    { name: 'actualizadoEl', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'introduccion', type: 'richText', localized: true,
      editor: lexicalEditor({ features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: bloquesArticulo })] }),
    },
    { name: 'categorias', type: 'relationship', relationTo: 'categorias', hasMany: true, admin: { description: 'Cualquiera de estas.' } },
    { name: 'caracteristicas', type: 'select', hasMany: true, options: CARACTERISTICAS.map((c) => ({ label: { es: c.es, en: c.en }, value: c.valor })), admin: { description: 'Todas a la vez.' } },
    { name: 'servicios', type: 'select', hasMany: true, options: SERVICIOS_VISITA.map((s) => ({ label: { es: s.es, en: s.en }, value: s.valor })), admin: { description: 'Todos a la vez.' } },
    { name: 'lugaresFijos', type: 'relationship', relationTo: 'lugares', hasMany: true, maxRows: 12, admin: { description: 'Los que van sí o sí, primero y en este orden.' } },
    {
      name: 'tours', type: 'array', maxRows: 6, labels: { singular: 'Tour', plural: 'Tours' },
      fields: [
        { name: 'zona', type: 'relationship', relationTo: 'zonas', required: true },
        {
          name: 'tour', type: 'text', required: true,
          validate: (v: unknown) => (typeof v === 'string' && esClaveDeTour(v) ? true : 'Elige un tour del catálogo.'),
          admin: { components: { Field: { path: '/admin/ToursRelacionados#ToursRelacionados', clientProps: { modo: 'uno' } } } },
        },
      ],
    },
    {
      name: 'preguntas', type: 'array', localized: true, maxRows: 8,
      fields: [
        { name: 'pregunta', type: 'text', required: true, maxLength: 120 },
        { name: 'respuesta', type: 'textarea', required: true, maxLength: 600 },
      ],
    },
    {
      name: 'lugaresQueCoinciden', type: 'text', virtual: true, access: { read: campoSoloPersonal },
      admin: { readOnly: true, position: 'sidebar', description: 'Se actualiza al guardar.' },
      hooks: { afterRead: [calcularLugaresQueCoinciden] },
    },
    ...camposDestacado(),
    camposSeo(),
  ],
}
