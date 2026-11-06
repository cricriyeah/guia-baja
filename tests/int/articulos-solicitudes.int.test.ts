import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { crearImagen, crearUsuario, lexical, limpiar, obtenerPayload } from './utils'

let payload: Payload

const solicitud = {
  negocio: 'Café Prueba', giro: 'Cafetería', zonaTexto: 'La Paz', contactoNombre: 'Ana', correo: 'ana@prueba.test',
  aceptoPrivacidad: true, versionAviso: '2026-11',
}

describe('Artículos, Solicitudes y Ajustes', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('copia el nombre público del autor al artículo', async () => {
    const editor = await crearUsuario(payload, 'editor')
    const portada = await crearImagen(payload)
    const a = await payload.create({
      collection: 'articulos',
      locale: 'es',
      data: { titulo: 'Qué hacer en La Paz', portada: portada.id, autor: editor.id, resumen: 'r', cuerpo: lexical('c'), _status: 'published' },
      overrideAccess: true,
    })
    expect(a.autorNombre).toBe('Persona editor')
    expect(a.slug).toBe('que-hacer-en-la-paz')
  })

  it('editar un campo localizado en es de un artículo publicado se guarda (el hook no pisa el idioma)', async () => {
    const editor = await crearUsuario(payload, 'editor')
    const portada = await crearImagen(payload)
    const a = await payload.create({
      collection: 'articulos',
      locale: 'es',
      data: { titulo: 'Guía del malecón', portada: portada.id, autor: editor.id, resumen: 'viejo', cuerpo: lexical('c'), _status: 'published' },
      overrideAccess: true,
    })
    const act = await payload.update({
      collection: 'articulos', id: a.id, locale: 'es', data: { resumen: 'nuevo' }, overrideAccess: true,
    })
    expect(act.resumen).toBe('nuevo')
    expect(act.autorNombre).toBe('Persona editor')
  })

  it('el público solo lee artículos publicados', async () => {
    const editor = await crearUsuario(payload, 'editor')
    const portada = await crearImagen(payload)
    await payload.create({
      collection: 'articulos', locale: 'es',
      data: { titulo: 'Borrador secreto', portada: portada.id, autor: editor.id, _status: 'draft' },
      overrideAccess: true,
    })
    const publico = await payload.find({ collection: 'articulos', locale: 'es', overrideAccess: false })
    expect(publico.totalDocs).toBe(0)
  })

  it('el público no puede crear ni leer Solicitudes', async () => {
    await expect(payload.create({ collection: 'solicitudes', data: solicitud, overrideAccess: false })).rejects.toThrow()
    await payload.create({ collection: 'solicitudes', data: solicitud, overrideAccess: true })
    await expect(payload.find({ collection: 'solicitudes', overrideAccess: false })).rejects.toThrow()
  })

  it('un editor tampoco puede crear Solicitudes por la API', async () => {
    const editor = await crearUsuario(payload, 'editor')
    await expect(
      payload.create({ collection: 'solicitudes', data: solicitud, overrideAccess: false, user: editor }),
    ).rejects.toThrow()
  })

  it('una Solicitud exige aceptar el aviso de privacidad', async () => {
    await expect(
      payload.create({ collection: 'solicitudes', data: { ...solicitud, aceptoPrivacidad: false }, overrideAccess: true }),
    ).rejects.toMatchObject({
      data: { errors: [expect.objectContaining({ message: expect.stringMatching(/aviso de privacidad/) })] },
    })
  })

  it('una Solicitud nueva queda en estado «nueva»', async () => {
    const s = await payload.create({ collection: 'solicitudes', data: solicitud, overrideAccess: true })
    expect(s.estado).toBe('nueva')
  })

  it('un editor ve y actualiza Solicitudes', async () => {
    const editor = await crearUsuario(payload, 'editor')
    const s = await payload.create({ collection: 'solicitudes', data: solicitud, overrideAccess: true })
    const act = await payload.update({
      collection: 'solicitudes', id: s.id, data: { estado: 'en-contacto' }, overrideAccess: false, user: editor,
    })
    expect(act.estado).toBe('en-contacto')
    const lista = await payload.find({ collection: 'solicitudes', overrideAccess: false, user: editor })
    expect(lista.totalDocs).toBe(1)
  })

  it('el Global: el público lee lo público y el correo de privacidad, nunca los correos de aviso; un editor no lo edita', async () => {
    const admin = await crearUsuario(payload, 'admin')
    await payload.updateGlobal({
      slug: 'ajustes-guia',
      data: { correosAviso: [{ correo: 'avisos@prueba.test' }], correoPrivacidad: 'privacidad@prueba.test', formularioActivo: false },
      overrideAccess: false,
      user: admin,
    })
    const publico = await payload.findGlobal({ slug: 'ajustes-guia', overrideAccess: false })
    expect(publico.formularioActivo).toBe(false)
    // Payload deja un array vacío (no el valor) cuando el acceso de lectura del campo se niega.
    expect(publico.correosAviso ?? []).toEqual([])
    expect(publico.correoPrivacidad).toBe('privacidad@prueba.test')
    const editor = await crearUsuario(payload, 'editor')
    const paraPersonal = await payload.findGlobal({ slug: 'ajustes-guia', overrideAccess: false, user: editor })
    expect(paraPersonal.correosAviso).toHaveLength(1)
    expect(paraPersonal.correoPrivacidad).toBe('privacidad@prueba.test')
    await expect(
      payload.updateGlobal({ slug: 'ajustes-guia', data: { formularioActivo: true }, overrideAccess: false, user: editor }),
    ).rejects.toThrow()
  })

  it('estadoCambiadoEl se fija al crear y solo cambia si cambia el estado', async () => {
    const s = await payload.create({ collection: 'solicitudes', data: { negocio: 'N', aceptoPrivacidad: true }, overrideAccess: true })
    expect(s.estadoCambiadoEl).toBeTruthy()
    const nota = await payload.update({ collection: 'solicitudes', id: s.id, data: { notasInternas: 'llamar' }, overrideAccess: true })
    expect(nota.estadoCambiadoEl).toBe(s.estadoCambiadoEl)
    await new Promise((r) => setTimeout(r, 20))
    const cambio = await payload.update({ collection: 'solicitudes', id: s.id, data: { estado: 'en-contacto' }, overrideAccess: true })
    expect(new Date(cambio.estadoCambiadoEl as string).getTime()).toBeGreaterThan(new Date(s.estadoCambiadoEl as string).getTime())
  })

  it('estadoCambiadoEl no se puede fijar desde fuera: sin cambio de estado, el valor guardado no cambia', async () => {
    const s = await payload.create({ collection: 'solicitudes', data: { negocio: 'N', aceptoPrivacidad: true }, overrideAccess: true })
    await payload.update({
      collection: 'solicitudes',
      id: s.id,
      data: { estadoCambiadoEl: '2020-01-01T00:00:00.000Z' },
      overrideAccess: true,
    })
    const guardada = await payload.findByID({ collection: 'solicitudes', id: s.id, overrideAccess: true })
    expect(guardada.estadoCambiadoEl).toBe(s.estadoCambiadoEl)
  })
})
