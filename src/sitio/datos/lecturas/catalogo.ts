import type { Payload } from 'payload'

import { validarPaquetes, validarServicios, type ItemCatalogo } from '../../../dominio/catalogo'
import type { Locale } from '../../../dominio/idioma'
import { imagenDe } from '../mapeo'
import type { Imagen } from '../tipos'
import { opcionesPublicas } from './publico'

const LIMITE_MS = 3000

async function pedir(url: string): Promise<unknown> {
  // no-store: la caché es la de unstable_cache, con su etiqueta y su hora (spec §8.1).
  const r = await fetch(url, { signal: AbortSignal.timeout(LIMITE_MS), cache: 'no-store' })
  if (!r.ok) throw new Error(`Catálogo: respondió ${r.status}`)
  return r.json()
}

// Lanza ante cualquier fallo: dentro de unstable_cache, así el fallo no se guarda (spec §8.1).
export async function catalogoDeSede(_payload: Payload, sedeSlug: string): Promise<ItemCatalogo[]> {
  const base = (process.env.CATALOGO_API_URL ?? '').replace(/\/+$/, '')
  if (!base) throw new Error('Catálogo: falta CATALOGO_API_URL')
  const sede = `${base}/api/sedes/${encodeURIComponent(sedeSlug)}`
  const [servicios, paquetes] = await Promise.all([pedir(`${sede}/servicios/`), pedir(`${sede}/paquetes/`)])
  return [...validarServicios(servicios), ...validarPaquetes(paquetes)]
}

export type FotoTour = { clave: string; foto: Imagen | null; temporada: string | null; meses: number[]; paraQuien: string[]; gustos: string[]; jornada: string | null }

// Foto y temporada de cada tour (spec §8.1): el catálogo no las manda.
export async function fotosDeTours(payload: Payload, sedeSlug: string, lang: Locale): Promise<FotoTour[]> {
  const { docs } = await payload.find({
    collection: 'fotos-tours',
    ...opcionesPublicas(lang),
    where: { sedeSlug: { equals: sedeSlug } },
    depth: 1,
    pagination: false,
  })
  return docs.map((d) => ({ clave: `${d.tipo}:${d.slug}`, foto: d.foto ? imagenDe(d.foto, lang) : null, temporada: d.temporada ?? null, meses: (d.meses ?? []).map(Number), paraQuien: d.paraQuien ?? [], gustos: d.gustos ?? [], jornada: d.jornada ?? null }))
}
