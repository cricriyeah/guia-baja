import { catalogoCacheado } from '../../../../sitio/datos/cacheadas'
import { obtenerPayload } from '../../../../sitio/datos/payload'
import { toursDeZonaParaAdmin } from '../../../../sitio/datos/tours-de-zona'

// Solo para el campo «Tours relacionados» del admin (spec de presencia §2.1). No es parte de /api/publico/v1.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const payload = await obtenerPayload()
  const { user } = await payload.auth({ headers: request.headers })
  const r = await toursDeZonaParaAdmin(payload, user, new URL(request.url).searchParams.get('zona'), catalogoCacheado)
  const sinCache = { 'Cache-Control': 'private, no-store' }
  if (r.estado !== 200) return new Response(null, { status: r.estado, headers: sinCache })
  return Response.json({ sinSede: r.sinSede, tours: r.tours }, { headers: sinCache })
}
