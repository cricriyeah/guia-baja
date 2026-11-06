import type { Payload } from 'payload'

import { etiquetasDeCambio } from '../dominio/etiquetas'
import { cayoEnVentana, instantesDeCambio } from '../dominio/ventana'

const DIA = 24 * 60 * 60 * 1000

// Spec §10 (cada hora, minuto 5): la cola de Payload (publicación programada) y la ventana de fechas.
// Además borra los ipHash de más de 24 h (spec §12; a la hora para no pasarse del plazo).
// Cada paso va aislado: Vercel no reintenta, así que un fallo antes no puede saltarse la purga del ipHash.
// Los fallos se reportan por nombre de paso o por id; nunca con el mensaje del error (puede traer datos personales).
export async function correrHora(payload: Payload, ahora: Date, revalidar: (etiquetas: string[]) => void) {
  const fallos: string[] = []

  try {
    // Por defecto corre 10: no dejar publicaciones para la hora siguiente.
    const { jobStatus } = await payload.jobs.run({ limit: 100 })
    // jobs.run no lanza si un job falla: lo devuelve en su estado.
    for (const [id, { status }] of Object.entries(jobStatus ?? {})) if (status !== 'success') fallos.push(`job:${id}`)
  } catch {
    fallos.push('jobs')
  }

  const etiquetas = new Set<string>()
  for (const coleccion of ['lugares', 'eventos'] as const) {
    try {
      const { docs } = await payload.find({ collection: coleccion, overrideAccess: true, pagination: false, depth: 0 })
      for (const d of docs) {
        if (instantesDeCambio(d as never).some((i) => cayoEnVentana(i, ahora))) {
          etiquetasDeCambio(coleccion, d as never, null).forEach((t) => etiquetas.add(t))
        }
      }
    } catch {
      fallos.push(`lectura:${coleccion}`)
    }
  }
  // Una etiqueta por llamada: si una falla, las demás se revalidan igual.
  for (const t of etiquetas) {
    try {
      revalidar([t])
    } catch {
      fallos.push(`revalidar:${t}`)
    }
  }

  let ipBorrados = 0
  let ipFallidos: Array<number | string> = []
  try {
    const { docs, errors } = await payload.update({
      collection: 'solicitudes',
      overrideAccess: true,
      context: { disableRevalidate: true },
      where: { and: [{ ipHash: { exists: true } }, { createdAt: { less_than: new Date(ahora.getTime() - DIA).toISOString() } }] },
      data: { ipHash: null },
    })
    ipBorrados = docs.length
    ipFallidos = errors.map((e) => e.id)
    if (ipFallidos.length) fallos.push('ipHash')
  } catch {
    fallos.push('ipHash')
  }

  const resultado = { revalidadas: etiquetas.size, ipBorrados, ipFallidos, fallos }
  if (fallos.length) payload.logger.error({ cron: 'hora', ...resultado }, 'cron hora con fallos')
  else payload.logger.info({ cron: 'hora', ...resultado }, 'cron hora')
  return resultado
}
