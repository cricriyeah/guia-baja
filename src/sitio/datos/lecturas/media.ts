import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import { imagenDe } from '../mapeo'
import type { Imagen } from '../tipos'

// Una sola lectura de Media para las fotos y los «upload» de un cuerpo (cuerpos con depth 0, plan F3b).
// No usa `opcionesPublicas`: Media no tiene versiones ni borradores y su `alt` es un grupo no localizado,
// así que `locale`, `fallbackLocale` y `draft` no aplican (el idioma se elige en `imagenDe`). Sí lee con
// `overrideAccess: false`, como todo lo público.
export async function mediaPorIds(payload: Payload, ids: number[], lang: Locale): Promise<Record<string, Imagen>> {
  if (!ids.length) return {}
  const { docs } = await payload.find({ collection: 'media', where: { id: { in: ids } }, overrideAccess: false, depth: 0, pagination: false })
  const mapa: Record<string, Imagen> = {}
  for (const m of docs) {
    const img = imagenDe(m, lang)
    if (img) mapa[String(m.id)] = img
  }
  return mapa
}
