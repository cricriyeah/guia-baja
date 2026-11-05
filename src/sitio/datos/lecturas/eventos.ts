import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import { idDe, idsEnCuerpo } from '../../../dominio/lexical'
import { eventoDe, fichaEventoDe } from '../mapeo'
import type { FichaEvento, TarjetaEvento } from '../tipos'
import { zonaMinima } from './lugares'
import { mediaPorIds } from './media'
import { opcionesPublicas } from './publico'

// depth 1: las tarjetas leen el slug de la zona y las fotos de documentos poblados.
export async function eventosPublicados(payload: Payload, lang: Locale): Promise<TarjetaEvento[]> {
  const { docs } = await payload.find({ collection: 'eventos', ...opcionesPublicas(lang), depth: 1, sort: 'inicio', pagination: false })
  return docs.map((d) => eventoDe(d, lang)).filter((x): x is TarjetaEvento => x !== null)
}

// `lugar` queda como id: la página lo resuelve contra la lista de lugares del idioma (plan F3b).
export async function fichaEvento(payload: Payload, id: number, lang: Locale): Promise<FichaEvento | null> {
  const { docs } = await payload.find({ collection: 'eventos', ...opcionesPublicas(lang), where: { id: { equals: id } }, depth: 0, limit: 1 })
  const doc = docs[0]
  if (!doc) return null
  const fotos = (doc.fotos ?? []).map(idDe).filter((x): x is number => x !== null)
  const media = await mediaPorIds(payload, [...fotos, ...idsEnCuerpo(doc.cuerpo).media], lang)
  return fichaEventoDe({ ...doc, zona: await zonaMinima(payload, doc.zona, lang) } as never, lang, media)
}
