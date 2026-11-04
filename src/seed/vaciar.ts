import type { CollectionSlug, Payload } from 'payload'

// Orden: primero lo que referencia a otros.
const ORDEN = [
  'redirects',
  'solicitudes',
  'textos-zona-categoria',
  'articulos',
  'eventos',
  'lugares',
  'categorias',
  'zonas',
  'media',
  'users',
] as const

export async function vaciarColecciones(payload: Payload): Promise<void> {
  for (const slug of ORDEN) {
    if (!(slug in payload.collections)) continue
    await payload.delete({
      collection: slug as CollectionSlug,
      where: { id: { exists: true } },
      overrideAccess: true,
      context: { sinRedirecciones: true, disableRevalidate: true },
    })
  }
}
