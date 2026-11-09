import type { Locale } from './idioma'

// El número vive solo en WHATSAPP_NUMERO (spec principal §5.5); nunca en el código ni en el seed.
export function digitosWhatsapp(numero: string | null | undefined): string | null {
  const d = (numero ?? '').replace(/\D/g, '')
  return d.length >= 10 && d.length <= 15 ? d : null
}

export const enlaceWhatsapp = (digitos: string, mensaje: string): string => `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`

export const mensajeWhatsapp = (lang: Locale, nombre: string): string =>
  lang === 'es'
    ? `Hola, vengo de la Guía (${nombre}). Quiero información de tours.`
    : `Hi, I came from the Guide (${nombre}). I would like information about tours.`
