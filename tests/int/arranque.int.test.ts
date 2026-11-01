import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('arranque', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
    await limpiar(payload)
  })

  it('consulta usuarios en una base migrada', async () => {
    const res = await payload.find({ collection: 'users', overrideAccess: true })
    expect(res.totalDocs).toBe(0)
  })

  it('GraphQL está apagado y la localización no usa idioma de respaldo', () => {
    expect(payload.config.graphQL.disable).toBe(true)
    expect(payload.config.localization && payload.config.localization.fallback).toBe(false)
  })
})
