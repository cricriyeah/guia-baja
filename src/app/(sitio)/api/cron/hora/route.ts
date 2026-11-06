import { revalidateTag } from 'next/cache'

import { autorizado } from '../../../../../cron/autorizar'
import { correrHora } from '../../../../../cron/hora'
import { obtenerPayload } from '../../../../../sitio/datos/payload'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!autorizado(request)) return new Response('No autorizado', { status: 401 })
  const r = await correrHora(await obtenerPayload(), new Date(), (etiquetas) => etiquetas.forEach((t) => revalidateTag(t, { expire: 0 })))
  // 500 solo después de que corrió cada paso: así queda visible en Vercel sin haber saltado la purga.
  return Response.json(r, { status: r.fallos.length ? 500 : 200 })
}
