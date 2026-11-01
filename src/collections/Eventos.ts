import type { CollectionConfig, DateField, TextField } from 'payload'

import { lecturaPublicaPublicada, soloPersonal } from '../acceso/reglas'
import { grupoPatrocinio } from '../campos/patrocinio'
import { camposSeo } from '../campos/seo'
import { campoSlug } from '../campos/slug'

export const CAMPOS_IDIOMA_EVENTO = ['nombre', 'slug', 'resumen', 'cuerpo'] as const
export const CAMPOS_LOCALIZADOS_EVENTO = ['nombre', 'slug', 'resumen', 'cuerpo', 'precio'] as const

const fechaHora: DateField['admin'] = { date: { pickerAppearance: 'dayAndTime' } }

export const Eventos: CollectionConfig = {
  slug: 'eventos',
  admin: { useAsTitle: 'nombre', defaultColumns: ['nombre', 'inicio', 'zona', '_status'] },
  versions: { drafts: true, maxPerDoc: 50 },
  access: {
    read: lecturaPublicaPublicada,
    readVersions: soloPersonal,
    create: soloPersonal,
    update: soloPersonal,
    delete: soloPersonal,
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
    camposSeo(),
  ],
}
