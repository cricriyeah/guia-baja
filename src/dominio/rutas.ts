import type { Locale } from './idioma'

export const SEGMENTOS = {
  es: {
    guia: 'guia', lugares: 'lugares', eventos: 'eventos', articulos: 'articulos',
    categoria: 'categoria', negocios: 'aparece-en-la-guia', privacidad: 'privacidad',
  },
  en: {
    guia: 'guide', lugares: 'places', eventos: 'events', articulos: 'articles',
    categoria: 'category', negocios: 'get-listed', privacidad: 'privacy',
  },
} as const satisfies Record<Locale, Record<string, string>>

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
}
