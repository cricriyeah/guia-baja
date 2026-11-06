import type { CollectionConfig } from 'payload'

import { lecturaPublica, soloPersonal } from '../acceso/reglas'
import { hooksDeIndice } from '../busqueda/hooks'
import { campoSlug } from '../campos/slug'
import { GRUPOS } from '../dominio/grupos'
import { hooksDeCategoria } from '../redirecciones/hooks'
import { hooksDeRevalidacion } from '../revalidacion/hooks'

export const TIPOS_SCHEMA = [
  'Restaurant', 'CafeOrCoffeeShop', 'BarOrPub', 'Store', 'TouristAttraction', 'Beach', 'LocalBusiness',
] as const

const redireccionCategoria = hooksDeCategoria()
const revalidacion = hooksDeRevalidacion('categorias')
const indice = hooksDeIndice('categoria')

export const Categorias: CollectionConfig = {
  slug: 'categorias',
  admin: { useAsTitle: 'nombre', defaultColumns: ['nombre', 'slug', 'grupo', 'aplicaA', 'orden'] },
  access: { read: lecturaPublica, create: soloPersonal, update: soloPersonal, delete: soloPersonal },
  hooks: {
    beforeChange: [redireccionCategoria.beforeChange],
    afterChange: [redireccionCategoria.afterChange, revalidacion.afterChange, indice.afterChange],
    afterDelete: [revalidacion.afterDelete, indice.afterDelete],
  },
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
    {
      name: 'grupo',
      type: 'select',
      required: true,
      options: GRUPOS.map((g) => ({ label: { es: g.es, en: g.en }, value: g.valor })),
      admin: { description: 'Decide el color de la categoría en el sitio.' },
    },
    { name: 'orden', type: 'number', defaultValue: 100 },
  ],
}
