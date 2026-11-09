import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { ValidationError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { lecturaPublicaPublicada, soloPersonal } from '../acceso/reglas'
import { bloquesArticulo } from '../bloques/articulo'
import { hooksDeIndice } from '../busqueda/hooks'
import { camposDestacado } from '../campos/destacado'
import { camposSeo } from '../campos/seo'
import { campoSlug } from '../campos/slug'
import { CAMPOS_IDIOMA, CAMPOS_LOCALIZADOS } from '../dominio/idioma'
import { idDe } from '../dominio/lexical'
import { paradasValidas } from '../dominio/itinerarios'
import { esClaveDeTour } from '../dominio/presencia'
import { rutas } from '../dominio/rutas'
import { copiarNombreAutor, crearLlenarLugaresCitados, fechasDePublicacion } from '../hooks/articulos'
import { destinoAlRetirarPlan, hooksDeRedireccion } from '../redirecciones/hooks'
import { hooksDeRevalidacion } from '../revalidacion/hooks'

const revalidacion = hooksDeRevalidacion('itinerarios')
const indice = hooksDeIndice('itinerario')
const redireccion = hooksDeRedireccion({
  coleccion: 'itinerarios',
  camposIdioma: CAMPOS_IDIOMA.itinerarios,
  camposLocalizados: CAMPOS_LOCALIZADOS.itinerarios,
  rutaDe: rutas.itinerario,
  destinoAlRetirar: destinoAlRetirarPlan,
})

const llenarCitados = crearLlenarLugaresCitados({
  coleccion: 'itinerarios',
  extra: (d) => ((d.dias ?? []) as { paradas?: { lugar?: unknown }[] }[])
    .flatMap((x) => x.paradas ?? [])
    .map((p) => idDe(p.lugar))
    .filter((x): x is number => x !== null),
})

const validarParadas: CollectionBeforeValidateHook = ({ data, req }) => {
  const r = paradasValidas(data?.dias, req.locale)
  if (r !== true) throw new ValidationError({ collection: 'itinerarios', errors: [{ path: 'dias', message: r }] })
  return data
}

export const Itinerarios: CollectionConfig = {
  slug: 'itinerarios',
  labels: { singular: 'Itinerario', plural: 'Itinerarios' },
  admin: { useAsTitle: 'titulo', defaultColumns: ['titulo', 'zona', '_status', 'publicadoEl'] },
  versions: { drafts: { schedulePublish: true }, maxPerDoc: 50 },
  access: { read: lecturaPublicaPublicada, readVersions: soloPersonal, create: soloPersonal, update: soloPersonal, delete: soloPersonal },
  hooks: {
    beforeValidate: [validarParadas],
    beforeChange: [copiarNombreAutor, fechasDePublicacion, llenarCitados, redireccion.beforeChange],
    afterChange: [redireccion.afterChange, revalidacion.afterChange, indice.afterChange],
    beforeDelete: [redireccion.beforeDelete],
    afterDelete: [redireccion.afterDelete, revalidacion.afterDelete, indice.afterDelete],
  },
  defaultSort: '-publicadoEl',
  fields: [
    { name: 'titulo', type: 'text', localized: true, required: true },
    campoSlug({ desde: 'titulo', localizado: true }),
    { name: 'zona', type: 'relationship', relationTo: 'zonas', required: true, index: true },
    { name: 'resumen', type: 'textarea', localized: true, maxLength: 160 },
    { name: 'portada', type: 'upload', relationTo: 'media' },
    { name: 'autor', type: 'relationship', relationTo: 'users', required: true, defaultValue: ({ user }: { user?: { id: number } | null }) => user?.id },
    { name: 'autorNombre', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'publicadoEl', type: 'date', admin: { position: 'sidebar' } },
    { name: 'actualizadoEl', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'cuerpo', type: 'richText', localized: true,
      editor: lexicalEditor({ features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: bloquesArticulo })] }),
    },
    {
      name: 'dias', type: 'array', minRows: 1, maxRows: 7, required: true, labels: { singular: 'Día', plural: 'Días' },
      fields: [
        { name: 'titulo', type: 'text', localized: true },
        {
          name: 'paradas', type: 'array', minRows: 1, maxRows: 8, required: true, labels: { singular: 'Parada', plural: 'Paradas' },
          fields: [
            { name: 'hora', type: 'text', validate: (v: unknown) => (!v || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v)) ? true : 'Usa el formato HH:MM.') },
            { name: 'lugar', type: 'relationship', relationTo: 'lugares' },
            {
              name: 'tour', type: 'text',
              validate: (v: unknown) => (!v || (typeof v === 'string' && esClaveDeTour(v)) ? true : 'Elige un tour del catálogo.'),
              admin: { components: { Field: { path: '/admin/ToursRelacionados#ToursRelacionados', clientProps: { modo: 'uno', rutaZona: 'zona' } } } },
            },
            { name: 'nota', type: 'textarea', localized: true, maxLength: 400 },
          ],
        },
      ],
    },
    { name: 'lugaresCitados', type: 'relationship', relationTo: 'lugares', hasMany: true, admin: { hidden: true } },
    {
      name: 'preguntas', type: 'array', localized: true, maxRows: 8,
      fields: [
        { name: 'pregunta', type: 'text', required: true, maxLength: 120 },
        { name: 'respuesta', type: 'textarea', required: true, maxLength: 600 },
      ],
    },
    ...camposDestacado(),
    camposSeo(),
  ],
}
