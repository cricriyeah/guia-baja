import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { avisarSolicitud } from '../../src/formulario/avisar'
import { enviarSolicitud } from '../../src/formulario/enviar'
import { limpiar, obtenerPayload } from './utils'

let payload: Payload
const form = (extra = {}) => ({ negocio: 'Café Duna', correo: 'hola@ejemplo.invalid', aceptoPrivacidad: 'on', 'cf-turnstile-response': 'tok', ...extra })
const publico = (ip: string | null) => ({ tipo: 'publico' as const, ip })
const deps = (extra = {}) => ({ verificarTurnstile: vi.fn(async () => true), avisar: vi.fn(async () => undefined), sal: 'sal-prueba', ...extra })

async function ajustes(formularioActivo: boolean) {
  await payload.updateGlobal({
    slug: 'ajustes-guia', overrideAccess: true,
    data: { formularioActivo, versionAviso: '2026-11', correosAviso: [{ correo: 'equipo@prueba.test' }] },
  })
}

describe('envío del formulario (spec §11, §12)', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
    await ajustes(true)
  })

  it('crea la Solicitud con versión, ipHash y aviso', async () => {
    const d = deps()
    expect(await enviarSolicitud(payload, form(), publico('1.2.3.4'), d)).toEqual({ ok: true })
    const { docs } = await payload.find({ collection: 'solicitudes', overrideAccess: true })
    expect(docs[0]).toMatchObject({ negocio: 'Café Duna', versionAviso: '2026-11', aceptoPrivacidad: true, estado: 'nueva' })
    expect(docs[0].ipHash).toMatch(/^[0-9a-f]{64}$/)
    expect(d.verificarTurnstile).toHaveBeenCalledWith('tok', '1.2.3.4')
    expect(d.avisar).toHaveBeenCalledWith(payload, expect.objectContaining({ negocio: 'Café Duna' }), ['equipo@prueba.test'])
  })

  it('apagado, inválido o sin verificación: rechaza', async () => {
    await ajustes(false)
    expect(await enviarSolicitud(payload, form(), publico('1.2.3.4'), deps())).toMatchObject({ ok: false, motivo: 'cerrado' })
    await ajustes(true)
    expect(await enviarSolicitud(payload, form({ negocio: '' }), publico('1.2.3.4'), deps())).toMatchObject({ ok: false, motivo: 'invalido', errores: { negocio: 'requerido' } })
    expect(await enviarSolicitud(payload, form(), publico('1.2.3.4'), deps({ verificarTurnstile: vi.fn(async () => false) }))).toMatchObject({ ok: false, motivo: 'verificacion' })
  })

  it('máximo 5 por IP por hora; otra IP pasa', async () => {
    for (let i = 0; i < 5; i++) expect((await enviarSolicitud(payload, form(), publico('9.9.9.9'), deps())).ok).toBe(true)
    expect(await enviarSolicitud(payload, form(), publico('9.9.9.9'), deps())).toMatchObject({ ok: false, motivo: 'limite' })
    expect((await enviarSolicitud(payload, form(), publico('8.8.8.8'), deps())).ok).toBe(true)
  })

  it('sin IP, el límite cuenta por correo y teléfono', async () => {
    for (let i = 0; i < 5; i++) expect((await enviarSolicitud(payload, form(), publico(null), deps())).ok).toBe(true)
    expect(await enviarSolicitud(payload, form(), publico(null), deps())).toMatchObject({ ok: false, motivo: 'limite' })
    expect((await enviarSolicitud(payload, form({ correo: 'otra@ejemplo.invalid' }), publico(null), deps())).ok).toBe(true)
  })

  it('sin sal con IP, falla en voz alta: no guarda la Solicitud ni avisa', async () => {
    const d = deps({ sal: '' })
    await expect(enviarSolicitud(payload, form(), publico('1.2.3.4'), d)).rejects.toThrow(/sal/)
    expect((await payload.count({ collection: 'solicitudes', overrideAccess: true })).totalDocs).toBe(0)
    expect(d.avisar).not.toHaveBeenCalled()
  })

  it('si el correo de aviso falla, la Solicitud queda y el log no lleva direcciones', async () => {
    const errorLog = vi.spyOn(payload.logger, 'error')
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockRejectedValue(Object.assign(new Error('to: equipo@prueba.test rechazado'), { status: 422 }))
    expect(await enviarSolicitud(payload, form(), publico('1.2.3.4'), deps({ avisar: avisarSolicitud }))).toEqual({ ok: true })
    expect((await payload.count({ collection: 'solicitudes', overrideAccess: true })).totalDocs).toBe(1)
    expect(errorLog).toHaveBeenCalled()
    expect(JSON.stringify(errorLog.mock.calls)).not.toMatch(/@/)
    sendEmail.mockRestore()
    errorLog.mockRestore()
  })
})
