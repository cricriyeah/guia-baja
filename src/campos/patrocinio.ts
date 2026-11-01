import type { DateField, GroupField } from 'payload'

import { campoSoloPersonal } from '../acceso/reglas'

const soloDia: DateField['admin'] = { date: { pickerAppearance: 'dayOnly' } }

export function grupoPatrocinio(): GroupField {
  return {
    name: 'patrocinio',
    type: 'group',
    admin: { description: 'Vigente si está activo y desde ≤ hoy < hasta (días en hora de BCS).' },
    fields: [
      { name: 'activo', type: 'checkbox', defaultValue: false },
      { name: 'desde', type: 'date', admin: soloDia },
      {
        name: 'hasta',
        type: 'date',
        admin: soloDia,
        validate: (valor: unknown, { siblingData }: { siblingData: Record<string, unknown> }) => {
          if (!siblingData?.activo) return true
          if (!siblingData.desde || !valor) return 'Un patrocinio activo necesita «desde» y «hasta».'
          return new Date(valor as string) > new Date(siblingData.desde as string)
            ? true
            : '«Hasta» debe ser posterior a «desde».'
        },
      } as DateField,
      { name: 'notaInterna', type: 'textarea', access: { read: campoSoloPersonal } },
    ],
  }
}
