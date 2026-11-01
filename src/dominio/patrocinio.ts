import { inicioDelDiaMazatlan } from './fechas'

export type Patrocinio = {
  activo?: boolean | null
  desde?: string | Date | null
  hasta?: string | Date | null
}

// Vigente: sube en el orden de los listados (spec §6, §7).
export function patrocinioVigente(p: Patrocinio | null | undefined, ahora: Date = new Date()): boolean {
  if (!p?.activo || !p.desde || !p.hasta) return false
  return inicioDelDiaMazatlan(p.desde) <= ahora && ahora < inicioDelDiaMazatlan(p.hasta)
}

// Declarado: lleva etiqueta y rel="sponsored". Empieza antes de desde para que la caché nunca lo muestre sin declarar.
export function patrocinioDeclarado(p: Patrocinio | null | undefined, ahora: Date = new Date()): boolean {
  if (!p?.activo || !p.hasta) return false
  return ahora < inicioDelDiaMazatlan(p.hasta)
}
