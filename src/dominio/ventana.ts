import { inicioDelDiaGuardado } from './fechas'

type ConFechas = {
  patrocinio?: { desde?: string | null; hasta?: string | null } | null
  inicio?: string | null
  fin?: string | null
}

// Spec §10: instantes en que un lugar o evento cambia de estado con el tiempo. Patrocinio: días de BCS.
export function instantesDeCambio(doc: ConFechas): Date[] {
  const p = doc.patrocinio ?? {}
  return [
    p.desde ? inicioDelDiaGuardado(p.desde) : null,
    p.hasta ? inicioDelDiaGuardado(p.hasta) : null,
    doc.inicio ? new Date(doc.inicio) : null,
    doc.fin ? new Date(doc.fin) : null,
  ].filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()))
}

// La ventana (65 min) se traslapa a propósito con la del cron anterior; revalidar dos veces no hace daño.
export const cayoEnVentana = (instante: Date, ahora: Date, minutos = 65): boolean =>
  instante.getTime() <= ahora.getTime() && instante.getTime() >= ahora.getTime() - minutos * 60_000
