import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { CONTRASENA_PRUEBA, crearUsuario, limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('Users', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('el primer usuario queda como admin aunque no mande rol', async () => {
    const primero = await payload.create({
      collection: 'users',
      data: { email: 'primero@prueba.test', password: CONTRASENA_PRUEBA, nombrePublico: 'Primero' },
      overrideAccess: true,
    })
    expect(primero.rol).toBe('admin')
    const segundo = await payload.create({
      collection: 'users',
      data: { email: 'segundo@prueba.test', password: CONTRASENA_PRUEBA, nombrePublico: 'Segundo' },
      overrideAccess: true,
    })
    expect(segundo.rol).toBe('editor')
  })

  it('crearUsuario devuelve el rol pedido aunque la tabla esté vacía', async () => {
    const editor = await crearUsuario(payload, 'editor')
    expect(editor.rol).toBe('editor')
    const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
    expect(totalDocs).toBe(2)
  })

  it('rechaza contraseñas de menos de 12 caracteres', async () => {
    await expect(
      payload.create({
        collection: 'users',
        data: { email: 'corta@prueba.test', password: 'corta123', nombrePublico: 'Corta' },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/12 caracteres/)
  })

  it('rechaza contraseñas cortas al restablecer la contraseña', async () => {
    const editor = await crearUsuario(payload, 'editor')
    const token = await payload.forgotPassword({
      collection: 'users',
      data: { email: editor.email },
      disableEmail: true,
    })
    await expect(
      payload.resetPassword({
        collection: 'users',
        data: { token, password: 'corta123' },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/12 caracteres/)
    const restablecido = await payload.resetPassword({
      collection: 'users',
      data: { token, password: 'otra-contrasena-larga-456' },
      overrideAccess: true,
    })
    expect(restablecido.user).toBeTruthy()
  })

  it('un editor no puede subirse de rol', async () => {
    await crearUsuario(payload, 'admin')
    const editor = await crearUsuario(payload, 'editor')
    const actualizado = await payload.update({
      collection: 'users',
      id: editor.id,
      data: { rol: 'admin' },
      overrideAccess: false,
      user: editor,
    })
    expect(actualizado.rol).toBe('editor')
  })

  it('un editor no administra a otros usuarios', async () => {
    const admin = await crearUsuario(payload, 'admin')
    const editor = await crearUsuario(payload, 'editor')
    await expect(
      payload.update({ collection: 'users', id: admin.id, data: { nombrePublico: 'X' }, overrideAccess: false, user: editor }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'users',
        data: { email: 'nuevo@prueba.test', password: CONTRASENA_PRUEBA, nombrePublico: 'N', rol: 'editor' },
        overrideAccess: false,
        user: editor,
      }),
    ).rejects.toThrow()
  })

  it('el público no lee usuarios', async () => {
    await crearUsuario(payload, 'admin')
    await expect(payload.find({ collection: 'users', overrideAccess: false })).rejects.toThrow()
  })

  it('solo un admin puede desbloquear cuentas', async () => {
    const admin = await crearUsuario(payload, 'admin')
    const editor = await crearUsuario(payload, 'editor')
    await expect(
      payload.unlock({ collection: 'users', data: { email: admin.email, password: CONTRASENA_PRUEBA }, overrideAccess: false, req: { user: editor } }),
    ).rejects.toThrow()
    await expect(
      payload.unlock({ collection: 'users', data: { email: editor.email, password: CONTRASENA_PRUEBA }, overrideAccess: false, req: { user: admin } }),
    ).resolves.toBe(true)
  })

  it('bloquea tras 5 intentos fallidos durante 10 minutos', () => {
    const auth = payload.collections.users.config.auth
    expect(auth.maxLoginAttempts).toBe(5)
    expect(auth.lockTime).toBe(10 * 60 * 1000)
  })
})
