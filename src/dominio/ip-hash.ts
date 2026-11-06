import { createHash } from 'node:crypto'

// Spec §6: solo para el límite de envíos; se borra a las 24 h.
export const ipHash = (ip: string, sal: string): string => createHash('sha256').update(`${sal}:${ip}`).digest('hex')
