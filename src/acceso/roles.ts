export const ROLES = ['admin', 'editor'] as const
export type Rol = (typeof ROLES)[number]

type ConRol = { rol?: string | null } | null | undefined

export const esAdmin = (u: ConRol): boolean => u?.rol === 'admin'
export const esPersonal = (u: ConRol): boolean => u?.rol === 'admin' || u?.rol === 'editor'
