import type { Payload, Where } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { crearCategoria, crearImagen, crearLugar, crearZona, limpiar, obtenerPayload } from './utils'

let payload: Payload
const filas = (where: Where = {}) => payload.find({ collection: 'indice-busqueda', where, overrideAccess: true, pagination: false }).then((r) => r.docs)

describe('índice de búsqueda', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('publicar indexa, despublicar y borrar quitan', async () => {
    const zona = await crearZona(payload)
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    const l = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'indexado-x' })
    expect((await filas({ tipo: { equals: 'lugar' } })).map((f) => f.idioma)).toEqual(['es'])
    await payload.update({ collection: 'lugares', id: l.id, data: { _status: 'draft' }, overrideAccess: true })
    expect(await filas({ tipo: { equals: 'lugar' } })).toEqual([])
    await payload.update({ collection: 'lugares', id: l.id, data: { _status: 'published' }, overrideAccess: true })
    await payload.delete({ collection: 'lugares', id: l.id, overrideAccess: true })
    expect(await filas({ tipo: { equals: 'lugar' } })).toEqual([])
  })

  it('el público no lee el índice', async () => {
    await expect(payload.find({ collection: 'indice-busqueda', overrideAccess: false })).rejects.toThrow()
  })

  it('un error al indexar no tumba el guardado del documento', async () => {
    // forzarFalloIndice obliga a indexar() a fallar dentro de su savepoint (ver indexar.ts).
    const cat = await crearCategoria(payload)
    const actualizada = await payload.update({
      collection: 'categorias', id: cat.id, data: { orden: 7 }, overrideAccess: true, context: { forzarFalloIndice: true },
    })
    expect(actualizada.orden).toBe(7)
    expect((await payload.findByID({ collection: 'categorias', id: cat.id, overrideAccess: true })).orden).toBe(7)
  })
})
