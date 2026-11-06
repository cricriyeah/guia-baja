import type { CheckboxField, CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { campoSoloAdmin, nadie, soloPersonal } from '../acceso/reglas'

// Spec §12: «sin cambio de estado en 12 meses» se mide desde aquí; una nota interna no reinicia el plazo.
const marcarCambioDeEstado: CollectionBeforeChangeHook = ({ data, operation, originalDoc }) => {
  if (operation === 'create' || (data.estado !== undefined && data.estado !== originalDoc?.estado)) {
    return { ...data, estadoCambiadoEl: new Date().toISOString() }
  }
  return data
}

// Solo se crean desde la Server Action de F3 (overrideAccess). El público nunca las lee (spec §6, §11).
export const Solicitudes: CollectionConfig = {
  slug: 'solicitudes',
  admin: { useAsTitle: 'negocio', defaultColumns: ['negocio', 'estado', 'zonaTexto', 'createdAt'] },
  access: { read: soloPersonal, create: nadie, update: soloPersonal, delete: soloPersonal },
  defaultSort: '-createdAt',
  hooks: { beforeChange: [marcarCambioDeEstado] },
  fields: [
    { name: 'negocio', type: 'text', required: true },
    { name: 'giro', type: 'text' },
    { name: 'zonaTexto', type: 'text' },
    { name: 'zona', type: 'relationship', relationTo: 'zonas' },
    { name: 'contactoNombre', type: 'text' },
    { name: 'correo', type: 'email' },
    { name: 'telefono', type: 'text' },
    { name: 'webOInstagram', type: 'text' },
    { name: 'mensaje', type: 'textarea', maxLength: 2000 },
    {
      name: 'aceptoPrivacidad',
      type: 'checkbox',
      required: true,
      validate: (v: unknown, { operation }: { operation?: string }) =>
        operation !== 'create' || v === true ? true : 'Hay que aceptar el aviso de privacidad.',
    } as CheckboxField,
    { name: 'versionAviso', type: 'text', admin: { readOnly: true } },
    { name: 'ipHash', type: 'text', admin: { hidden: true }, access: { read: campoSoloAdmin } },
    {
      name: 'estado',
      type: 'select',
      defaultValue: 'nueva',
      options: [
        { label: 'Nueva', value: 'nueva' },
        { label: 'En contacto', value: 'en-contacto' },
        { label: 'Aceptada', value: 'aceptada' },
        { label: 'Rechazada', value: 'rechazada' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'estadoCambiadoEl',
      type: 'date',
      admin: { readOnly: true, position: 'sidebar', description: 'Último cambio de estado (conservación, aviso §12).' },
    },
    { name: 'notasInternas', type: 'textarea' },
    { name: 'lugarCreado', type: 'relationship', relationTo: 'lugares' },
    { name: 'anonimizadaEl', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
  ],
}
