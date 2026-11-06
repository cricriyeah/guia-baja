import type { CollectionConfig, DateField, TextField } from 'payload'

import { lecturaPublicaPublicada, soloPersonal } from '../acceso/reglas'
import { hooksDeIndice } from '../busqueda/hooks'
import { camposDestacado } from '../campos/destacado'
import { grupoPatrocinio } from '../campos/patrocinio'
import { camposSeo } from '../campos/seo'
import { campoSlug } from '../campos/slug'
import { CAMPOS_IDIOMA, CAMPOS_LOCALIZADOS } from '../dominio/idioma'
import { rutas } from '../dominio/rutas'
import { destinoAlRetirarEvento, hooksDeRedireccion } from '../redirecciones/hooks'
import { hooksDeRevalidacion } from '../revalidacion/hooks'

export const CAMPOS_IDIOMA_EVENTO = CAMPOS_IDIOMA.eventos
export const CAMPOS_LOCALIZADOS_EVENTO = CAMPOS_LOCALIZADOS.eventos

const revalidacion = hooksDeRevalidacion('eventos')
const indice = hooksDeIndice('evento')

const redireccion = hooksDeRedireccion({
  coleccion: 'eventos',
  camposIdioma: CAMPOS_IDIOMA_EVENTO,
  camposLocalizados: CAMPOS_LOCALIZADOS_EVENTO,
  rutaDe: rutas.evento,
  destinoAlRetirar: destinoAlRetirarEvento,
})

const fechaHora: DateField['admin'] = { date: { pickerAppearance: 'dayAndTime' } }

export const Eventos: CollectionConfig = {
  slug: 'eventos',
  admin: { useAsTitle: 'nombre', defaultColumns: ['nombre', 'inicio', 'zona', '_status'] },
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
  defaultSort: 'inicio',
  fields: [
    { name: 'nombre', type: 'text', localized: true, required: true },
    campoSlug({ desde: 'nombre', localizado: true }),
    { name: 'zona', type: 'relationship', relationTo: 'zonas', required: true, index: true },
    { name: 'lugar', type: 'relationship', relationTo: 'lugares' },
    {
      name: 'direccionLibre',
      type: 'text',
      validate: (v: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        siblingData?.lugar || (typeof v === 'string' && v.trim() !== '') ? true : 'Indica un lugar o una dirección.',
    } as TextField,
    {
      name: 'categorias',
      type: 'relationship',
      relationTo: 'categorias',
      hasMany: true,
      required: true,
      minRows: 1,
      admin: { description: 'La primera da la etiqueta y el color del evento.' },
      filterOptions: { aplicaA: { in: ['evento', 'ambos'] } },
    },
    { name: 'inicio', type: 'date', required: true, index: true, timezone: true, admin: fechaHora },
    {
      name: 'fin',
      type: 'date',
      timezone: true,
      admin: fechaHora,
      validate: (v: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        !v || !siblingData?.inicio || new Date(v as string) > new Date(siblingData.inicio as string)
          ? true
          : 'El fin debe ser posterior al inicio.',
    } as DateField,
    { name: 'precio', type: 'text', localized: true },
    { name: 'gratis', type: 'checkbox', defaultValue: false },
    { name: 'urlBoletos', type: 'text' },
    { name: 'fotos', type: 'upload', relationTo: 'media', hasMany: true, required: true, minRows: 1 },
    { name: 'resumen', type: 'textarea', localized: true, maxLength: 160 },
    { name: 'cuerpo', type: 'richText', localized: true },
    grupoPatrocinio(),
    ...camposDestacado(),
    camposSeo(),
  ],
}
