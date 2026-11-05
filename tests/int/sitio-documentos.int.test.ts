import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Articulo } from '../../src/payload-types'
import { eventosPublicados } from '../../src/sitio/datos/lecturas/eventos'
import { articulosPublicados, fichaArticulo } from '../../src/sitio/datos/lecturas/articulos'
import { fichaLugar, lugaresPublicados } from '../../src/sitio/datos/lecturas/lugares'
import { textoZonaCategoria } from '../../src/sitio/datos/lecturas/textos'
import { crearCategoria, crearImagen, crearLugar, crearUsuario, crearZona, lexical, limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('lecturas de documentos del sitio', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('lugaresPublicados: sin borradores y sin idioma de respaldo', async () => {
    const zona = await crearZona(payload, { slug: 'zona-lista' })
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    const publicado = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'publicado-x' })
    await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'borrador-x', publicado: false })
    const lista = await lugaresPublicados(payload, 'es')
    expect(lista.map((l) => l.id)).toEqual([publicado.id])
    // La tarjeta lee el slug de la zona poblada: con la zona como id quedaría vacío sin avisar.
    expect(lista.every((l) => l.zonaSlug === 'zona-lista')).toBe(true)
    expect(lista[0].foto?.src).toBeTruthy()
    // crearLugar solo llena el español: en inglés no existe.
    expect(await lugaresPublicados(payload, 'en')).toEqual([])
  })

  it('un lugar despublicado deja de salir', async () => {
    const zona = await crearZona(payload)
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    const lugar = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'va-a-salir' })
    expect((await lugaresPublicados(payload, 'es')).map((l) => l.id)).toEqual([lugar.id])
    await payload.update({ collection: 'lugares', id: lugar.id, locale: 'es', data: { _status: 'draft' }, overrideAccess: true, context: { sinRedirecciones: true } })
    expect(await lugaresPublicados(payload, 'es')).toEqual([])
  })

  it('lugares y eventos de una zona inactiva no salen en las listas ni en la ficha', async () => {
    const zona = await crearZona(payload, { activa: false })
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    const lugar = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'en-zona-inactiva' })
    await payload.create({
      collection: 'eventos', locale: 'es', overrideAccess: true,
      data: {
        nombre: 'Evento en zona inactiva', zona: zona.id, categorias: [cat.id], direccionLibre: 'Malecón', fotos: [img.id],
        inicio: '2030-11-14T18:00:00-07:00', inicio_tz: 'America/Mazatlan', resumen: 'r', cuerpo: lexical('c'), _status: 'published',
      },
    })
    expect(await lugaresPublicados(payload, 'es')).toEqual([])
    expect(await eventosPublicados(payload, 'es')).toEqual([])
    expect(await fichaLugar(payload, lugar.id, 'es')).toBeNull()
  })

  it('fichaArticulo: cuerpo sin poblar, portada e imágenes del cuerpo resueltas', async () => {
    const zona = await crearZona(payload)
    const cat = await crearCategoria(payload)
    const portada = await crearImagen(payload)
    const lugar = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: portada.id, slugEs: 'citado-x' })
    const editor = await crearUsuario(payload, 'editor')
    const foto = await crearImagen(payload)
    const cuerpo: NonNullable<Articulo['cuerpo']> = {
      root: {
        type: 'root', direction: null, format: '', indent: 0, version: 1,
        children: [
          ...lexical('Texto').root.children,
          { type: 'block', version: 2, format: '', fields: { id: 'b1', blockName: '', blockType: 'tarjetaLugar', lugar: lugar.id } },
          { type: 'upload', version: 3, format: '', relationTo: 'media', value: foto.id, fields: null },
        ],
      },
    }
    const a = await payload.create({
      collection: 'articulos', locale: 'es', overrideAccess: true,
      data: { titulo: 'Siete mesas', resumen: 'r', cuerpo, portada: portada.id, autor: editor.id, zonas: [zona.id], _status: 'published' },
    })
    const ficha = await fichaArticulo(payload, a.id, 'es')
    expect(ficha?.portada?.src).toBeTruthy()
    expect(Object.keys(ficha?.media ?? {})).toEqual(expect.arrayContaining([String(portada.id), String(foto.id)]))
    const bloque = (ficha?.cuerpo as { root: { children: { type: string; fields?: { lugar?: unknown } }[] } }).root.children.find((n) => n.type === 'block')
    expect(bloque?.fields?.lugar).toBe(lugar.id)
    expect((await articulosPublicados(payload, 'es'))[0].lugaresCitados).toEqual([lugar.id])
  })

  it('textoZonaCategoria por par e idioma', async () => {
    const zona = await crearZona(payload)
    const cat = await crearCategoria(payload)
    await payload.create({ collection: 'textos-zona-categoria', locale: 'es', overrideAccess: true, data: { zona: zona.id, categoria: cat.id, introduccion: 'Hola' } })
    expect(await textoZonaCategoria(payload, zona.id, cat.id, 'es')).toEqual({ introduccion: 'Hola' })
    expect(await textoZonaCategoria(payload, zona.id, cat.id, 'en')).toBeNull()
  })
})
