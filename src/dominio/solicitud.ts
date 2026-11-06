export const LIMITE_POR_HORA = 5

export type DatosSolicitud = {
  negocio: string
  giro: string | null
  zonaId: number | null
  zonaTexto: string | null
  contactoNombre: string | null
  correo: string | null
  telefono: string | null
  webOInstagram: string | null
  mensaje: string | null
}
export type CodigoError = 'requerido' | 'largo' | 'formato' | 'contacto' | 'acepto'

const MAX: Record<string, number> = { negocio: 120, giro: 80, zonaTexto: 80, contactoNombre: 80, correo: 160, telefono: 30, webOInstagram: 160, mensaje: 2000 }
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const texto = (v: string | undefined) => {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

// Spec §11 y notas de F1: validación en el servidor; correo o teléfono (al menos uno); aceptación del aviso.
export function validarSolicitud(form: Record<string, string | undefined>) {
  const errores: Record<string, CodigoError> = {}
  const v = Object.fromEntries(Object.keys(MAX).map((k) => [k, texto(form[k])])) as Record<string, string | null>
  for (const [k, max] of Object.entries(MAX)) if (v[k] && v[k]!.length > max) errores[k] = 'largo'
  if (!v.negocio) errores.negocio = 'requerido'
  if (v.correo && !errores.correo && !CORREO.test(v.correo)) errores.correo = 'formato'
  if (v.telefono && !errores.telefono && (v.telefono.replace(/\D/g, '').length < 7 || /[^\d\s+()-]/.test(v.telefono))) errores.telefono = 'formato'
  if (!v.correo && !v.telefono) {
    errores.correo = 'contacto'
    errores.telefono = 'contacto'
  }
  if (form.aceptoPrivacidad !== 'on') errores.aceptoPrivacidad = 'acepto'
  if (Object.keys(errores).length) return { ok: false as const, errores }
  const zona = texto(form.zona)
  const datos: DatosSolicitud = {
    negocio: v.negocio!,
    giro: v.giro,
    zonaId: zona && /^\d+$/.test(zona) ? Number(zona) : null,
    zonaTexto: zona === 'otra' ? v.zonaTexto : null,
    contactoNombre: v.contactoNombre,
    correo: v.correo,
    telefono: v.telefono,
    webOInstagram: v.webOInstagram,
    mensaje: v.mensaje,
  }
  return { ok: true as const, datos }
}
