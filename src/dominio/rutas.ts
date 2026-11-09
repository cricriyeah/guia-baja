import type { Locale } from './idioma'

export const SEGMENTOS = {
  es: {
    guia: 'guia', lugares: 'lugares', eventos: 'eventos', articulos: 'articulos', itinerarios: 'itinerarios', temas: 'temas',
    categoria: 'categoria', negocios: 'aparece-en-la-guia', privacidad: 'privacidad', buscar: 'buscar',
  },
  en: {
    guia: 'guide', lugares: 'places', eventos: 'events', articulos: 'articles', itinerarios: 'itineraries', temas: 'topics',
    categoria: 'category', negocios: 'get-listed', privacidad: 'privacy', buscar: 'search',
  },
} as const satisfies Record<Locale, Record<string, string>>

export type TipoOg = 'portada' | 'zona' | 'categoria-zona' | 'categoria' | 'lugar' | 'evento' | 'articulo' | 'pagina' | 'itinerario' | 'tema'

const base = (l: Locale) => `/${l}/${SEGMENTOS[l].guia}`

// Única fuente de URLs públicas de la guía. F3 la reutiliza para páginas, sitemap y hreflang.
export const rutas = {
  portada: (l: Locale) => base(l),
  zona: (l: Locale, zona: string) => `${base(l)}/${zona}`,
  categoriaEnZona: (l: Locale, zona: string, categoria: string) => `${base(l)}/${zona}/${categoria}`,
  categoria: (l: Locale, categoria: string) => `${base(l)}/${SEGMENTOS[l].categoria}/${categoria}`,
  lugar: (l: Locale, slug: string) => `${base(l)}/${SEGMENTOS[l].lugares}/${slug}`,
  eventos: (l: Locale) => `${base(l)}/${SEGMENTOS[l].eventos}`,
  evento: (l: Locale, slug: string) => `${base(l)}/${SEGMENTOS[l].eventos}/${slug}`,
  articulo: (l: Locale, slug: string) => `${base(l)}/${SEGMENTOS[l].articulos}/${slug}`,
  itinerario: (l: Locale, slug: string) => `${base(l)}/${SEGMENTOS[l].itinerarios}/${slug}`,
  tema: (l: Locale, slug: string) => `${base(l)}/${SEGMENTOS[l].temas}/${slug}`,
  negocios: (l: Locale) => `${base(l)}/${SEGMENTOS[l].negocios}`,
  privacidad: (l: Locale) => `${base(l)}/${SEGMENTOS[l].privacidad}`,
  buscar: (l: Locale) => `${base(l)}/${SEGMENTOS[l].buscar}`,
  // Ruta interna de la cabecera; el proxy reescribe /en/guide/search/sugerencias al árbol en español.
  sugerencias: (l: Locale) => `${base(l)}/${SEGMENTOS[l].buscar}/sugerencias`,
  // Imágenes OG bajo /guia-assets/og (ese prefijo sí lo reescribe el sitio de reservas, spec §4); la ruta interna
  // en inglés (/en/guia/…) daría 404 por el proxy.
  og: (l: Locale, tipo: TipoOg, segmentos: string[] = []) => ['/guia-assets/og', l, tipo, ...segmentos].join('/'),
}

// Rutas del sitio de reservas (spec §8.1). Sin origen: lo pone quien las pinta con SITIO_URL.
export const rutasReservas = {
  sede: (l: Locale, sede: string) => `/${l}/sede/${sede}`,
  servicio: (l: Locale, empresa: string, servicio: string) => `/${l}/servicio/${empresa}/${servicio}`,
  paquete: (l: Locale, sede: string, paquete: string) => `/${l}/sede/${sede}/paquete/${paquete}`,
}

// Parámetros de atribución de los links a tours (spec §13).
export const atribucion = (pieza: string): string => `desde=guia&pieza=${encodeURIComponent(pieza)}`

// Paginación y filtros (spec §7). La página 1 no lleva parámetro.
export const conConsulta = (ruta: string, consulta: string): string => (consulta ? `${ruta}?${consulta}` : ruta)

export function conPagina(ruta: string, n: number, consulta = ''): string {
  const partes = [consulta, n > 1 ? `pagina=${n}` : ''].filter(Boolean)
  return conConsulta(ruta, partes.join('&'))
}
