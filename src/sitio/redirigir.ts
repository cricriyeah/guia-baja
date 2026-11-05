import { notFound, permanentRedirect } from 'next/navigation'

import type { Locale } from '../dominio/idioma'
import { rutaPublicaDesdeArbol } from '../dominio/rutas-publicas'
import { mapaRedireccionesCacheado } from './datos/cacheadas'

// Spec §6: cuando una ruta no encuentra su documento, consulta las Redirecciones antes de dar 404.
// Las redirecciones guardan la ruta pública; las páginas reciben el árbol en español (proxy): se arma la inversa.
export async function noEncontrado(lang: Locale, segmentos: string[]): Promise<never> {
  const destino = (await mapaRedireccionesCacheado())[rutaPublicaDesdeArbol(lang, segmentos)]
  if (destino) permanentRedirect(destino)
  notFound()
}
