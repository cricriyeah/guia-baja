import type { Payload } from 'payload'

import { debeAnonimizar } from '../dominio/conservacion'
import { anonimizarSolicitud } from '../solicitudes/anonimizar'

// Spec §12 (diario): anonimiza las rechazadas y las que llevan 12 meses sin cambio de estado (salvo aceptadas).
export async function correrDiario(payload: Payload, ahora: Date) {
  const { docs } = await payload.find({
    collection: 'solicitudes',
    overrideAccess: true,
    pagination: false,
    depth: 0,
    where: { anonimizadaEl: { exists: false } },
  })
  let anonimizadas = 0
  for (const s of docs) {
    if (debeAnonimizar({ estado: s.estado ?? 'nueva', estadoCambiadoEl: s.estadoCambiadoEl ?? null, createdAt: s.createdAt, anonimizadaEl: s.anonimizadaEl ?? null }, ahora)) {
      await anonimizarSolicitud(payload, s.id)
      anonimizadas++
    }
  }
  return { anonimizadas }
}
