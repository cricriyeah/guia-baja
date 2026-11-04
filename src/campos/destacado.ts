import type { Field } from 'payload'

// «Destacar en portada» (spec §6, Reglas comunes): la portada muestra los destacados por ordenDestacado.
export function camposDestacado(): Field[] {
  return [
    {
      name: 'destacadoEnPortada',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', description: 'Sale en los destacados de la portada de la Guía.' },
    },
    {
      name: 'ordenDestacado',
      type: 'number',
      defaultValue: 100,
      admin: { position: 'sidebar', condition: (datos) => Boolean(datos?.destacadoEnPortada) },
    },
  ]
}
