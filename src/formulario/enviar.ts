import type { Payload, Where } from 'payload'

import { ipHash } from '../dominio/ip-hash'
import type { Origen } from '../dominio/origen'
import { LIMITE_POR_HORA, validarSolicitud, type CodigoError } from '../dominio/solicitud'

export type DepsEnvio = {
  verificarTurnstile(token: string | undefined, ip: string | null): Promise<boolean>
  avisar(payload: Payload, s: { id: number; negocio: string }, correos: string[]): Promise<void>
  sal: string
  ahora?: () => Date
}
export type ResultadoEnvio =
  | { ok: true }
  | { ok: false; motivo: 'cerrado' | 'invalido' | 'verificacion' | 'limite'; errores?: Record<string, CodigoError> }

const HORA = 60 * 60 * 1000

// El caso de uso completo del formulario (spec §11). Sin Next: la Server Action solo le pasa origen y dependencias.
// Una sal vacía es una configuración rota del servidor: se lanza antes de guardar nada.
export async function enviarSolicitud(payload: Payload, form: Record<string, string | undefined>, origen: Origen, deps: DepsEnvio): Promise<ResultadoEnvio> {
  // Antes de tocar nada: sin sal, ipHash fallaría solo cuando haya IP y el límite por correo quedaría sin avisar.
  if (!deps.sal.trim()) throw new Error('enviarSolicitud necesita una sal no vacía (IP_HASH_SALT)')
  const ajustes = await payload.findGlobal({ slug: 'ajustes-guia', overrideAccess: true, depth: 0 })
  if (!ajustes.formularioActivo) return { ok: false, motivo: 'cerrado' }
  const v = validarSolicitud(form)
  if (!v.ok) return { ok: false, motivo: 'invalido', errores: v.errores }
  if (!(await deps.verificarTurnstile(form['cf-turnstile-response'], origen.ip))) return { ok: false, motivo: 'verificacion' }

  const ahora = deps.ahora?.() ?? new Date()
  const hash = origen.ip ? ipHash(origen.ip, deps.sal) : null
  // Sin IP (local o plan B del spec §10): el límite cuenta por correo y teléfono.
  const porContacto: Where[] = []
  if (v.datos.correo) porContacto.push({ correo: { equals: v.datos.correo } })
  if (v.datos.telefono) porContacto.push({ telefono: { equals: v.datos.telefono } })
  const quien: Where = hash ? { ipHash: { equals: hash } } : { or: porContacto }
  // Contar y crear no es atómico: con envíos en paralelo podría pasar un sexto. Costo aceptado (plan F3c).
  const { totalDocs } = await payload.count({
    collection: 'solicitudes',
    overrideAccess: true,
    where: { and: [quien, { createdAt: { greater_than: new Date(ahora.getTime() - HORA).toISOString() } }] },
  })
  if (totalDocs >= LIMITE_POR_HORA) return { ok: false, motivo: 'limite' }

  // Una zona inventada en el formulario no rompe la relación: se guarda sin zona.
  const zonaValida =
    v.datos.zonaId !== null &&
    (await payload.count({ collection: 'zonas', overrideAccess: true, where: { id: { equals: v.datos.zonaId } } })).totalDocs > 0
  const creada = await payload.create({
    collection: 'solicitudes',
    overrideAccess: true,
    data: {
      negocio: v.datos.negocio,
      giro: v.datos.giro,
      zona: zonaValida ? v.datos.zonaId : null,
      zonaTexto: v.datos.zonaTexto,
      contactoNombre: v.datos.contactoNombre,
      correo: v.datos.correo,
      telefono: v.datos.telefono,
      webOInstagram: v.datos.webOInstagram,
      mensaje: v.datos.mensaje,
      aceptoPrivacidad: true,
      versionAviso: ajustes.versionAviso ?? null,
      ipHash: hash,
      estado: 'nueva',
    },
  })
  await deps.avisar(payload, { id: creada.id, negocio: creada.negocio }, (ajustes.correosAviso ?? []).map((c) => c.correo))
  return { ok: true }
}
