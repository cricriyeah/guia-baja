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

  async function crearConAlt(alt: unknown) {
    const data = await imagenDePrueba()
    return payload.create({
      collection: 'media',
      data: { alt } as never,
      file: { data, mimetype: 'image/jpeg', name: 'alt.jpg', size: data.length },
      overrideAccess: true,
    })
  }

  // Los errores de validación de Payload traen el detalle en err.data.errors, no en err.message.
  async function erroresDeValidacion(alt: unknown) {
    const err = (await crearConAlt(alt).then(
      () => null,
      (e: unknown) => e,
    )) as { data?: { errors?: { path: string; message: string }[] } } | null
    expect(err, 'la creación debía rechazarse').not.toBeNull()
    return err?.data?.errors ?? []
  }

  it('exige alt en español y en inglés', async () => {
    expect((await erroresDeValidacion(undefined)).map((e) => e.path).sort()).toEqual(['alt.en', 'alt.es'])
    const sinEn = await erroresDeValidacion({ es: 'Solo español' })
    expect(sinEn.map((e) => e.path)).toEqual(['alt.en'])
    expect(sinEn[0].message).toMatch(/required|obligatorio|requerido/i)
    expect((await erroresDeValidacion({ en: 'English only' })).map((e) => e.path)).toEqual(['alt.es'])
    expect((await erroresDeValidacion({ es: 'Texto', en: '' })).map((e) => e.path)).toEqual(['alt.en'])
  })

  it('guarda alt en los dos idiomas aunque la petición sea de un solo idioma', async () => {
    const m = await crearConAlt({ es: 'Playa', en: 'Beach' })
    expect(m.alt).toEqual({ es: 'Playa', en: 'Beach' })
    const leida = await payload.findByID({ collection: 'media', id: m.id, locale: 'en', fallbackLocale: false })
    expect(leida.alt).toEqual({ es: 'Playa', en: 'Beach' })
  })

  it('rechaza archivos de más de 20 MB', async () => {
    const data = await imagenDePrueba()
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: { es: 'grande', en: 'big' } },
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
        data: { alt: { es: 'x', en: 'x' } },
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
      data: { alt: { es: 'x', en: 'x' } },
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
