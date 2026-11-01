import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
} from 'payload'

import { accesoAlPanel, adminOEsUnoMismo, campoSoloAdmin, soloAdmin, soloPersonal } from '../acceso/reglas'
import { ROLES } from '../acceso/roles'

const LARGO_MINIMO = 12

function exigirLargoMinimo(password: unknown): void {
  if (typeof password === 'string' && password.length < LARGO_MINIMO) {
    throw new APIError(`La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.`, 400, undefined, true)
  }
}

const validarContrasena: CollectionBeforeValidateHook = ({ data }) => {
  exigirLargoMinimo((data as { password?: unknown } | undefined)?.password)
  return data
}

// `resetPassword` corre `beforeValidate` con el documento del usuario (sin `password`), así que la regla
// no se aplicaría ahí: se exige antes, sobre los datos de la operación.
const validarContrasenaAlRestablecer: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation !== 'resetPassword') return
  exigirLargoMinimo((args as { data?: { password?: unknown } }).data?.password)
}

// El primer usuario del sistema es admin. Se escribe directo en la base para no depender del acceso por campo.
const primerUsuarioAdmin: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create' || doc.rol === 'admin') return doc
  const { totalDocs } = await req.payload.db.count({ collection: 'users', req })
  if (totalDocs !== 1) return doc
  await req.payload.db.updateOne({ collection: 'users', id: doc.id, data: { rol: 'admin' }, req })
  return { ...doc, rol: 'admin' }
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'nombrePublico', defaultColumns: ['nombrePublico', 'email', 'rol'] },
  auth: { maxLoginAttempts: 5, lockTime: 10 * 60 * 1000 },
  access: {
    admin: accesoAlPanel,
    read: soloPersonal,
    create: soloAdmin,
    update: adminOEsUnoMismo,
    delete: soloAdmin,
  },
  hooks: {
    beforeOperation: [validarContrasenaAlRestablecer],
    beforeValidate: [validarContrasena],
    afterChange: [primerUsuarioAdmin],
  },
  fields: [
    { name: 'nombrePublico', type: 'text', required: true },
    {
      name: 'rol',
      type: 'select',
      defaultValue: 'editor',
      saveToJWT: true,
      options: ROLES.map((r) => ({ label: r === 'admin' ? 'Admin' : 'Editor', value: r })),
      access: { create: campoSoloAdmin, update: campoSoloAdmin },
    },
  ],
}
