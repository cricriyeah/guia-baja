import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { crearCategoria, crearImagen, crearLugar, crearUsuario, crearZona, lexical, limpiar, obtenerPayload } from './utils'

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

  describe('Lugares: características y destacados', () => {
    it('guarda varias características y filtra por una', async () => {
      const zona = await crearZona(payload)
      const cat = await crearCategoria(payload)
      const foto = await crearImagen(payload)
      const l = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'playa-uno' })
      await payload.update({
        collection: 'lugares', id: l.id, locale: 'es',
        data: { caracteristicas: ['para-ninos', 'con-comida'] },
        overrideAccess: true, context: { sinRedirecciones: true },
      })
      const conComida = await payload.find({
        collection: 'lugares', locale: 'es', overrideAccess: false,
        where: { caracteristicas: { in: ['con-comida'] } },
      })
      expect(conComida.docs.map((d) => d.id)).toEqual([l.id])
    })

    it('rechaza una característica que no está en la lista', async () => {
      const zona = await crearZona(payload)
      const cat = await crearCategoria(payload)
      const foto = await crearImagen(payload)
      const l = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'playa-dos' })
      await expect(
        payload.update({
          collection: 'lugares', id: l.id, locale: 'es',
          data: { caracteristicas: ['con-alberca'] as never },
          overrideAccess: true, context: { sinRedirecciones: true },
        }),
      ).rejects.toThrow()
    })

    it('el público lee los destacados por su orden', async () => {
      const zona = await crearZona(payload)
      const cat = await crearCategoria(payload)
      const foto = await crearImagen(payload)
      const a = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'lugar-a' })
      const b = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'lugar-b' })
      await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'lugar-c' })
      for (const [id, orden] of [[a.id, 2], [b.id, 1]] as const) {
        await payload.update({
          collection: 'lugares', id, locale: 'es',
          data: { destacadoEnPortada: true, ordenDestacado: orden },
          overrideAccess: true, context: { sinRedirecciones: true },
        })
      }
      const destacados = await payload.find({
        collection: 'lugares', locale: 'es', overrideAccess: false,
        where: { destacadoEnPortada: { equals: true } }, sort: 'ordenDestacado',
      })
      expect(destacados.docs.map((d) => d.id)).toEqual([b.id, a.id])
    })

    it('eventos y artículos también se pueden destacar', async () => {
      const editor = await crearUsuario(payload, 'editor')
      const portada = await crearImagen(payload)
      const art = await payload.create({
        collection: 'articulos', locale: 'es',
        data: { titulo: 'Destacado', portada: portada.id, autor: editor.id, resumen: 'r', cuerpo: lexical('c'), destacadoEnPortada: true, _status: 'published' },
        overrideAccess: true,
      })
      expect(art.destacadoEnPortada).toBe(true)
      expect(art.ordenDestacado).toBe(100)
    })
  })

  describe('Categorías en artículos y eventos', () => {
    it('un artículo guarda sus categorías', async () => {
      const editor = await crearUsuario(payload, 'editor')
      const portada = await crearImagen(payload)
      const cat = await crearCategoria(payload, { grupo: 'comer-y-salir' })
      const art = await payload.create({
        collection: 'articulos', locale: 'es',
        data: { titulo: 'Pescado del día', portada: portada.id, autor: editor.id, resumen: 'r', cuerpo: lexical('c'), categorias: [cat.id], _status: 'published' },
        overrideAccess: true,
      })
      const leido = await payload.findByID({ collection: 'articulos', id: art.id, locale: 'es', depth: 0, overrideAccess: false })
      expect(leido.categorias).toEqual([cat.id])
    })

    it('un evento sin categoría no se guarda', async () => {
      const zona = await crearZona(payload)
      const foto = await crearImagen(payload)
      await expect(
        payload.create({
          collection: 'eventos', locale: 'es',
          data: {
            nombre: 'Sin categoría', zona: zona.id, direccionLibre: 'Malecón',
            inicio: '2026-11-14T18:00:00-07:00', inicio_tz: 'America/Mazatlan',
            fotos: [foto.id], resumen: 'r', cuerpo: lexical('c'), _status: 'published',
          } as never,
          overrideAccess: true,
        }),
      ).rejects.toThrow()
    })
  })

  describe('Artículos: fechas de publicación', () => {
    async function borrador() {
      const editor = await crearUsuario(payload, 'editor')
      const portada = await crearImagen(payload)
      return payload.create({
        collection: 'articulos', locale: 'es',
        data: { titulo: `Fechas ${Date.now()}`, portada: portada.id, autor: editor.id, resumen: 'r', cuerpo: lexical('c'), _status: 'draft' },
        overrideAccess: true,
      })
    }

    it('un borrador no tiene fechas de publicación', async () => {
      const a = await borrador()
      expect(a.publicadoEl ?? null).toBeNull()
      expect(a.actualizadoEl ?? null).toBeNull()
    })

    it('publicar fija las dos fechas; publicar un cambio solo mueve actualizadoEl', async () => {
      const a = await borrador()
      const pub = await payload.update({ collection: 'articulos', id: a.id, locale: 'es', data: { _status: 'published' }, overrideAccess: true })
      expect(pub.publicadoEl).toBeTruthy()
      expect(pub.actualizadoEl).toBeTruthy()
      await new Promise((r) => setTimeout(r, 20))
      const cambio = await payload.update({ collection: 'articulos', id: a.id, locale: 'es', data: { resumen: 'nuevo', _status: 'published' }, overrideAccess: true })
      expect(cambio.publicadoEl).toBe(pub.publicadoEl)
      expect(new Date(cambio.actualizadoEl as string).getTime()).toBeGreaterThan(new Date(pub.actualizadoEl as string).getTime())
    })
  })

  describe('Artículos: lugares citados', () => {
    const conTarjeta = (lugar: number) => ({
      root: {
        type: 'root', format: '' as const, indent: 0, version: 1, direction: 'ltr' as const,
        children: [{ type: 'block', version: 2, format: '', fields: { id: `b${lugar}`, blockName: '', blockType: 'tarjetaLugar', lugar } }],
      },
    })

    it('junta los lugares de los dos idiomas y suelta los que se quitan', async () => {
      const zona = await crearZona(payload)
      const cat = await crearCategoria(payload)
      const foto = await crearImagen(payload)
      const a = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'lugar-es' })
      const b = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'lugar-en' })
      const editor = await crearUsuario(payload, 'editor')
      const art = await payload.create({
        collection: 'articulos', locale: 'es',
        data: { titulo: 'Con tarjetas', portada: foto.id, autor: editor.id, resumen: 'r', cuerpo: conTarjeta(a.id) as never, _status: 'published' },
        overrideAccess: true,
      })
      expect(art.lugaresCitados?.map((l) => (typeof l === 'number' ? l : l.id))).toEqual([a.id])

      const en = await payload.update({
        collection: 'articulos', id: art.id, locale: 'en',
        data: { titulo: 'With cards', resumen: 'r', cuerpo: conTarjeta(b.id) as never, _status: 'published' },
        overrideAccess: true,
      })
      expect(new Set(en.lugaresCitados?.map((l) => (typeof l === 'number' ? l : l.id)))).toEqual(new Set([a.id, b.id]))

      const sinA = await payload.update({
        collection: 'articulos', id: art.id, locale: 'es',
        data: { cuerpo: lexical('ya sin tarjeta'), _status: 'published' },
        overrideAccess: true,
      })
      expect(sinA.lugaresCitados?.map((l) => (typeof l === 'number' ? l : l.id))).toEqual([b.id])
    })

    it('un lugar borrado que sigue citado en otro idioma no impide guardar ni queda en lugaresCitados', async () => {
      const zona = await crearZona(payload)
      const cat = await crearCategoria(payload)
      const foto = await crearImagen(payload)
      const a = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'lugar-vivo' })
      const b = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'lugar-borrado' })
      const editor = await crearUsuario(payload, 'editor')
      const art = await payload.create({
        collection: 'articulos', locale: 'es',
        data: { titulo: 'Con borrado', portada: foto.id, autor: editor.id, resumen: 'r', cuerpo: conTarjeta(a.id) as never, _status: 'published' },
        overrideAccess: true,
      })
      await payload.update({
        collection: 'articulos', id: art.id, locale: 'en',
        data: { titulo: 'With deletion', resumen: 'r', cuerpo: conTarjeta(b.id) as never, _status: 'published' },
        overrideAccess: true,
      })
      await payload.delete({ collection: 'lugares', id: b.id, overrideAccess: true })

      const guardado = await payload.update({
        collection: 'articulos', id: art.id, locale: 'es',
        data: { resumen: 'cambio', _status: 'published' },
        overrideAccess: true,
      })
      expect(guardado.lugaresCitados?.map((l) => (typeof l === 'number' ? l : l.id))).toEqual([a.id])
    })
  })
})
