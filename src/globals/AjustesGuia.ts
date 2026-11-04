import type { GlobalConfig } from 'payload'

import { campoSoloPersonal, lecturaPublica, soloAdmin } from '../acceso/reglas'
import { revalidarAjustes } from '../revalidacion/hooks'

export const AjustesGuia: GlobalConfig = {
  slug: 'ajustes-guia',
  label: 'Ajustes de la guía',
  access: { read: lecturaPublica, update: soloAdmin },
  hooks: { afterChange: [revalidarAjustes] },
  fields: [
    {
      name: 'correosAviso',
      type: 'array',
      access: { read: campoSoloPersonal },
      fields: [{ name: 'correo', type: 'email', required: true }],
    },
    // Público: el aviso de privacidad lo muestra para los derechos ARCO (spec §12).
    { name: 'correoPrivacidad', type: 'email' },
    {
      name: 'formularioActivo',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Encender solo cuando el aviso de privacidad esté publicado en los dos idiomas.' },
    },
    { name: 'versionAviso', type: 'text', admin: { description: 'Versión vigente del aviso (p. ej. 2026-11).' } },
    {
      name: 'avisoVigenteDesde',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' }, description: 'Desde cuándo rige la versión vigente del aviso.' },
    },
    {
      name: 'avisoPrivacidad',
      type: 'richText',
      localized: true,
      admin: { description: 'Texto del aviso de privacidad de la Guía. Al cambiarlo, sube la versión.' },
    },
    { name: 'portadaTitulo', type: 'text', localized: true },
    { name: 'portadaIntro', type: 'textarea', localized: true },
  ],
}
