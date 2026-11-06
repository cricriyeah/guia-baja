import type { Locale } from './idioma'

export const SEGMENTOS = {
  es: {
    guia: 'guia', lugares: 'lugares', eventos: 'eventos', articulos: 'articulos',
    categoria: 'categoria', negocios: 'aparece-en-la-guia', privacidad: 'privacidad', buscar: 'buscar',
  },
  en: {
    guia: 'guide', lugares: 'places', eventos: 'events', articulos: 'articles',
    categoria: 'category', negocios: 'get-listed', privacidad: 'privacy', buscar: 'search',
  },
} as const satisfies Record<Locale, Record<string, string>>

export type TipoOg = 'portada' | 'zona' | 'categoria-zona' | 'categoria' | 'lugar' | 'evento' | 'articulo' | 'pagina'

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
  negocios: (l: Locale) => `${base(l)}/${SEGMENTOS[l].negocios}`,
  privacidad: (l: Locale) => `${base(l)}/${SEGMENTOS[l].privacidad}`,
  buscar: (l: Locale) => `${base(l)}/${SEGMENTOS[l].buscar}`,
  // Ruta interna de la cabecera; el proxy reescribe /en/guide/search/sugerencias al árbol en español.
  sugerencias: (l: Locale) => `${base(l)}/${SEGMENTOS[l].buscar}/sugerencias`,
  // Imágenes OG bajo /guia-assets/og (ese prefijo sí lo reescribe el sitio de reservas, spec §4); la ruta interna
  // en inglés (/en/guia/…) daría 404 por el proxy.
  og: (l: Locale, tipo: TipoOg, segmentos: string[] = []) => ['/guia-assets/og', l, tipo, ...segmentos].join('/'),
}

// Paginación y filtros (spec §7). La página 1 no lleva parámetro.
export const conConsulta = (ruta: string, consulta: string): string => (consulta ? `${ruta}?${consulta}` : ruta)

export function conPagina(ruta: string, n: number, consulta = ''): string {
  const partes = [consulta, n > 1 ? `pagina=${n}` : ''].filter(Boolean)
  return conConsulta(ruta, partes.join('&'))
}
