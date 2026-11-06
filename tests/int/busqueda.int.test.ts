import type { Payload, Where } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { coincidencias, sugerencias } from '../../src/busqueda/consulta'
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

describe('consultas de búsqueda', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('encuentra sin acentos, con plurales, por idioma; el patrocinio va como dato', async () => {
    const zona = await crearZona(payload, { slug: 'la-paz', nombre: 'La Paz' })
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'cafe-duna' })
    const r = await coincidencias(payload, { q: 'cafes', lang: 'es' })
    expect(r.map((x) => x.slug)).toContain('cafe-duna')
    expect(await coincidencias(payload, { q: 'cafes', lang: 'en' })).toEqual([])
    expect(r[0]).toMatchObject({ tipo: 'lugar', zonaIds: [zona.id], patrocinio: { activo: false } })
    expect(JSON.parse(JSON.stringify(r))).toEqual(r)
  })

  it('filtra por tipo y zona; sugiere por prefijo y aguanta entradas hostiles', async () => {
    const zona = await crearZona(payload, { slug: 'la-paz', nombre: 'La Paz' })
    const otra = await crearZona(payload, { slug: 'otra', nombre: 'Otra' })
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'cafe-duna' })
    expect(await coincidencias(payload, { q: 'cafe', lang: 'es', zonaId: otra.id })).toEqual([])
    expect((await coincidencias(payload, { q: 'cafe', lang: 'es', tipo: 'zona' })).length).toBe(0)
    expect((await coincidencias(payload, { q: 'cafe', lang: 'es', zonaId: zona.id })).map((x) => x.slug)).toEqual(['cafe-duna'])
    expect((await coincidencias(payload, { q: 'cafe', lang: 'es', tipo: 'lugar' })).map((x) => x.slug)).toEqual(['cafe-duna'])
    expect((await sugerencias(payload, { q: 'caf', lang: 'es' })).map((s) => s.slug)).toContain('cafe-duna')
    await expect(sugerencias(payload, { q: 'a) & !', lang: 'es' })).resolves.toBeInstanceOf(Array)
  })

  it('unaccent no convierte letras ni números del visitante en sintaxis de tsquery', async () => {
    for (const q of ['ʼ', 'a½', 'a ʼb', 'ʼ:*']) {
      await expect(sugerencias(payload, { q, lang: 'es' })).resolves.toBeInstanceOf(Array)
      await expect(coincidencias(payload, { q, lang: 'es' })).resolves.toBeInstanceOf(Array)
    }
  })

  it('una sugerencia con acentos encuentra el documento sin acentos', async () => {
    const zona = await crearZona(payload, { slug: 'la-paz', nombre: 'La Paz' })
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'cafe-duna' })
    for (const q of ['café', 'cafés', 'CAFÉ-d']) {
      expect((await sugerencias(payload, { q, lang: 'es' })).map((s) => s.slug)).toContain('cafe-duna')
    }
  })

  it('un idioma fuera del mapa cerrado no consulta nada', async () => {
    const lang = "es' OR '1'='1" as never
    expect(await coincidencias(payload, { q: 'cafe', lang })).toEqual([])
    expect(await sugerencias(payload, { q: 'cafe', lang })).toEqual([])
  })
})
