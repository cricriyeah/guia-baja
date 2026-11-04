import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { crearCategoria, limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('Backoffice del diseño de F1', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  describe('Categorías: grupo de color', () => {
    it('guarda el grupo y el público lo lee', async () => {
      const c = await crearCategoria(payload, { grupo: 'comer-y-salir' })
      const publica = await payload.findByID({ collection: 'categorias', id: c.id, overrideAccess: false })
      expect(publica.grupo).toBe('comer-y-salir')
    })

    it('el grupo es obligatorio', async () => {
      await expect(
        payload.create({
          collection: 'categorias',
          locale: 'es',
          data: { nombre: 'Sin grupo', aplicaA: 'lugar', tipoSchema: 'LocalBusiness' } as never,
          overrideAccess: true,
        }),
      ).rejects.toThrow()
    })
  })
})
