import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { correrDiario } from '../../src/cron/diario'
import { correrHora } from '../../src/cron/hora'
import { anonimizarSolicitud } from '../../src/solicitudes/anonimizar'
import { crearCategoria, crearImagen, crearLugar, crearZona, limpiar, obtenerPayload } from './utils'

// Registra las etiquetas que revalidan los hooks de las colecciones (fuera de Next, revalidateTag lanza).
const etiquetasDeHooks = vi.hoisted(() => [] as string[])
vi.mock('next/cache', async (original) => ({
  ...(await original<typeof import('next/cache')>()),
  revalidateTag: (etiqueta: string) => {
    etiquetasDeHooks.push(etiqueta)
  },
}))

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

  it('hora: corre la publicación programada (schedulePublish) de punta a punta', async () => {
    const zona = await crearZona(payload)
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    const l = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'programado-x', publicado: false })
    const indice = () =>
      payload.find({ collection: 'indice-busqueda', overrideAccess: true, pagination: false, where: { and: [{ tipo: { equals: 'lugar' } }, { docId: { equals: l.id } }] } })
    expect((await indice()).docs).toEqual([])
    // Como lo encola el admin al programar (Payload 3.92.1, ui/PublishButton/ScheduleDrawer): doc.value va como
    // string aunque el tipo generado diga number; el handler lo convierte de vuelta.
    await payload.jobs.queue({
      task: 'schedulePublish',
      waitUntil: new Date(Date.now() - 60_000),
      input: { type: 'publish', doc: { relationTo: 'lugares', value: String(l.id) as unknown as number } },
    })
    etiquetasDeHooks.length = 0
    const revalidar = vi.fn()
    const r = await correrHora(payload, new Date(), revalidar)
    expect(r.fallos).toEqual([])
    expect((await payload.findByID({ collection: 'lugares', id: l.id, overrideAccess: true, draft: false }))._status).toBe('published')
    expect((await indice()).docs.map((f) => f.idioma)).toEqual(['es'])
    expect(etiquetasDeHooks).toEqual(expect.arrayContaining([`lugar:${l.id}`, 'listados']))
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

  describe('aislamiento de fallos', () => {
    const conIpVieja = async () => {
      const vieja = await payload.create({ collection: 'solicitudes', overrideAccess: true, data: { negocio: 'V', aceptoPrivacidad: true, ipHash: 'a'.repeat(64) } })
      await payload.db.updateOne({ collection: 'solicitudes', where: { id: { equals: vieja.id } }, data: { createdAt: '2026-11-09T07:00:00.000Z' } })
      return vieja
    }
    const ipDe = async (id: number) => (await payload.findByID({ collection: 'solicitudes', id, overrideAccess: true })).ipHash ?? null

    it('hora: un revalidar que lanza no impide purgar el ipHash ni revalidar el resto', async () => {
      const zona = await crearZona(payload)
      const cat = await crearCategoria(payload)
      const img = await crearImagen(payload)
      const l = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'patrocinado-z' })
      await payload.update({ collection: 'lugares', id: l.id, overrideAccess: true, data: { patrocinio: { activo: true, desde: '2026-11-10', hasta: '2026-12-10' } } })
      const vieja = await conIpVieja()
      const revalidar = vi.fn((etiquetas: string[]) => {
        if (etiquetas.includes(`lugar:${l.id}`)) throw new Error('falla una etiqueta')
      })
      const r = await correrHora(payload, new Date('2026-11-10T08:05:00Z'), revalidar)
      expect(revalidar.mock.calls.length).toBeGreaterThan(1)
      expect(r.fallos).toContain(`revalidar:lugar:${l.id}`)
      expect(r.ipBorrados).toBe(1)
      expect(await ipDe(vieja.id)).toBeNull()
    })

    it('hora: si la cola de Payload lanza, igual purga el ipHash', async () => {
      const vieja = await conIpVieja()
      const espia = vi.spyOn(payload.jobs, 'run').mockRejectedValueOnce(new Error('cola caída'))
      const r = await correrHora(payload, new Date('2026-11-10T08:05:00Z'), vi.fn())
      espia.mockRestore()
      expect(r.fallos).toContain('jobs')
      expect(await ipDe(vieja.id)).toBeNull()
    })

    it('diario: una fila que falla no bloquea a las demás y sale en fallidas', async () => {
      const mk = (negocio: string) => payload.create({ collection: 'solicitudes', overrideAccess: true, data: { negocio, aceptoPrivacidad: true, estado: 'rechazada', correo: 'x@ejemplo.invalid' } })
      const a = await mk('A')
      const b = await mk('B')
      const c = await mk('C')
      const anonimizar = vi.fn(async (p: Payload, id: number) => {
        if (id === b.id) throw new Error('falla b')
        await anonimizarSolicitud(p, id)
      })
      const r = await correrDiario(payload, new Date(), anonimizar)
      expect(r.anonimizadas).toBe(2)
      expect(r.fallidas).toEqual([b.id])
      const leer = (id: number) => payload.findByID({ collection: 'solicitudes', id, overrideAccess: true })
      expect((await leer(a.id)).correo).toBeNull()
      expect((await leer(b.id)).correo).toBe('x@ejemplo.invalid')
      expect((await leer(c.id)).correo).toBeNull()
    })

    it('diario: la consulta incluye la que no tiene estadoCambiadoEl (cae a createdAt) y excluye lo reciente y lo aceptado', async () => {
      const mk = (negocio: string, estado: 'nueva' | 'aceptada') => payload.create({ collection: 'solicitudes', overrideAccess: true, data: { negocio, aceptoPrivacidad: true, estado, correo: 'x@ejemplo.invalid' } })
      const sinFecha = await mk('sin-fecha', 'nueva')
      const reciente = await mk('reciente', 'nueva')
      const aceptada = await mk('aceptada-vieja', 'aceptada')
      await payload.db.updateOne({ collection: 'solicitudes', where: { id: { equals: sinFecha.id } }, data: { estadoCambiadoEl: null, createdAt: '2024-01-01T00:00:00.000Z' } })
      await payload.db.updateOne({ collection: 'solicitudes', where: { id: { equals: aceptada.id } }, data: { estadoCambiadoEl: '2024-01-01T00:00:00.000Z' } })
      const r = await correrDiario(payload, new Date())
      expect(r.anonimizadas).toBe(1)
      const leer = (id: number) => payload.findByID({ collection: 'solicitudes', id, overrideAccess: true })
      expect((await leer(sinFecha.id)).correo).toBeNull()
      expect((await leer(reciente.id)).correo).toBe('x@ejemplo.invalid')
      expect((await leer(aceptada.id)).correo).toBe('x@ejemplo.invalid')
    })
  })
})
