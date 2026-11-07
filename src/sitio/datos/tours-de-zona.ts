import type { Payload } from 'payload'

import { esPersonal } from '../../acceso/roles'
import { toursDe, type ItemCatalogo } from '../../dominio/catalogo'
import { textos } from '../textos'

// Opciones del campo «Tours relacionados» del admin (spec de presencia §2.1). Ruta interna, fuera del contrato v1.
export type OpcionTour = { clave: string; nombre: string; precio: string | null }
export type RespuestaToursDeZona =
  | { estado: 200; sinSede: boolean; tours: OpcionTour[] }
  | { estado: 400 | 401 | 404 | 503 }

export async function toursDeZonaParaAdmin(
  payload: Payload,
  usuario: { rol?: string | null } | null | undefined,
  zonaParam: string | null,
  leerCatalogo: (sedeSlug: string) => Promise<ItemCatalogo[]>,
): Promise<RespuestaToursDeZona> {
  if (!esPersonal(usuario)) return { estado: 401 }
  const zonaId = Number(zonaParam)
  if (!zonaParam || !Number.isInteger(zonaId) || zonaId <= 0) return { estado: 400 }
  // Incluye zonas inactivas: una zona se llena antes de activarse.
  const { docs } = await payload.find({ collection: 'zonas', where: { id: { equals: zonaId } }, depth: 0, limit: 1, overrideAccess: true, locale: 'es' })
  const zona = docs[0]
  if (!zona) return { estado: 404 }
  if (!zona.sedeSlug) return { estado: 200, sinSede: true, tours: [] }
  let items: ItemCatalogo[]
  try {
    items = await leerCatalogo(zona.sedeSlug)
  } catch (e) {
    console.error(`Tours de ${zona.sedeSlug} para el admin: catálogo no disponible.`, e instanceof Error ? e.message : 'error desconocido')
    return { estado: 503 }
  }
  const t = textos('es').tours
  const tours = toursDe(items, 'es').map((tour) => ({
    clave: tour.clave,
    nombre: tour.nombre,
    precio: tour.precio ? [t.desde, tour.precio.monto, tour.precio.moneda, t.por[tour.precio.estrategia]].filter(Boolean).join(' ') : null,
  }))
  return { estado: 200, sinSede: false, tours }
}
