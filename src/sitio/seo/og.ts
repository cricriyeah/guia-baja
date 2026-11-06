import type { Locale } from '../../dominio/idioma'

export type TipoOg = 'portada' | 'zona' | 'categoria-zona' | 'categoria' | 'lugar' | 'evento' | 'articulo' | 'pagina'

// Las imágenes OG viven bajo /guia-assets/og (ese prefijo sí lo reescribe el sitio de reservas, spec §4); la ruta
// interna en inglés (/en/guia/…) daría 404 por el proxy.
export const rutaOg = (lang: Locale, tipo: TipoOg, segmentos: string[] = []): string =>
  ['/guia-assets/og', lang, tipo, ...segmentos].join('/')

const MAX_CARACTERES_TITULO = 120

// El título sale del CMS y puede ser largo: se normaliza el espacio y se recorta para que quepa en 1200×630.
export function recortarTituloOg(titulo: string): string {
  const limpio = titulo.replace(/\s+/g, ' ').trim()
  if (limpio.length <= MAX_CARACTERES_TITULO) return limpio
  const corte = limpio.slice(0, MAX_CARACTERES_TITULO - 1)
  const ultimoEspacio = corte.lastIndexOf(' ')
  return `${(ultimoEspacio > MAX_CARACTERES_TITULO / 2 ? corte.slice(0, ultimoEspacio) : corte).trimEnd()}…`
}

// Tamaño de letra (px) según el largo: satori no mide texto, así que se aproxima por caracteres.
export function tamanoTituloOg(titulo: string): number {
  const n = titulo.length
  if (n <= 40) return 64
  if (n <= 70) return 52
  return 44
}

// Cuántos segmentos de ruta lleva cada tipo; la ruta rechaza los demás para que /og/es/zona/la-paz/x no genere (y
// cachee) una imagen por cada sufijo inventado.
export const SEGMENTOS_OG: Record<TipoOg, number> = {
  portada: 0, zona: 1, 'categoria-zona': 2, categoria: 1, lugar: 1, evento: 1, articulo: 1, pagina: 1,
}

export const segmentosOgValidos = (tipo: string, segmentos: string[]): boolean =>
  Object.hasOwn(SEGMENTOS_OG, tipo) && segmentos.length === SEGMENTOS_OG[tipo as TipoOg]

const TIEMPO_FOTO_MS = 4000
const MAXIMO_FOTO_BYTES = 4 * 1024 * 1024

// Satori descarga las <img> por su cuenta y, si falla, rompe toda la imagen. La foto se baja aquí con límite de
// tiempo y de tamaño y se entrega como data URI (satori no lee WebP: solo JPEG y PNG); cualquier fallo devuelve null
// y la imagen sale con el fondo de marca.
export async function fotoDeFondo(og: string | null, base: string): Promise<string | null> {
  if (!og) return null
  try {
    const res = await fetch(new URL(og, base), { signal: AbortSignal.timeout(TIEMPO_FOTO_MS) })
    const tipo = res.headers.get('content-type')?.split(';')[0].trim() ?? ''
    if (!res.ok || (tipo !== 'image/jpeg' && tipo !== 'image/png')) return null
    const bytes = await res.arrayBuffer()
    if (bytes.byteLength > MAXIMO_FOTO_BYTES) return null
    return `data:${tipo};base64,${Buffer.from(bytes).toString('base64')}`
  } catch {
    return null
  }
}
