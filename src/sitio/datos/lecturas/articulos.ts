import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import { idDe, idsEnCuerpo } from '../../../dominio/lexical'
import { articuloDe, fichaArticuloDe } from '../mapeo'
import type { FichaArticulo, TarjetaArticulo } from '../tipos'
import { mediaPorIds } from './media'
import { opcionesPublicas } from './publico'

// depth 1: la tarjeta lee la portada de un documento poblado.
export async function articulosPublicados(payload: Payload, lang: Locale): Promise<TarjetaArticulo[]> {
  const { docs } = await payload.find({ collection: 'articulos', ...opcionesPublicas(lang), depth: 1, sort: '-publicadoEl', pagination: false })
  return docs.map((d) => articuloDe(d, lang)).filter((x): x is TarjetaArticulo => x !== null)
}

export async function fichaArticulo(payload: Payload, id: number, lang: Locale): Promise<FichaArticulo | null> {
  const { docs } = await payload.find({ collection: 'articulos', ...opcionesPublicas(lang), where: { id: { equals: id } }, depth: 0, limit: 1 })
  const doc = docs[0]
  if (!doc) return null
  const portada = idDe(doc.portada)
  const media = await mediaPorIds(payload, [...(portada === null ? [] : [portada]), ...idsEnCuerpo(doc.cuerpo).media], lang)
  return fichaArticuloDe(doc, lang, media)
}
