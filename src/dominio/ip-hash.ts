import { createHash } from 'node:crypto'

// Spec §6: solo para el límite de envíos; se borra a las 24 h.
// Sin sal, el hash de una IPv4 (unos 4.300 millones de valores) se revierte por fuerza bruta.
export const ipHash = (ip: string, sal: string): string => {
  if (!sal.trim()) throw new Error('ipHash necesita una sal no vacía')
  return createHash('sha256').update(`${sal}:${ip}`).digest('hex')
}
