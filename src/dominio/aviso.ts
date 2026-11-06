import { LOCALES, tieneValor, type Locale } from './idioma'

// Spec §12: el formulario solo se enciende con el aviso de privacidad publicado en los dos idiomas.
// `avisos` trae el valor de `avisoPrivacidad` por idioma; devuelve los idiomas donde falta o está vacío.
export function idiomasSinAviso(avisos: Partial<Record<Locale, unknown>>): Locale[] {
  return LOCALES.filter((l) => !tieneValor(avisos[l]))
}
