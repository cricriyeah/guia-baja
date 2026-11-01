import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { crearCategoria, crearZona, limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('Zonas y Categorías', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('genera el slug desde el nombre si viene vacío', async () => {
    const zona = await payload.create({
      collection: 'zonas',
      locale: 'es',
      data: { nombre: 'Puerto Chale', activa: true },
      overrideAccess: true,
    })
    expect(zona.slug).toBe('puerto-chale')
  })

  it('rechaza slugs reservados en zonas', async () => {
    await expect(crearZona(payload, { slug: 'eventos' })).rejects.toMatchObject({
      data: { errors: [expect.objectContaining({ message: expect.stringMatching(/reservad/) })] },
    })
  })

  it('normaliza los slugs escritos a mano', async () => {
    await expect(
      payload.create({
        collection: 'zonas',
        locale: 'es',
        data: { nombre: 'X', slug: 'La_Paz!', activa: true },
        overrideAccess: true,
      }),
    ).resolves.toMatchObject({ slug: 'la-paz' })
  })

  it('el slug de zona es único', async () => {
    await crearZona(payload, { slug: 'la-paz' })
    await expect(crearZona(payload, { slug: 'la-paz' })).rejects.toThrow()
  })

  it('el slug de categoría es único por idioma, no entre idiomas', async () => {
    await crearCategoria(payload, { es: 'cafes', en: 'cafes' })
    await expect(crearCategoria(payload, { es: 'cafes', en: 'coffee' })).rejects.toThrow()
  })

  it('agregar el inglés sin reenviar el nombre en español no deja el slug vacío en español', async () => {
    const doc = await payload.create({
      collection: 'categorias',
      locale: 'es',
      data: { nombre: 'Tiendas', aplicaA: 'lugar', tipoSchema: 'Store' },
      overrideAccess: true,
    })
    expect(doc.slug).toBe('tiendas')
    const en = await payload.update({
      collection: 'categorias',
      id: doc.id,
      locale: 'en',
      data: { nombre: 'Shops' },
      overrideAccess: true,
    })
    expect(en.slug).toBe('shops')
    const es = await payload.findByID({ collection: 'categorias', id: doc.id, locale: 'es', overrideAccess: true })
    expect(es.slug).toBe('tiendas')
  })

  it('vaciar el slug sin reenviar el nombre lo regenera desde el nombre guardado', async () => {
    const doc = await payload.create({
      collection: 'categorias',
      locale: 'es',
      data: { nombre: 'Playas', aplicaA: 'lugar', tipoSchema: 'Beach' },
      overrideAccess: true,
    })
    const actualizada = await payload.update({
      collection: 'categorias',
      id: doc.id,
      locale: 'es',
      data: { slug: '' },
      overrideAccess: true,
    })
    expect(actualizada.slug).toBe('playas')
  })

  it('el público solo ve zonas activas', async () => {
    await crearZona(payload, { slug: 'activa', activa: true })
    await crearZona(payload, { slug: 'inactiva', activa: false })
    const res = await payload.find({ collection: 'zonas', overrideAccess: false })
    expect(res.docs.map((z) => z.slug)).toEqual(['activa'])
  })

  it('el público no crea zonas ni categorías', async () => {
    await expect(
      payload.create({ collection: 'zonas', data: { nombre: 'X', slug: 'x', activa: true }, overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'categorias',
        data: { nombre: 'X', slug: 'x', aplicaA: 'lugar', tipoSchema: 'Store' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})
