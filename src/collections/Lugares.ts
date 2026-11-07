import type { CollectionConfig, TextField } from 'payload'

import { lecturaPublicaPublicada, soloPersonal } from '../acceso/reglas'
import { hooksDeIndice } from '../busqueda/hooks'
import { camposDestacado } from '../campos/destacado'
import { grupoPatrocinio } from '../campos/patrocinio'
import { camposSeo } from '../campos/seo'
import { campoSlug } from '../campos/slug'
import { CARACTERISTICAS } from '../dominio/caracteristicas'
import { CAMPOS_IDIOMA, CAMPOS_LOCALIZADOS } from '../dominio/idioma'
import { MAX_TOURS_RELACIONADOS, validarToursRelacionados } from '../dominio/presencia'
import { rutas } from '../dominio/rutas'
import { destinoAlRetirarLugar, hooksDeRedireccion } from '../redirecciones/hooks'
import { hooksDeRevalidacion } from '../revalidacion/hooks'

export const CAMPOS_IDIOMA_LUGAR = CAMPOS_IDIOMA.lugares
export const CAMPOS_LOCALIZADOS_LUGAR = CAMPOS_LOCALIZADOS.lugares

const revalidacion = hooksDeRevalidacion('lugares')
const indice = hooksDeIndice('lugar')

const redireccion = hooksDeRedireccion({
  coleccion: 'lugares',
  camposIdioma: CAMPOS_IDIOMA_LUGAR,
  camposLocalizados: CAMPOS_LOCALIZADOS_LUGAR,
  rutaDe: rutas.lugar,
  destinoAlRetirar: destinoAlRetirarLugar,
})

const DIAS = [
  { label: 'Lunes', value: 'lunes' },
  { label: 'Martes', value: 'martes' },
  { label: 'Miércoles', value: 'miercoles' },
  { label: 'Jueves', value: 'jueves' },
  { label: 'Viernes', value: 'viernes' },
  { label: 'Sábado', value: 'sabado' },
  { label: 'Domingo', value: 'domingo' },
]

const hora = (name: string): TextField =>
  ({
    name,
    type: 'text',
    required: true,
    admin: { placeholder: '09:00', width: '50%' },
    validate: (v: unknown) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? true : 'Formato HH:MM.'),
  }) as TextField

export const Lugares: CollectionConfig = {
  slug: 'lugares',
  admin: { useAsTitle: 'nombre', defaultColumns: ['nombre', 'zona', '_status', 'updatedAt'] },
  versions: { drafts: { schedulePublish: true }, maxPerDoc: 50 },
  access: {
    read: lecturaPublicaPublicada,
    readVersions: soloPersonal,
    create: soloPersonal,
    update: soloPersonal,
    delete: soloPersonal,
  },
  hooks: {
    beforeChange: [redireccion.beforeChange],
    afterChange: [redireccion.afterChange, revalidacion.afterChange, indice.afterChange],
    beforeDelete: [redireccion.beforeDelete],
    afterDelete: [redireccion.afterDelete, revalidacion.afterDelete, indice.afterDelete],
  },
  defaultSort: 'orden',
  fields: [
    { name: 'nombre', type: 'text', required: true },
    campoSlug({ desde: 'nombre', localizado: true }),
    { name: 'zona', type: 'relationship', relationTo: 'zonas', required: true, index: true },
    {
      name: 'categorias',
      type: 'relationship',
      relationTo: 'categorias',
      hasMany: true,
      required: true,
      minRows: 1,
      admin: { description: 'La primera es la principal: decide el tipo de schema.org.' },
      filterOptions: { aplicaA: { in: ['lugar', 'ambos'] } },
    },
    { name: 'resumen', type: 'textarea', localized: true, maxLength: 160 },
    { name: 'cuerpo', type: 'richText', localized: true },
    { name: 'fotos', type: 'upload', relationTo: 'media', hasMany: true, required: true, minRows: 1 },
    { name: 'direccion', type: 'text' },
    { name: 'coordenadas', type: 'point' },
    { name: 'telefono', type: 'text' },
    { name: 'whatsapp', type: 'text' },
    { name: 'web', type: 'text' },
    { name: 'instagram', type: 'text' },
    {
      name: 'rangoPrecio',
      type: 'select',
      options: ['$', '$$', '$$$', '$$$$'].map((v) => ({ label: v, value: v })),
    },
    {
      name: 'horario',
      type: 'array',
      fields: [
        { name: 'dia', type: 'select', required: true, options: DIAS },
        { type: 'row', fields: [hora('abre'), hora('cierra')] },
      ],
    },
    { name: 'notaHorario', type: 'text', localized: true },
    {
      name: 'caracteristicas',
      type: 'select',
      hasMany: true,
      options: CARACTERISTICAS.map((c) => ({ label: { es: c.es, en: c.en }, value: c.valor })),
    },
    {
      // Spec de presencia §2.1: claves del catálogo (servicio:slug o paquete:slug), hasta 3. El sitio ignora las viejas.
      name: 'toursRelacionados',
      type: 'text',
      hasMany: true,
      maxRows: MAX_TOURS_RELACIONADOS,
      validate: (v: unknown) => validarToursRelacionados(v),
      admin: {
        description: 'Tours del sitio de reservas que llevan a este lugar. Salen en la ficha, con su precio del catálogo.',
        components: { Field: '/admin/ToursRelacionados#ToursRelacionados' },
      },
    },
    { name: 'orden', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
    ...camposDestacado(),
    grupoPatrocinio(),
    camposSeo(),
  ],
}
