import { autorizado } from '../../../../../cron/autorizar'
import { correrDiario } from '../../../../../cron/diario'
import { obtenerPayload } from '../../../../../sitio/datos/payload'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!autorizado(request)) return new Response('No autorizado', { status: 401 })
  const r = await correrDiario(await obtenerPayload(), new Date())
  return Response.json(r, { status: r.fallidas.length ? 500 : 200 })
}
