import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { sembrar } from '../../src/seed/datos'
import { obtenerPayload } from './utils'

let payload: Payload

describe('seed', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })

  it('carga datos inventados coherentes y es repetible', async () => {
    await sembrar(payload, { ahora: new Date('2026-11-01T12:00:00Z') })
    await sembrar(payload, { ahora: new Date('2026-11-01T12:00:00Z') })
    const zonas = await payload.find({ collection: 'zonas', overrideAccess: true })
    expect(zonas.totalDocs).toBe(3)
    const publicosEn = await payload.find({
      collection: 'lugares', locale: 'en', fallbackLocale: false, overrideAccess: false, where: { slug: { exists: true } },
    })
    expect(publicosEn.totalDocs).toBeGreaterThanOrEqual(3)
    const eventos = await payload.find({ collection: 'eventos', overrideAccess: true, pagination: false })
    const pasados = eventos.docs.filter((e) => new Date(e.fin ?? e.inicio) < new Date('2026-11-01T12:00:00Z'))
    expect(pasados.length).toBe(1)
    expect((await payload.find({ collection: 'redirects', overrideAccess: true })).totalDocs).toBe(0)
    expect((await payload.find({ collection: 'users', overrideAccess: true })).docs[0]?.email).toBe('admin@guia.local')
  })
})
