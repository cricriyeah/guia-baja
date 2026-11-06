import type { Payload } from 'payload'

// Spec §11: si el correo falla, la Solicitud queda guardada y el error va a los logs SIN correo, teléfono ni IP.
// El message de un error del adaptador puede citar direcciones: solo se registran nombre y estado.
export async function avisarSolicitud(payload: Payload, s: { id: number; negocio: string }, correos: string[]): Promise<void> {
  if (!correos.length) return
  try {
    await payload.sendEmail({
      to: correos,
      subject: `Nueva solicitud en la Guía: ${s.negocio}`,
      text: `Hay una solicitud nueva para aparecer en la Guía (${s.negocio}). Revísala en el admin, en Solicitudes (id ${s.id}).`,
    })
  } catch (e) {
    const err = e as { name?: string; status?: number; statusCode?: number }
    payload.logger.error({ msg: 'No se pudo avisar de la Solicitud', solicitudId: s.id, nombre: err?.name, estado: err?.status ?? err?.statusCode })
  }
}
