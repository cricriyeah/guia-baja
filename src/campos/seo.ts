import type { GroupField } from 'payload'

export function camposSeo(): GroupField {
  return {
    name: 'seo',
    type: 'group',
    label: 'SEO',
    fields: [
      { name: 'metaTitulo', type: 'text', localized: true, maxLength: 70 },
      { name: 'metaDescripcion', type: 'textarea', localized: true, maxLength: 160 },
      { name: 'noIndexar', type: 'checkbox', defaultValue: false },
    ],
  }
}
