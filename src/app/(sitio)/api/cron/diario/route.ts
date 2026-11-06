import { autorizado } from '../../../../../cron/autorizar'
import { correrDiario } from '../../../../../cron/diario'
import { obtenerPayload } from '../../../../../sitio/datos/payload'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!autorizado(request)) return new Response('No autorizado', { status: 401 })
  return Response.json(await correrDiario(await obtenerPayload(), new Date()))
}
