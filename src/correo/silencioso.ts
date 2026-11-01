import type { EmailAdapter } from 'payload'

// Hasta que llegue Resend (F3), los correos no salen. El adaptador por defecto de Payload
// (consoleEmailAdapter) escribe la dirección del destinatario en el log y cualquiera puede
// provocarlo con POST /api/users/forgot-password. Los logs nunca llevan correos (AGENTS.md):
// este adaptador descarta el mensaje y, como mucho, deja el asunto.
export const correoSilencioso: EmailAdapter<void> = ({ payload }) => ({
  name: 'silencioso',
  defaultFromAddress: 'no-responder@invalido.test',
  defaultFromName: 'Guía',
  sendEmail: async (mensaje) => {
    payload.logger.info({ msg: `Correo descartado (sin proveedor configurado). Asunto: '${mensaje.subject ?? ''}'` })
  },
})
