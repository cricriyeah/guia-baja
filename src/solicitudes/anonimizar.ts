import type { Payload } from 'payload'

import { CAMPOS_PERSONALES } from '../dominio/conservacion'

// Única forma de anonimizar (cron diario y acción del Admin). Spec §12: quedan negocio, giro, zona, estado y fechas.
// Idempotente: una solicitud ya anonimizada se deja como está (conserva su anonimizadaEl original).
export async function anonimizarSolicitud(payload: Payload, id: number): Promise<void> {
  const actual = await payload.findByID({ collection: 'solicitudes', id, overrideAccess: true, depth: 0 })
  if (actual.anonimizadaEl) return
  const vacios = Object.fromEntries(CAMPOS_PERSONALES.map((c) => [c, null]))
  await payload.update({
    collection: 'solicitudes',
    id,
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: { ...vacios, ipHash: null, anonimizadaEl: new Date().toISOString() },
  })
}
