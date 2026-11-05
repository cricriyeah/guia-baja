import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import { idDe, idsEnCuerpo } from '../../../dominio/lexical'
import { fichaLugarDe, lugarDe } from '../mapeo'
import type { FichaLugar, TarjetaLugar } from '../tipos'
import { mediaPorIds } from './media'
import { opcionesPublicas } from './publico'

// depth 1: las tarjetas leen el slug de la zona y las fotos de documentos poblados.
export async function lugaresPublicados(payload: Payload, lang: Locale): Promise<TarjetaLugar[]> {
  const { docs } = await payload.find({ collection: 'lugares', ...opcionesPublicas(lang), depth: 1, sort: 'orden', pagination: false })
  return docs.map((d) => lugarDe(d, lang)).filter((x): x is TarjetaLugar => x !== null)
}

export async function fichaLugar(payload: Payload, id: number, lang: Locale): Promise<FichaLugar | null> {
  const { docs } = await payload.find({ collection: 'lugares', ...opcionesPublicas(lang), where: { id: { equals: id } }, depth: 0, limit: 1 })
  const doc = docs[0]
  if (!doc) return null
  const conZona = { ...doc, zona: await zonaMinima(payload, doc.zona, lang) }
  const fotos = (doc.fotos ?? []).map(idDe).filter((x): x is number => x !== null)
  const media = await mediaPorIds(payload, [...fotos, ...idsEnCuerpo(doc.cuerpo).media], lang)
  return fichaLugarDe(conZona as never, lang, media)
}

// La ficha solo necesita id y slug de la zona (depth 0 la deja como id).
export async function zonaMinima(payload: Payload, zona: unknown, lang: Locale) {
  const id = idDe(zona)
  if (id === null) return null
  const { docs } = await payload.find({ collection: 'zonas', ...opcionesPublicas(lang), where: { id: { equals: id } }, depth: 0, limit: 1 })
  return docs[0] ? { id: docs[0].id, slug: docs[0].slug } : null
}
