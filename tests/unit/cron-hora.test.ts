import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { correrHora } from '../../src/cron/hora'

// Payload falso: lo justo para ejercer el aislamiento de fallos de cada paso.
function falso(opciones: { jobs?: () => Promise<unknown>; errores?: { id: number | string; message: string }[] } = {}) {
  const logger = { info: vi.fn(), error: vi.fn() }
  const update = vi.fn(async () => ({ docs: [{ id: 1 }, { id: 2 }], errors: opciones.errores ?? [] }))
  const payload = {
    jobs: { run: vi.fn(opciones.jobs ?? (async () => ({}))) },
    find: vi.fn(async () => ({ docs: [] })),
    update,
    logger,
  } as unknown as Payload
  return { payload, logger, update }
}

const AHORA = new Date('2026-11-10T08:05:00Z')

describe('correrHora: aislamiento de fallos (spec §12)', () => {
  it('si la cola falla, igual purga el ipHash y lo reporta', async () => {
    const { payload, update, logger } = falso({
      jobs: async () => {
        throw new Error('boom: correo@x.test')
      },
    })
    const r = await correrHora(payload, AHORA, vi.fn())
    expect(update).toHaveBeenCalledOnce()
    expect(r.ipBorrados).toBe(2)
    expect(r.fallos).toEqual(['jobs'])
    expect(logger.error).toHaveBeenCalledOnce()
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('correo@x.test')
  })

  it('un job que no termina en success cuenta como fallo por id (jobs.run no lanza)', async () => {
    const { payload, update, logger } = falso({
      jobs: async () => ({
        jobStatus: { 11: { status: 'success' }, 12: { status: 'error' }, 13: { status: 'error-reached-max-retries' } },
        remainingJobsFromQueried: 1,
      }),
    })
    const r = await correrHora(payload, AHORA, vi.fn())
    expect(r.fallos).toEqual(['job:12', 'job:13'])
    expect(update).toHaveBeenCalledOnce()
    expect(logger.error).toHaveBeenCalledOnce()
  })

  it('sin jobs en la cola no hay fallo', async () => {
    const { payload } = falso({ jobs: async () => ({ noJobsRemaining: true, remainingJobsFromQueried: 0 }) })
    expect((await correrHora(payload, AHORA, vi.fn())).fallos).toEqual([])
  })

  it('ids de la purga que fallaron salen en el resultado y cuentan como fallo', async () => {
    const { payload, logger } = falso({ errores: [{ id: 7, message: 'dato con correo@x.test' }] })
    const r = await correrHora(payload, AHORA, vi.fn())
    expect(r.ipFallidos).toEqual([7])
    expect(r.fallos).toContain('ipHash')
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('correo@x.test')
  })

  it('si la purga lanza, queda como fallo y no propaga', async () => {
    const { payload, update } = falso()
    update.mockRejectedValueOnce(new Error('db caída'))
    const r = await correrHora(payload, AHORA, vi.fn())
    expect(r.fallos).toContain('ipHash')
    expect(r.ipBorrados).toBe(0)
  })

  it('sin fallos, un solo log info con conteos', async () => {
    const { payload, logger } = falso()
    const r = await correrHora(payload, AHORA, vi.fn())
    expect(r.fallos).toEqual([])
    expect(logger.info).toHaveBeenCalledOnce()
    expect(logger.error).not.toHaveBeenCalled()
  })
})
