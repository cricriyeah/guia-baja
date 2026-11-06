export const LOCALES = ['es', 'en'] as const
export type Locale = (typeof LOCALES)[number]

// Código regional de Intl y de hreflang por idioma: única fuente (fechas, hreflang, JSON-LD).
export const CODIGO_REGIONAL: Record<Locale, string> = { es: 'es-MX', en: 'en-US' }

export const esLocale = (v: unknown): v is Locale => v === 'es' || v === 'en'
export const otroIdioma = (l: Locale): Locale => (l === 'es' ? 'en' : 'es')

// Regla de idioma (spec §6): campos que deben tener valor en un idioma para que el documento exista en él.
export const CAMPOS_IDIOMA = {
  lugares: ['slug', 'resumen', 'cuerpo'],
  eventos: ['nombre', 'slug', 'resumen', 'cuerpo'],
  articulos: ['titulo', 'slug', 'resumen', 'cuerpo'],
} as const

export const CAMPOS_LOCALIZADOS = {
  lugares: ['slug', 'resumen', 'cuerpo', 'notaHorario'],
  eventos: ['nombre', 'slug', 'resumen', 'cuerpo', 'precio'],
  articulos: ['titulo', 'slug', 'resumen', 'cuerpo'],
} as const

export function textoDeLexical(nodo: unknown): string {
  if (!nodo || typeof nodo !== 'object') return ''
  const n = nodo as { text?: unknown; children?: unknown; root?: unknown }
  if (n.root) return textoDeLexical(n.root)
  const propio = typeof n.text === 'string' ? n.text : ''
  const hijos = Array.isArray(n.children) ? n.children.map(textoDeLexical).join('') : ''
  return propio + hijos
}

export function tieneValor(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object' && 'root' in (v as object)) return textoDeLexical(v).trim() !== ''
  return true
}

// Regla de idioma (spec §6): un documento existe en un idioma solo si todos estos campos tienen valor en él.
export function existeEnIdioma(doc: Record<string, unknown>, campos: readonly string[]): boolean {
  return campos.every((c) => tieneValor(doc[c]))
}

// Para documentos leídos con locale 'all': cada campo localizado llega como { es, en }.
export function aplanarIdioma(
  doc: Record<string, unknown>,
  locale: Locale,
  camposLocalizados: readonly string[],
): Record<string, unknown> {
  const plano: Record<string, unknown> = { ...doc }
  for (const campo of camposLocalizados) {
    const valor = doc[campo]
    plano[campo] =
      valor && typeof valor === 'object' && !Array.isArray(valor)
        ? (valor as Partial<Record<Locale, unknown>>)[locale]
        : undefined
  }
  return plano
}
