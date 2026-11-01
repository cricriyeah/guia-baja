import type { FieldHook, TextField } from 'payload'

import { esSlugValido, slugify } from '../dominio/slugs'

type Opciones = {
  desde: string
  localizado: boolean
  validarExtra?: (slug: string) => string | true
}

export function campoSlug({ desde, localizado, validarExtra }: Opciones): TextField {
  const generar: FieldHook = ({ value, siblingData, originalDoc }) => {
    if (typeof value === 'string' && value.trim() !== '') return slugify(value)
    // En actualizaciones parciales el origen puede no venir en la petición: se usa el valor ya guardado.
    const origen = siblingData?.[desde] ?? originalDoc?.[desde]
    return typeof origen === 'string' && origen.trim() !== '' ? slugify(origen) : value
  }

  return {
    name: 'slug',
    type: 'text',
    localized: localizado,
    unique: true,
    index: true,
    admin: { position: 'sidebar', description: 'Se genera del nombre; minúsculas sin acentos, con guiones.' },
    hooks: { beforeValidate: [generar] },
    validate: (valor: unknown) => {
      if (valor === null || valor === undefined || valor === '') return true
      if (typeof valor !== 'string' || !esSlugValido(valor)) return 'Slug inválido: minúsculas, números y guiones.'
      return validarExtra ? validarExtra(valor) : true
    },
  } as TextField
}
