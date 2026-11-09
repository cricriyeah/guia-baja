import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { crearCategoria, crearImagen, crearLugar, crearUsuario, crearZona, lexical, limpiar, obtenerPayload } from './utils'

let payload: Payload

let n = 0
async function base() {
  const zona = await crearZona(payload, { activa: true, sedeSlug: 'la-paz' })
  const categoria = await crearCategoria(payload)
  const foto = await crearImagen(payload)
  // Cada lugar con su slug: el índice de slugs es único.
  const lugar = (extra: Record<string, unknown>) => crearLugar(payload, { zona: zona.id, categorias: [categoria.id], foto: foto.id, slugEs: `lugar-${++n}`, extra })
  return { zona, categoria, lugar }
}

describe('esquema del paquete 1', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('visita: tiempo sin medio y sin-servicios combinado se rechazan', async () => {
    const { lugar } = await base()
    await expect(lugar({ visita: { minutosDesdeZona: 45 } })).rejects.toThrow()
    await expect(lugar({ visita: { servicios: ['sin-servicios', 'sombra'] } })).rejects.toThrow()
    await expect(lugar({ visita: { minutosDesdeZona: 45, medio: 'auto', servicios: ['sombra'] } })).resolves.toBeTruthy()
  })

  it('preguntas: máximo 8 y límites de texto', async () => {
    const { lugar } = await base()
    const fila = { pregunta: '¿Hay sombra?', respuesta: 'Sí.' }
    await expect(lugar({ preguntas: Array(9).fill(fila) })).rejects.toThrow()
    await expect(lugar({ preguntas: [{ pregunta: 'x'.repeat(121), respuesta: 'Sí.' }] })).rejects.toThrow()
    await expect(lugar({ preguntas: [fila] })).resolves.toBeTruthy()
  })

  it('fotos-tours: registro vacío rechazado, sin foto con meses aceptado y actualización parcial válida', async () => {
    const claves = { sedeSlug: 'la-paz', tipo: 'servicio' as const, slug: 'ballenas' }
    await expect(payload.create({ collection: 'fotos-tours', locale: 'es', data: claves, overrideAccess: true })).rejects.toThrow()
    const doc = await payload.create({ collection: 'fotos-tours', locale: 'es', data: { ...claves, meses: ['1', '2'] }, overrideAccess: true })
    const act = await payload.update({ collection: 'fotos-tours', id: doc.id, locale: 'es', data: { temporada: 'enero' }, overrideAccess: true })
    expect(act.meses).toEqual(['1', '2'])
  })

  it('el público lee meses', async () => {
    await payload.create({ collection: 'fotos-tours', locale: 'es', data: { sedeSlug: 'la-paz', tipo: 'servicio', slug: 'ballenas', meses: ['3'] }, overrideAccess: true })
    const { docs } = await payload.find({ collection: 'fotos-tours', overrideAccess: false, user: undefined })
    expect(docs[0].meses).toEqual(['3'])
  })

  it('bloque tour: clave mal formada rechazada', async () => {
    const { zona } = await base()
    const cuerpo = (tour: string) => {
      const c = lexical('Texto')
      ;(c.root.children as unknown[]).push({ type: 'block', version: 2, format: '', fields: { blockType: 'tour', zona: zona.id, tour } })
      return c
    }
    const portada = await crearImagen(payload)
    const autor = await crearUsuario(payload, 'admin')
    const data = { titulo: 'Artículo', resumen: 'R', portada: portada.id, autor: autor.id, _status: 'published' as const }
    await expect(payload.create({ collection: 'articulos', locale: 'es', data: { ...data, cuerpo: cuerpo('no-es-clave') }, overrideAccess: true })).rejects.toThrow()
    await expect(payload.create({ collection: 'articulos', locale: 'es', data: { ...data, cuerpo: cuerpo('servicio:ballenas') }, overrideAccess: true })).resolves.toBeTruthy()
  })

  it('ajustes: whatsappToursActivo apagado por defecto y sin campo de número', async () => {
    const g = await payload.findGlobal({ slug: 'ajustes-guia', overrideAccess: true })
    expect(g.whatsappToursActivo ?? false).toBe(false)
    expect('whatsappTours' in g).toBe(false)
  })
})
