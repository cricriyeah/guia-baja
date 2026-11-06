import type { Payload } from 'payload'

import { debeAnonimizar, haceMeses } from '../dominio/conservacion'
import { anonimizarSolicitud } from '../solicitudes/anonimizar'

// Spec §12 (diario): anonimiza las rechazadas y las que llevan 12 meses sin cambio de estado (salvo aceptadas).
// Un fallo en una fila no frena a las demás: se cuenta en `fallidas` (solo ids) y el día siguiente la reintenta.
export async function correrDiario(
  payload: Payload,
  ahora: Date,
  anonimizar: (payload: Payload, id: number) => Promise<void> = anonimizarSolicitud,
) {
  const limite = haceMeses(ahora, 12).toISOString()
  // La consulta solo acota; `debeAnonimizar` tiene la última palabra. Sin estadoCambiadoEl se cae a createdAt.
  const { docs } = await payload.find({
    collection: 'solicitudes',
    overrideAccess: true,
    pagination: false,
    depth: 0,
    select: { estado: true, estadoCambiadoEl: true, createdAt: true, anonimizadaEl: true },
    where: {
      and: [
        { anonimizadaEl: { exists: false } },
        { estado: { not_equals: 'aceptada' } },
        {
          or: [
            { estado: { equals: 'rechazada' } },
            { estadoCambiadoEl: { less_than: limite } },
            { and: [{ estadoCambiadoEl: { exists: false } }, { createdAt: { less_than: limite } }] },
          ],
        },
      ],
    },
  })
  let anonimizadas = 0
  const fallidas: number[] = []
  for (const s of docs) {
    if (!debeAnonimizar({ estado: s.estado ?? 'nueva', estadoCambiadoEl: s.estadoCambiadoEl ?? null, createdAt: s.createdAt, anonimizadaEl: s.anonimizadaEl ?? null }, ahora)) continue
    try {
      await anonimizar(payload, s.id)
      anonimizadas++
    } catch {
      fallidas.push(s.id)
    }
  }
  const resultado = { anonimizadas, fallidas }
  if (fallidas.length) payload.logger.error({ cron: 'diario', ...resultado }, 'cron diario con fallos')
  else payload.logger.info({ cron: 'diario', ...resultado }, 'cron diario')
  return resultado
}
