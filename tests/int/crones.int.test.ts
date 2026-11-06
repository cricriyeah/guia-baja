import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { correrDiario } from '../../src/cron/diario'
import { correrHora } from '../../src/cron/hora'
import { anonimizarSolicitud } from '../../src/solicitudes/anonimizar'
import { crearCategoria, crearImagen, crearLugar, crearZona, limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('crones (spec §10, §12)', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('hora: revalida lo que cambió por fechas y borra ipHash de más de 24 h', async () => {
    const zona = await crearZona(payload)
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    const l = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'patrocinado-x' })
    await payload.update({ collection: 'lugares', id: l.id, overrideAccess: true, data: { patrocinio: { activo: true, desde: '2026-11-10', hasta: '2026-12-10' } } })
    const vieja = await payload.create({ collection: 'solicitudes', overrideAccess: true, data: { negocio: 'V', aceptoPrivacidad: true, ipHash: 'a'.repeat(64) } })
    const nueva = await payload.create({ collection: 'solicitudes', overrideAccess: true, data: { negocio: 'N', aceptoPrivacidad: true, ipHash: 'b'.repeat(64) } })
    const ahora = new Date('2026-11-10T08:05:00Z')
    await payload.db.updateOne({ collection: 'solicitudes', where: { id: { equals: vieja.id } }, data: { createdAt: '2026-11-09T07:00:00.000Z' } })
    await payload.db.updateOne({ collection: 'solicitudes', where: { id: { equals: nueva.id } }, data: { createdAt: '2026-11-10T07:00:00.000Z' } })
    const revalidar = vi.fn()
    const r = await correrHora(payload, ahora, revalidar)
    expect(revalidar.mock.calls.flat(2)).toContain(`lugar:${l.id}`)
    expect(r.ipBorrados).toBe(1)
    expect((await payload.findByID({ collection: 'solicitudes', id: vieja.id, overrideAccess: true })).ipHash ?? null).toBeNull()
    expect((await payload.findByID({ collection: 'solicitudes', id: nueva.id, overrideAccess: true })).ipHash).toBe('b'.repeat(64))
  })

  it('hora: sin cambios en la ventana no revalida', async () => {
    const zona = await crearZona(payload)
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    const l = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'patrocinado-y' })
    await payload.update({ collection: 'lugares', id: l.id, overrideAccess: true, data: { patrocinio: { activo: true, desde: '2026-11-10', hasta: '2026-12-10' } } })
    const revalidar = vi.fn()
    const r = await correrHora(payload, new Date('2026-11-20T12:00:00Z'), revalidar)
    expect(revalidar).not.toHaveBeenCalled()
    expect(r.revalidadas).toBe(0)
  })

  it('diario: anonimiza rechazadas y las viejas sin cambio; no toca aceptadas', async () => {
    const mk = (estado: 'rechazada' | 'en-contacto' | 'aceptada') => payload.create({ collection: 'solicitudes', overrideAccess: true, data: { negocio: estado, aceptoPrivacidad: true, estado, correo: 'x@ejemplo.invalid', mensaje: 'hola' } })
    const rech = await mk('rechazada')
    const vieja = await mk('en-contacto')
    const acep = await mk('aceptada')
    await payload.db.updateOne({ collection: 'solicitudes', where: { id: { equals: vieja.id } }, data: { estadoCambiadoEl: '2024-01-01T00:00:00.000Z' } })
    const r = await correrDiario(payload, new Date())
    expect(r.anonimizadas).toBe(2)
    const leer = (id: number) => payload.findByID({ collection: 'solicitudes', id, overrideAccess: true })
    expect(await leer(rech.id)).toMatchObject({ correo: null, mensaje: null, negocio: 'rechazada' })
    expect((await leer(rech.id)).anonimizadaEl).toBeTruthy()
    expect((await leer(acep.id)).correo).toBe('x@ejemplo.invalid')
  })

  it('anonimizarSolicitud: borra solo los campos personales, es idempotente y no reinicia estadoCambiadoEl', async () => {
    const s = await payload.create({
      collection: 'solicitudes',
      overrideAccess: true,
      data: { negocio: 'Negocio', aceptoPrivacidad: true, estado: 'rechazada', contactoNombre: 'Ana', correo: 'x@ejemplo.invalid', telefono: '612 000 0000', webOInstagram: '@negocio', mensaje: 'hola', ipHash: 'c'.repeat(64) },
    })
    const antes = await payload.findByID({ collection: 'solicitudes', id: s.id, overrideAccess: true })
    await anonimizarSolicitud(payload, s.id)
    const uno = await payload.findByID({ collection: 'solicitudes', id: s.id, overrideAccess: true })
    expect(uno).toMatchObject({ contactoNombre: null, correo: null, telefono: null, webOInstagram: null, mensaje: null, ipHash: null, negocio: 'Negocio', estado: 'rechazada' })
    expect(uno.anonimizadaEl).toBeTruthy()
    expect(uno.estadoCambiadoEl).toBe(antes.estadoCambiadoEl)
    await anonimizarSolicitud(payload, s.id)
    const dos = await payload.findByID({ collection: 'solicitudes', id: s.id, overrideAccess: true })
    expect(dos.anonimizadaEl).toBe(uno.anonimizadaEl)
    expect(dos.updatedAt).toBe(uno.updatedAt)
  })
})
