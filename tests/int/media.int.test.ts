import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { limitarTamano, TAMANO_MAXIMO_SUBIDA } from '../../src/collections/Media'
import { imagenDePrueba } from '../../src/seed/imagenes'
import { crearImagen, crearUsuario, limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('Media', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('genera 480, 960 y 1600 px en WebP y 1200×630 para compartir', async () => {
    const m = await crearImagen(payload)
    expect(m.sizes?.s480?.width).toBe(480)
    expect(m.sizes?.s960?.width).toBe(960)
    expect(m.sizes?.s1600?.width).toBe(1600)
    expect(m.sizes?.s480?.mimeType).toBe('image/webp')
    expect(m.sizes?.og?.width).toBe(1200)
    expect(m.sizes?.og?.height).toBe(630)
  })

  it('exige alt', async () => {
    const data = await imagenDePrueba()
    await expect(
      payload.create({
        collection: 'media',
        data: {} as never,
        file: { data, mimetype: 'image/jpeg', name: 'sin-alt.jpg', size: data.length },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })

  it('rechaza archivos de más de 20 MB', async () => {
    const data = await imagenDePrueba()
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: 'grande' },
        file: { data, mimetype: 'image/jpeg', name: 'grande.jpg', size: 21 * 1024 * 1024 },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/20 MB/)
  })

  it('el público lee pero no sube', async () => {
    await crearImagen(payload)
    const res = await payload.find({ collection: 'media', overrideAccess: false })
    expect(res.totalDocs).toBe(1)
    const data = await imagenDePrueba()
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: 'x' },
        file: { data, mimetype: 'image/jpeg', name: 'x.jpg', size: data.length },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('un editor sí sube', async () => {
    const editor = await crearUsuario(payload, 'editor')
    const data = await imagenDePrueba()
    const m = await payload.create({
      collection: 'media',
      data: { alt: 'x' },
      file: { data, mimetype: 'image/jpeg', name: 'editor.jpg', size: data.length },
      overrideAccess: false,
      user: editor,
    })
    expect(m.id).toBeDefined()
  })

  it('el gancho de tamaño rechaza subidas del servidor y directas a R2 que pasen de 20 MB', () => {
    const grande = TAMANO_MAXIMO_SUBIDA + 1
    const llamar = (req: unknown, data?: unknown) =>
      (limitarTamano as unknown as (args: unknown) => unknown)({ data, req })
    expect(() => llamar({ file: { size: grande } }, {})).toThrow(/20 MB/)
    expect(() => llamar({}, { filesize: grande })).toThrow(/20 MB/)
    expect(() => llamar({ file: { size: TAMANO_MAXIMO_SUBIDA } }, {})).not.toThrow()
    expect(() => llamar({}, {})).not.toThrow()
  })
})
