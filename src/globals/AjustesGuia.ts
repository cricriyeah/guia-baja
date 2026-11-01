import type { GlobalConfig } from 'payload'

import { campoSoloPersonal, lecturaPublica, soloAdmin } from '../acceso/reglas'

export const AjustesGuia: GlobalConfig = {
  slug: 'ajustes-guia',
  label: 'Ajustes de la guía',
  access: { read: lecturaPublica, update: soloAdmin },
  fields: [
    {
      name: 'correosAviso',
      type: 'array',
      access: { read: campoSoloPersonal },
      fields: [{ name: 'correo', type: 'email', required: true }],
    },
    { name: 'correoPrivacidad', type: 'email', access: { read: campoSoloPersonal } },
    {
      name: 'formularioActivo',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Encender solo cuando el aviso de privacidad esté publicado en los dos idiomas.' },
    },
    { name: 'versionAviso', type: 'text', admin: { description: 'Versión vigente del aviso (p. ej. 2026-11).' } },
    { name: 'portadaTitulo', type: 'text', localized: true },
    { name: 'portadaIntro', type: 'textarea', localized: true },
  ],
}
