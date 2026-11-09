import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import { idDe, idsEnCuerpo } from '../../../dominio/lexical'
import { fichaTemaDe, temaDe } from '../mapeo'
import type { FichaTema, TarjetaTema } from '../tipos'
import { mediaPorIds } from './media'
import { opcionesPublicas } from './publico'

// Una zona inactiva no se puebla para el público: el tema que apunta a ella no existe. Con depth 1, sin zona, es null.
const zonaActivaOAusente = (zona: unknown) => zona === null || zona === undefined || (typeof zona === 'object' && 'slug' in (zona as object))

export async function temasPublicados(payload: Payload, lang: Locale): Promise<TarjetaTema[]> {
  const { docs } = await payload.find({ collection: 'temas', ...opcionesPublicas(lang), depth: 1, sort: '-publicadoEl', pagination: false })
  return docs.filter((d) => zonaActivaOAusente(d.zona)).map((d) => temaDe(d, lang)).filter((x): x is TarjetaTema => x !== null)
}

export async function fichaTema(payload: Payload, id: number, lang: Locale): Promise<FichaTema | null> {
  const { docs } = await payload.find({ collection: 'temas', ...opcionesPublicas(lang), where: { id: { equals: id } }, depth: 1, limit: 1 })
  const doc = docs[0]
  if (!doc || !zonaActivaOAusente(doc.zona)) return null
  const portada = idDe(doc.portada)
  const media = await mediaPorIds(payload, [...(portada === null ? [] : [portada]), ...idsEnCuerpo(doc.introduccion).media], lang)
  return fichaTemaDe(doc, lang, media)
}
