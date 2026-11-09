import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import { idDe, idsEnCuerpo } from '../../../dominio/lexical'
import { fichaItinerarioDe, itinerarioDe } from '../mapeo'
import type { FichaItinerario, TarjetaItinerario } from '../tipos'
import { mediaPorIds } from './media'
import { opcionesPublicas } from './publico'

export async function itinerariosPublicados(payload: Payload, lang: Locale): Promise<TarjetaItinerario[]> {
  const { docs } = await payload.find({ collection: 'itinerarios', ...opcionesPublicas(lang), depth: 1, sort: '-publicadoEl', pagination: false })
  return docs.map((d) => itinerarioDe(d, lang)).filter((x): x is TarjetaItinerario => x !== null)
}

export async function fichaItinerario(payload: Payload, id: number, lang: Locale): Promise<FichaItinerario | null> {
  const { docs } = await payload.find({ collection: 'itinerarios', ...opcionesPublicas(lang), where: { id: { equals: id } }, depth: 1, limit: 1 })
  const doc = docs[0]
  if (!doc) return null
  const portada = idDe(doc.portada)
  const media = await mediaPorIds(payload, [...(portada === null ? [] : [portada]), ...idsEnCuerpo(doc.cuerpo).media], lang)
  return fichaItinerarioDe(doc, lang, media)
}
