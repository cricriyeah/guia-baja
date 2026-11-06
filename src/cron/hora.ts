import type { Payload } from 'payload'

import { etiquetasDeCambio } from '../dominio/etiquetas'
import { cayoEnVentana, instantesDeCambio } from '../dominio/ventana'

const DIA = 24 * 60 * 60 * 1000

// Spec §10 (cada hora, minuto 5): la cola de Payload (publicación programada) y la ventana de fechas.
// Además borra los ipHash de más de 24 h (spec §12; a la hora para no pasarse del plazo).
export async function correrHora(payload: Payload, ahora: Date, revalidar: (etiquetas: string[]) => void) {
  await payload.jobs.run({ limit: 100 }) // por defecto corre 10: no dejar publicaciones para la hora siguiente
  const etiquetas = new Set<string>()
  for (const coleccion of ['lugares', 'eventos'] as const) {
    const { docs } = await payload.find({ collection: coleccion, overrideAccess: true, pagination: false, depth: 0 })
    for (const d of docs) {
      if (instantesDeCambio(d as never).some((i) => cayoEnVentana(i, ahora))) {
        etiquetasDeCambio(coleccion, d as never, null).forEach((t) => etiquetas.add(t))
      }
    }
  }
  if (etiquetas.size) revalidar([...etiquetas])
  const { docs: viejas } = await payload.update({
    collection: 'solicitudes',
    overrideAccess: true,
    context: { disableRevalidate: true },
    where: { and: [{ ipHash: { exists: true } }, { createdAt: { less_than: new Date(ahora.getTime() - DIA).toISOString() } }] },
    data: { ipHash: null },
  })
  return { revalidadas: etiquetas.size, ipBorrados: viejas.length }
}
