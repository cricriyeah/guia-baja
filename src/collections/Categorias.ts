import type { CollectionConfig } from 'payload'

import { lecturaPublica, soloPersonal } from '../acceso/reglas'
import { campoSlug } from '../campos/slug'
import { hooksDeCategoria } from '../redirecciones/hooks'

export const TIPOS_SCHEMA = [
  'Restaurant', 'CafeOrCoffeeShop', 'BarOrPub', 'Store', 'TouristAttraction', 'Beach', 'LocalBusiness',
] as const

const redireccionCategoria = hooksDeCategoria()

export const Categorias: CollectionConfig = {
  slug: 'categorias',
  admin: { useAsTitle: 'nombre', defaultColumns: ['nombre', 'slug', 'aplicaA', 'orden'] },
  access: { read: lecturaPublica, create: soloPersonal, update: soloPersonal, delete: soloPersonal },
  hooks: { beforeChange: [redireccionCategoria.beforeChange], afterChange: [redireccionCategoria.afterChange] },
  defaultSort: 'orden',
  fields: [
    { name: 'nombre', type: 'text', localized: true, required: true },
    campoSlug({ desde: 'nombre', localizado: true }),
    {
      name: 'aplicaA',
      type: 'select',
      required: true,
      defaultValue: 'lugar',
      options: [
        { label: 'Lugares', value: 'lugar' },
        { label: 'Eventos', value: 'evento' },
        { label: 'Ambos', value: 'ambos' },
      ],
    },
    {
      name: 'tipoSchema',
      type: 'select',
      required: true,
      defaultValue: 'LocalBusiness',
      options: TIPOS_SCHEMA.map((t) => ({ label: t, value: t })),
    },
    { name: 'orden', type: 'number', defaultValue: 100 },
  ],
}
