import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { sembrar } from '../../src/seed/datos'
import { obtenerPayload } from './utils'

let payload: Payload

const AHORA = new Date('2026-11-01T12:00:00Z')
const DIA = 24 * 60 * 60 * 1000

describe('seed', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })

  it('carga datos inventados coherentes y es repetible', async () => {
    await sembrar(payload, { ahora: AHORA })
    await sembrar(payload, { ahora: AHORA })
    const zonas = await payload.find({ collection: 'zonas', overrideAccess: true })
    expect(zonas.totalDocs).toBe(3)
    const publicosEn = await payload.find({
      collection: 'lugares', locale: 'en', fallbackLocale: false, overrideAccess: false, where: { slug: { exists: true } },
    })
    expect(publicosEn.totalDocs).toBeGreaterThanOrEqual(3)
    // 8 lugares, 7 con versión en inglés publicada (Bar La Ballena Gris queda solo en español).
    expect(publicosEn.totalDocs).toBe(7)
    for (const lugar of publicosEn.docs) expect(lugar.slug).toBeTruthy()
    expect(publicosEn.docs.map((l) => l.slug)).toContain('cafe-duna')
    const eventos = await payload.find({ collection: 'eventos', overrideAccess: true, pagination: false })
    const pasados = eventos.docs.filter((e) => new Date(e.fin ?? e.inicio) < AHORA)
    expect(pasados.length).toBe(1)
    for (const e of eventos.docs) expect(e.inicio_tz).toBe('America/Mazatlan')
    expect((await payload.find({ collection: 'redirects', overrideAccess: true })).totalDocs).toBe(0)
    expect((await payload.find({ collection: 'users', overrideAccess: true })).docs[0]?.email).toBe('admin@guia.local')
  })

  it('escribe el patrocinio como día completo (00:00Z), relativo a «ahora»', async () => {
    await sembrar(payload, { ahora: AHORA })
    const { docs } = await payload.find({
      collection: 'lugares', where: { 'patrocinio.activo': { equals: true } }, overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    const dia = (ms: number) => `${new Date(ms).toISOString().slice(0, 10)}T00:00:00.000Z`
    expect(docs[0]?.patrocinio?.desde).toBe(dia(AHORA.getTime() - 5 * DIA))
    expect(docs[0]?.patrocinio?.hasta).toBe(dia(AHORA.getTime() + 60 * DIA))
  })
})
