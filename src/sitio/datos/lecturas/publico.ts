import type { Locale } from '../../../dominio/idioma'

// Única fuente de las opciones de lectura pública (spec §6 «Regla de idioma», §11): como público, solo
// lo publicado y sin idioma de respaldo.
export const opcionesPublicas = (lang: Locale) =>
  ({ locale: lang, fallbackLocale: false, overrideAccess: false, draft: false }) as const
