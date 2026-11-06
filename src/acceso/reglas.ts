import type { Access, FieldAccess, PayloadRequest } from 'payload'

import { esAdmin, esPersonal } from './roles'

// Acceso negado por defecto (spec §11): cada colección elige explícitamente una de estas reglas.
export const nadie: Access = () => false
export const soloPersonal: Access = ({ req }) => esPersonal(req.user)
export const soloAdmin: Access = ({ req }) => esAdmin(req.user)
export const lecturaPublica: Access = () => true

// Entrada al panel de administración (`access.admin`): solo personal.
export const accesoAlPanel = ({ req }: { req: PayloadRequest }): boolean => esPersonal(req.user)

// Público: solo documentos publicados. Personal: todo, incluidos borradores.
export const lecturaPublicaPublicada: Access = ({ req }) =>
  esPersonal(req.user) ? true : { _status: { equals: 'published' } }

// Zonas no tienen borradores: «publicada» = activa.
export const zonasPublicas: Access = ({ req }) => (esPersonal(req.user) ? true : { activa: { equals: true } })

export const adminOEsUnoMismo: Access = ({ req }) => {
  if (esAdmin(req.user)) return true
  if (req.user) return { id: { equals: req.user.id } }
  return false
}

export const campoSoloAdmin: FieldAccess = ({ req }) => esAdmin(req.user)
export const campoSoloPersonal: FieldAccess = ({ req }) => esPersonal(req.user)
// Campos que solo escribe el servidor con overrideAccess (p. ej. anonimizadaEl, spec §12).
export const campoNadie: FieldAccess = () => false
