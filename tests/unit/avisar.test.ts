import type { Payload } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { avisarSolicitud } from '../../src/formulario/avisar'

const falso = (sendEmail: (m: unknown) => Promise<unknown>) => {
  const logger = { error: vi.fn(), warn: vi.fn() }
  return { payload: { sendEmail: vi.fn(sendEmail), logger } as unknown as Payload, logger, sendEmail }
}

describe('avisarSolicitud (spec §11)', () => {
  afterEach(() => vi.useRealTimers())

  it('el asunto no lleva texto del visitante; el negocio va solo en el cuerpo', async () => {
    const { payload } = falso(async () => undefined)
    await avisarSolicitud(payload, { id: 7, negocio: 'Duna ana@ejemplo.invalid 612 123 4567' }, ['equipo@prueba.test'])
    const envio = (payload.sendEmail as unknown as { mock: { calls: [{ subject: string; text: string }][] } }).mock.calls[0][0]
    expect(envio.subject).toBe('Nueva solicitud en la Guía (id 7)')
    expect(envio.text).toContain('Duna')
  })

  it('si Resend no responde, resuelve a los 5 s y registra sin direcciones', async () => {
    vi.useFakeTimers()
    const { payload, logger } = falso(() => new Promise(() => undefined))
    const p = avisarSolicitud(payload, { id: 7, negocio: 'Duna' }, ['equipo@prueba.test'])
    await vi.advanceTimersByTimeAsync(5000)
    await expect(p).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(logger.error.mock.calls)).toMatch(/tiempo agotado/)
    expect(JSON.stringify(logger.error.mock.calls)).not.toMatch(/@/)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('si el envío termina a tiempo, no deja el temporizador activo', async () => {
    vi.useFakeTimers()
    const { payload, logger } = falso(async () => undefined)
    await avisarSolicitud(payload, { id: 7, negocio: 'Duna' }, ['equipo@prueba.test'])
    expect(vi.getTimerCount()).toBe(0)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('sin destinatarios, avisa en el log con solo el id y no envía', async () => {
    const { payload, logger } = falso(async () => undefined)
    await avisarSolicitud(payload, { id: 9, negocio: 'Duna' }, [])
    expect(payload.sendEmail).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledTimes(1)
    const registro = JSON.stringify(logger.warn.mock.calls)
    expect(registro).toContain('9')
    expect(registro).not.toMatch(/Duna|@/)
  })
})
