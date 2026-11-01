import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { inicioDelDiaGuardado } from '../../src/dominio/fechas'
import { crearCategoria, crearImagen, crearLugar, crearUsuario, crearZona, lexical, limpiar, obtenerPayload } from './utils'

let payload: Payload
let base: { zona: number; categorias: number[]; foto: number }

// Los mensajes de validación personalizados viven en err.data.errors[].message, no en err.message.
const mensajes = (patron: RegExp) => ({
  data: { errors: [expect.objectContaining({ message: expect.stringMatching(patron) })] },
})

describe('Lugares y Eventos', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
    const zona = await crearZona(payload, { slug: 'la-paz' })
    const cat = await crearCategoria(payload, { es: 'cafes', en: 'cafes' })
    const foto = await crearImagen(payload)
    base = { zona: zona.id, categorias: [cat.id], foto: foto.id }
  })

  it('el público no ve borradores', async () => {
    await crearLugar(payload, { ...base, slugEs: 'publicado' })
    await crearLugar(payload, { ...base, slugEs: 'borrador', publicado: false })
    const res = await payload.find({ collection: 'lugares', overrideAccess: false, locale: 'es', fallbackLocale: false })
    expect(res.docs.map((d) => d.slug)).toEqual(['publicado'])
  })

  it('un editor ve borradores', async () => {
    const editor = await crearUsuario(payload, 'editor')
    await crearLugar(payload, { ...base, slugEs: 'borrador', publicado: false })
    const res = await payload.find({ collection: 'lugares', overrideAccess: false, user: editor, draft: true })
    expect(res.totalDocs).toBe(1)
  })

  it('el público nunca recibe la nota interna del patrocinio', async () => {
    const l = await crearLugar(payload, { ...base, slugEs: 'patrocinado' })
    await payload.update({
      collection: 'lugares',
      id: l.id,
      data: { patrocinio: { activo: true, desde: '2026-11-01', hasta: '2026-12-01', notaInterna: 'Pagó 3 meses' }, _status: 'published' },
      overrideAccess: true,
      context: { sinRedirecciones: true },
    })
    const publico = await payload.findByID({ collection: 'lugares', id: l.id, overrideAccess: false })
    expect(publico.patrocinio?.activo).toBe(true)
    expect(publico.patrocinio?.notaInterna).toBeUndefined()
    const editor = await crearUsuario(payload, 'editor')
    const personal = await payload.findByID({ collection: 'lugares', id: l.id, overrideAccess: false, user: editor })
    expect(personal.patrocinio?.notaInterna).toBe('Pagó 3 meses')
  })

  it('un find anónimo sobre un lugar publicado no devuelve la nota interna; el personal sí', async () => {
    const l = await crearLugar(payload, { ...base, slugEs: 'patrocinado-find' })
    await payload.update({
      collection: 'lugares',
      id: l.id,
      data: { patrocinio: { activo: true, desde: '2026-11-01', hasta: '2026-12-01', notaInterna: 'Pagó 3 meses' }, _status: 'published' },
      overrideAccess: true,
      context: { sinRedirecciones: true },
    })
    const anonimo = await payload.find({ collection: 'lugares', overrideAccess: false, locale: 'es', fallbackLocale: false })
    expect(anonimo.docs).toHaveLength(1)
    expect(anonimo.docs[0].patrocinio?.activo).toBe(true)
    expect(anonimo.docs[0].patrocinio?.notaInterna).toBeUndefined()
    expect(JSON.stringify(anonimo)).not.toContain('Pagó 3 meses')

    const editor = await crearUsuario(payload, 'editor')
    const personal = await payload.find({ collection: 'lugares', overrideAccess: false, user: editor, locale: 'es', fallbackLocale: false })
    expect(personal.docs[0].patrocinio?.notaInterna).toBe('Pagó 3 meses')
  })

  it('patrocinio activo sin fechas no valida', async () => {
    const l = await crearLugar(payload, { ...base, slugEs: 'sin-fechas' })
    await expect(
      payload.update({
        collection: 'lugares',
        id: l.id,
        data: { patrocinio: { activo: true }, _status: 'published' },
        overrideAccess: true,
        context: { sinRedirecciones: true },
      }),
    ).rejects.toMatchObject(mensajes(/necesita/))
  })

  it('una fecha de patrocinio «solo día» se lee como ese mismo día en BCS', async () => {
    const l = await crearLugar(payload, { ...base, slugEs: 'dia-solo' })
    const guardado = await payload.update({
      collection: 'lugares',
      id: l.id,
      data: { patrocinio: { activo: true, desde: '2026-11-01', hasta: '2026-12-01' }, _status: 'published' },
      overrideAccess: true,
      context: { sinRedirecciones: true },
    })
    const desde = guardado.patrocinio?.desde as string
    const hasta = guardado.patrocinio?.hasta as string
    expect(desde).toBe('2026-11-01T00:00:00.000Z') // P22: la Local API guarda dayOnly a 00:00Z
    expect(inicioDelDiaGuardado(desde).toISOString()).toBe('2026-11-01T07:00:00.000Z')
    expect(inicioDelDiaGuardado(hasta).toISOString()).toBe('2026-12-01T07:00:00.000Z')
  })

  it('sin idioma de respaldo: un lugar solo en español no trae contenido en inglés', async () => {
    const l = await crearLugar(payload, { ...base, slugEs: 'solo-es' })
    const en = await payload.findByID({ collection: 'lugares', id: l.id, locale: 'en', fallbackLocale: false, overrideAccess: false })
    expect(en.slug ?? null).toBeNull()
    expect(en.resumen ?? null).toBeNull()
  })

  it('editar el resumen en español de un lugar publicado se guarda', async () => {
    const l = await crearLugar(payload, { ...base, slugEs: 'editable', slugEn: 'editable-en' })
    await payload.update({
      collection: 'lugares',
      id: l.id,
      locale: 'es',
      data: { resumen: 'Resumen nuevo', _status: 'published' },
      overrideAccess: true,
      context: { sinRedirecciones: true },
    })
    const es = await payload.findByID({ collection: 'lugares', id: l.id, locale: 'es', fallbackLocale: false, overrideAccess: true })
    const en = await payload.findByID({ collection: 'lugares', id: l.id, locale: 'en', fallbackLocale: false, overrideAccess: true })
    expect(es.resumen).toBe('Resumen nuevo')
    expect(en.resumen).toBe('Summary of editable-en')
  })

  it('un evento necesita lugar o dirección', async () => {
    await expect(
      payload.create({
        collection: 'eventos',
        locale: 'es',
        data: {
          nombre: 'Carnaval',
          zona: base.zona,
          categorias: base.categorias,
          inicio: '2026-11-14T18:00:00-07:00',
          inicio_tz: 'America/Mazatlan',
          fotos: [base.foto],
          resumen: 'r',
          cuerpo: lexical('c'),
          _status: 'published',
        },
        overrideAccess: true,
      }),
    ).rejects.toMatchObject(mensajes(/lugar o una dirección/))
  })

  it('el fin de un evento no puede ser antes de su inicio', async () => {
    await expect(
      payload.create({
        collection: 'eventos',
        locale: 'es',
        data: {
          nombre: 'Carnaval',
          zona: base.zona,
          categorias: base.categorias,
          direccionLibre: 'Malecón',
          inicio: '2026-11-14T18:00:00-07:00',
          inicio_tz: 'America/Mazatlan',
          fin: '2026-11-14T17:00:00-07:00',
          fotos: [base.foto],
          resumen: 'r',
          cuerpo: lexical('c'),
          _status: 'published',
        },
        overrideAccess: true,
      }),
    ).rejects.toMatchObject(mensajes(/posterior/))
  })
})
