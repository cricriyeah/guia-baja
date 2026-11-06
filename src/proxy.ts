import { NextResponse, type NextRequest } from 'next/server'

import { origenDePeticion, selloDelProxy } from './dominio/origen'
import { resolverRutaPublica, SEGMENTO_NO_ENCONTRADO } from './dominio/rutas-publicas'

// Spec §4 y §4.1. Corre en cada petición de la guía, antes de la caché: el origen solo toca cabeceras.
export function proxy(request: NextRequest): NextResponse {
  const secreto = process.env.GUIA_PROXY_SECRET
  const origen = origenDePeticion(request.headers, secreto)

  // Lo que sigue (páginas, Server Action) recibe el origen ya decidido; lo que mande el cliente se pisa.
  const headers = new Headers(request.headers)
  headers.delete('x-guia-proxy')
  // El sello dice a la Server Action que estas cabeceras son del proxy (origenReenviado); el del cliente nunca pasa.
  headers.delete('x-guia-sello')
  if (secreto) headers.set('x-guia-sello', selloDelProxy(secreto))
  headers.set('x-guia-origen', origen.tipo)
  if (origen.ip) headers.set('x-guia-ip', origen.ip)
  else headers.delete('x-guia-ip')

  const accion = resolverRutaPublica(request.nextUrl.pathname, request.nextUrl.searchParams)
  let res: NextResponse
  switch (accion.tipo) {
    case 'redirigir':
      // URL absoluta: el adaptador de Node de Next la vuelve relativa si es del mismo host (getRelativeURL), que
      // es lo que hace falta detrás del rewrite del sitio de reservas. Una Location relativa aquí da 500.
      res = NextResponse.redirect(new URL(accion.destino, request.url), 308)
      break
    case 'reescribir':
      res = NextResponse.rewrite(new URL(accion.destino, request.url), { request: { headers } })
      break
    case 'noEncontrado':
      res = NextResponse.rewrite(new URL(`/${accion.lang}/guia/${SEGMENTO_NO_ENCONTRADO}`, request.url), {
        request: { headers },
      })
      break
    default:
      res = NextResponse.next({ request: { headers } })
  }
  res.headers.set('x-guia-origen', origen.tipo)
  if (origen.tipo === 'directo') res.headers.set('X-Robots-Tag', 'noindex')
  return res
}

export const config = { matcher: ['/es/:path*', '/en/:path*', '/guia-sitemap.xml'] }
