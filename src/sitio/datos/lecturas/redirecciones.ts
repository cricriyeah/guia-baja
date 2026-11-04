import type { Payload } from 'payload'

import type { MapaRedirecciones } from '../tipos'

// Toda la tabla en una sola lectura (cacheada con la etiqueta «redirecciones»): una URL inventada no crea
// una entrada de caché nueva. Solo hay redirecciones «custom» (src/redirecciones/plugin.ts).
export async function mapaRedirecciones(payload: Payload): Promise<MapaRedirecciones> {
  const { docs } = await payload.find({ collection: 'redirects', overrideAccess: false, depth: 0, pagination: false })
  const mapa: MapaRedirecciones = {}
  for (const r of docs) if (r.from && r.to?.type === 'custom' && r.to.url) mapa[r.from] = r.to.url
  return mapa
}
