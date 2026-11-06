import type { Locale } from '../dominio/idioma'
import { textos } from '../sitio/textos'

// Los campos del formulario, en el orden en que se ven: el primero con error recibe el foco.
export const CAMPOS_FORMULARIO = ['negocio', 'giro', 'zona', 'zonaTexto', 'contactoNombre', 'correo', 'telefono', 'webOInstagram', 'mensaje', 'aceptoPrivacidad'] as const

// El texto de cada código de error de la validación (src/dominio/solicitud.ts). Un código que no conozca cae en
// «formato» y no en un «undefined» en pantalla.
export function mensajeDeError(lang: Locale, campo: string, codigo: string): string {
  const t = textos(lang).formulario
  if (campo === 'zonaTexto' && codigo === 'requerido') return t.zonaTextoRequerido
  return (t.errores as Record<string, string>)[codigo] ?? t.errores.formato
}
