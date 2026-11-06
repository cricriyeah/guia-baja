import type { Payload } from 'payload'

// Resend no tiene tiempo límite propio y el visitante espera este aviso: pasado esto se sigue sin él.
const LIMITE_MS = 5000

// Spec §11: si el correo falla, la Solicitud queda guardada y el error va a los logs SIN correo, teléfono ni IP.
// El message de un error del adaptador puede citar direcciones: solo se registran nombre y estado.
// El asunto no lleva texto del visitante: el adaptador silencioso lo escribe en el log. El negocio va solo en el cuerpo.
export async function avisarSolicitud(payload: Payload, s: { id: number; negocio: string }, correos: string[]): Promise<void> {
  if (!correos.length) {
    payload.logger.warn({ msg: 'Solicitud sin destinatarios de aviso (revisar Ajustes de la Guía)', solicitudId: s.id })
    return
  }
  let temporizador: ReturnType<typeof setTimeout> | undefined
  try {
    const envio = payload.sendEmail({
      to: correos,
      subject: `Nueva solicitud en la Guía (id ${s.id})`,
      text: `Hay una solicitud nueva para aparecer en la Guía (${s.negocio}). Revísala en el admin, en Solicitudes (id ${s.id}).`,
    })
    // Si gana el temporizador, el envío sigue en el aire: su posible rechazo tardío no debe quedar sin atender.
    envio.catch(() => undefined)
    const limite = new Promise<never>((_, rechazar) => {
      temporizador = setTimeout(() => rechazar(Object.assign(new Error('tiempo agotado'), { name: 'TiempoAgotado' })), LIMITE_MS)
    })
    await Promise.race([envio, limite])
  } catch (e) {
    const err = e as { name?: string; status?: number; statusCode?: number }
    const agotado = err?.name === 'TiempoAgotado'
    payload.logger.error({
      msg: agotado ? 'No se pudo avisar de la Solicitud: tiempo agotado' : 'No se pudo avisar de la Solicitud',
      solicitudId: s.id,
      nombre: err?.name,
      estado: err?.status ?? err?.statusCode,
    })
  } finally {
    clearTimeout(temporizador)
  }
}
