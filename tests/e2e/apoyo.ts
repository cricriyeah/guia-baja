import type { APIRequestContext } from '@playwright/test'

import { SECRETO_PROXY } from '../../scripts/entorno-e2e.mjs'

export const SLUGS = {
  zona: 'la-paz',
  categoriaEs: 'restaurantes',
  lugar: 'cocina-marea-alta',
  lugarSoloEs: 'bar-la-ballena-gris',
  eventoPasado: 'feria-de-prueba-pasada',
  articulo: 'que-hacer-en-la-paz-prueba',
  slugViejo: 'mesa-del-desierto',
  slugNuevo: 'mesa-del-desierto-nueva',
}

export const pedirConProxy = (request: APIRequestContext, ruta: string, opciones: { maxRedirects?: number } = {}) =>
  request.get(ruta, { headers: { 'x-guia-proxy': SECRETO_PROXY }, ...opciones })

export const metaRobots = (html: string) => html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? null
// Solo los alternos de la metadata (<link rel="alternate">): el selector de idioma también lleva hrefLang en un <a>.
export const hreflangs = (html: string) =>
  [...html.matchAll(/<link\b[^>]*\brel="alternate"[^>]*\bhrefLang="([^"]+)"/gi)].map((m) => m[1]).sort()
