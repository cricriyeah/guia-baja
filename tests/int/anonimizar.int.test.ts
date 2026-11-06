import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { Solicitudes } from '../../src/collections/Solicitudes'
import { crearUsuario, limpiar, obtenerPayload } from './utils'

let payload: Payload

// Llama al handler del endpoint como lo haría Payload: con el usuario de la sesión y el id de la ruta.
function llamar(user: unknown, id: string) {
  const endpoints = Solicitudes.endpoints || []
  const handler = endpoints.find((e) => e.path === '/:id/anonimizar')?.handler
  if (!handler) throw new Error('falta el endpoint /:id/anonimizar')
  return handler({ payload, user, routeParams: { id } } as never) as Promise<Response>
}

async function crearAceptada(correo = 'x@ejemplo.invalid') {
  return payload.create({
    collection: 'solicitudes',
    overrideAccess: true,
    data: { negocio: 'N', aceptoPrivacidad: true, estado: 'aceptada', correo, contactoNombre: 'Ana', telefono: '6121234567' },
  })
}

describe('acción de anonimizar (spec §12)', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('solo un Admin puede; borra los datos personales', async () => {
    const s = await crearAceptada()
    const editor = await crearUsuario(payload, 'editor')
    const negado = await llamar(editor, String(s.id))
    expect(negado.status).toBe(403)
    const admin = await crearUsuario(payload, 'admin')
    const ok = await llamar(admin, String(s.id))
    expect(ok.status).toBe(200)
    const tras = await payload.findByID({ collection: 'solicitudes', id: s.id, overrideAccess: true })
    expect(tras.correo ?? null).toBeNull()
    expect(tras.contactoNombre ?? null).toBeNull()
    expect(tras.telefono ?? null).toBeNull()
    expect(tras.anonimizadaEl).toBeTruthy()
    expect(tras.negocio).toBe('N')
  })

  it('sin sesión responde 403 y no toca la Solicitud', async () => {
    const s = await crearAceptada()
    const r = await llamar(null, String(s.id))
    expect(r.status).toBe(403)
    const tras = await payload.findByID({ collection: 'solicitudes', id: s.id, overrideAccess: true })
    expect(tras.correo).toBe('x@ejemplo.invalid')
    expect(tras.anonimizadaEl ?? null).toBeNull()
  })

  it('un id que no es entero responde 400', async () => {
    const admin = await crearUsuario(payload, 'admin')
    expect((await llamar(admin, 'abc')).status).toBe(400)
    expect((await llamar(admin, '1.5')).status).toBe(400)
  })

  it('un id que no existe responde 404, no 500', async () => {
    const admin = await crearUsuario(payload, 'admin')
    expect((await llamar(admin, '999999')).status).toBe(404)
  })

  it('una Solicitud ya anonimizada responde 200 y conserva su fecha de anonimización', async () => {
    const s = await crearAceptada()
    const admin = await crearUsuario(payload, 'admin')
    await llamar(admin, String(s.id))
    const primera = await payload.findByID({ collection: 'solicitudes', id: s.id, overrideAccess: true })
    const r = await llamar(admin, String(s.id))
    expect(r.status).toBe(200)
    const segunda = await payload.findByID({ collection: 'solicitudes', id: s.id, overrideAccess: true })
    expect(segunda.correo ?? null).toBeNull()
    expect(segunda.anonimizadaEl).toBe(primera.anonimizadaEl)
  })

  it('si falla, el log lleva el id y el nombre del error, nunca datos personales', async () => {
    const s = await crearAceptada('secreto@ejemplo.invalid')
    const admin = await crearUsuario(payload, 'admin')
    const error = Object.assign(new Error('fallo con secreto@ejemplo.invalid'), { name: 'ValidationError' })
    vi.spyOn(payload, 'update').mockRejectedValueOnce(error)
    const registro = vi.spyOn(payload.logger, 'error')
    const r = await llamar(admin, String(s.id))
    expect(r.status).toBe(500)
    const texto = JSON.stringify(registro.mock.calls)
    expect(texto).toContain(String(s.id))
    expect(texto).toContain('ValidationError')
    expect(texto).not.toContain('secreto@ejemplo.invalid')
    vi.restoreAllMocks()
  })
})
