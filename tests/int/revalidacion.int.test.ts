import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { crearZona, limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('hooks de revalidación fuera del runtime de Next', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('guardar y borrar no se rompen, con y sin disableRevalidate', async () => {
    const z = await crearZona(payload, { slug: 'zona-rev' })
    await payload.update({ collection: 'zonas', id: z.id, data: { orden: 5 }, overrideAccess: true })
    await payload.update({ collection: 'zonas', id: z.id, data: { orden: 6 }, overrideAccess: true, context: { disableRevalidate: true } })
    await payload.updateGlobal({ slug: 'ajustes-guia', data: { portadaTitulo: 'Hola' }, locale: 'es', overrideAccess: true })
    await payload.delete({ collection: 'zonas', id: z.id, overrideAccess: true })
    expect(await payload.count({ collection: 'zonas', overrideAccess: true })).toMatchObject({ totalDocs: 0 })
  })
})
