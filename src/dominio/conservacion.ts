export const CAMPOS_PERSONALES = ['contactoNombre', 'correo', 'telefono', 'webOInstagram', 'mensaje'] as const
const DIA = 24 * 60 * 60 * 1000

const haceMeses = (ahora: Date, meses: number) => {
  const d = new Date(ahora)
  d.setUTCMonth(d.getUTCMonth() - meses)
  return d
}

// Spec §12: rechazada, o sin cambio de estado en 12 meses (salvo aceptada, que la anonimiza un Admin a mano).
export function debeAnonimizar(
  s: { estado: string; estadoCambiadoEl?: string | null; createdAt: string; anonimizadaEl?: string | null },
  ahora: Date,
): boolean {
  if (s.anonimizadaEl) return false
  if (s.estado === 'rechazada') return true
  if (s.estado === 'aceptada') return false
  return new Date(s.estadoCambiadoEl ?? s.createdAt) < haceMeses(ahora, 12)
}

export const ipHashVencido = (creadaEl: string, ahora: Date): boolean => ahora.getTime() - new Date(creadaEl).getTime() > DIA
