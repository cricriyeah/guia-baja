import { ValidationError, type GlobalBeforeChangeHook } from 'payload'

import { idiomasSinAviso } from '../dominio/aviso'
import { esLocale, LOCALES, type Locale } from '../dominio/idioma'

const NOMBRE: Record<Locale, string> = { es: 'español', en: 'inglés' }

// Spec §12: formularioActivo no puede quedar encendido sin aviso de privacidad en es y en. Se evalúa el estado
// resultante (lo que llega + lo guardado), así también se rechaza borrar un aviso con el formulario encendido.
// Lee con el adaptador de base y locale 'all' (no Local API): así no se toca req.locale (regla de hooks).
export const exigirAvisoParaActivar: GlobalBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const activo = 'formularioActivo' in data ? data.formularioActivo : originalDoc?.formularioActivo
  if (!activo) return data

  const guardado = await req.payload.db.findGlobal<{ avisoPrivacidad?: Partial<Record<Locale, unknown>> | null }>({
    slug: 'ajustes-guia',
    locale: 'all',
    req,
  })
  const avisos: Partial<Record<Locale, unknown>> = { ...(guardado?.avisoPrivacidad ?? {}) }
  if ('avisoPrivacidad' in data) {
    if (esLocale(req.locale)) avisos[req.locale] = data.avisoPrivacidad
    else if (data.avisoPrivacidad && typeof data.avisoPrivacidad === 'object') {
      // Con locale 'all' el valor llega como mapa por idioma.
      const mapa = data.avisoPrivacidad as Partial<Record<Locale, unknown>>
      for (const l of LOCALES) if (l in mapa) avisos[l] = mapa[l]
    }
  }

  const faltan = idiomasSinAviso(avisos)
  if (faltan.length === 0) return data
  throw new ValidationError({
    global: 'ajustes-guia',
    req,
    errors: [
      {
        path: 'formularioActivo',
        message: `No se puede encender el formulario: falta el aviso de privacidad en ${faltan.map((l) => NOMBRE[l]).join(' y ')}. Publica el aviso en los dos idiomas y vuelve a intentarlo.`,
      },
    ],
  })
}
