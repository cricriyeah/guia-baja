import type { CollectionConfig } from 'payload'

import { lecturaPublica, soloPersonal } from '../acceso/reglas'

// Introducción de la página «Categoría en zona» (spec §6 y §7). Un registro por par zona × categoría.
export const TextosZonaCategoria: CollectionConfig = {
  slug: 'textos-zona-categoria',
  labels: { singular: 'Texto de zona × categoría', plural: 'Textos de zona × categoría' },
  admin: { defaultColumns: ['zona', 'categoria', 'updatedAt'] },
  access: { read: lecturaPublica, create: soloPersonal, update: soloPersonal, delete: soloPersonal },
  indexes: [{ fields: ['zona', 'categoria'], unique: true }],
  fields: [
    { name: 'zona', type: 'relationship', relationTo: 'zonas', required: true },
    {
      name: 'categoria',
      type: 'relationship',
      relationTo: 'categorias',
      required: true,
      filterOptions: { aplicaA: { in: ['lugar', 'ambos'] } },
    },
    { name: 'introduccion', type: 'textarea', localized: true, required: true },
  ],
}
