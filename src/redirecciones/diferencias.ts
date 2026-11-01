import { LOCALES, type Locale } from '../dominio/idioma'

// Estado publicado de un documento (tabla principal), por idioma.
export type Instantanea = {
  publicado: boolean
  slugs: Partial<Record<Locale, string>>
  existe: Record<Locale, boolean>
}

export type Cambio =
  | { tipo: 'cambioSlug'; locale: Locale; slugViejo: string; slugNuevo: string }
  | { tipo: 'retiro'; locale: Locale; slug: string }

export const NO_PUBLICADO: Instantanea = { publicado: false, slugs: {}, existe: { es: false, en: false } }

export function calcularCambios(antes: Instantanea, despues: Instantanea): Cambio[] {
  if (!antes.publicado) return []
  const cambios: Cambio[] = []
  for (const locale of LOCALES) {
    const viejo = antes.slugs[locale]
    if (!antes.existe[locale] || !viejo) continue
    const nuevo = despues.slugs[locale]
    const sigueVivo = despues.publicado && despues.existe[locale] && Boolean(nuevo)
    if (!sigueVivo) cambios.push({ tipo: 'retiro', locale, slug: viejo })
    else if (nuevo !== viejo) cambios.push({ tipo: 'cambioSlug', locale, slugViejo: viejo, slugNuevo: nuevo! })
  }
  return cambios
}
