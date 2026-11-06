import { describe, expect, it } from 'vitest'

import { validarSolicitud } from '../../src/dominio/solicitud'

const base = { negocio: 'Café Duna', correo: 'hola@ejemplo.invalid', aceptoPrivacidad: 'on' }

describe('validarSolicitud (spec §11, decisiones F1)', () => {
  it('mínimo válido: negocio, correo o teléfono, y aceptación', () => {
    const r = validarSolicitud(base)
    expect(r).toEqual({
      ok: true,
      datos: { negocio: 'Café Duna', giro: null, zonaId: null, zonaTexto: null, contactoNombre: null, correo: 'hola@ejemplo.invalid', telefono: null, webOInstagram: null, mensaje: null },
    })
    expect(validarSolicitud({ negocio: 'X', telefono: '+52 612 000 0000', aceptoPrivacidad: 'on' }).ok).toBe(true)
  })

  it('errores por campo', () => {
    expect(validarSolicitud({ aceptoPrivacidad: 'on', correo: 'a@b.mx' })).toEqual({ ok: false, errores: { negocio: 'requerido' } })
    expect(validarSolicitud({ negocio: 'X', aceptoPrivacidad: 'on' })).toEqual({ ok: false, errores: { correo: 'contacto', telefono: 'contacto' } })
    expect(validarSolicitud({ ...base, correo: 'no-es-correo' })).toEqual({ ok: false, errores: { correo: 'formato' } })
    expect(validarSolicitud({ ...base, telefono: '12' })).toEqual({ ok: false, errores: { telefono: 'formato' } })
    expect(validarSolicitud({ ...base, aceptoPrivacidad: undefined })).toEqual({ ok: false, errores: { aceptoPrivacidad: 'acepto' } })
    expect(validarSolicitud({ ...base, mensaje: 'x'.repeat(2001) })).toEqual({ ok: false, errores: { mensaje: 'largo' } })
  })

  it('zona: id de la lista o texto libre', () => {
    const r = validarSolicitud({ ...base, zona: '3' })
    expect(r.ok && r.datos.zonaId).toBe(3)
    const o = validarSolicitud({ ...base, zona: 'otra', zonaTexto: 'Todos Santos' })
    expect(o.ok && [o.datos.zonaId, o.datos.zonaTexto]).toEqual([null, 'Todos Santos'])
  })

  it('correo: acepta una dirección normal y rechaza lo que el campo email de Payload rechaza', () => {
    expect(validarSolicitud({ ...base, correo: 'hola.dueno+duna@sub-dominio.ejemplo.mx' }).ok).toBe(true)
    for (const correo of ['a@b..mx', 'a@b.mx.', 'a@-b.mx', 'a@b.c1', 'a@café.mx']) {
      expect(validarSolicitud({ ...base, correo })).toEqual({ ok: false, errores: { correo: 'formato' } })
    }
  })

  it('zona numérica: más de 9 dígitos o cero es formato; zona fuera de la lista es formato', () => {
    expect(validarSolicitud({ ...base, zona: '1234567890' })).toEqual({ ok: false, errores: { zona: 'formato' } })
    expect(validarSolicitud({ ...base, zona: '0' })).toEqual({ ok: false, errores: { zona: 'formato' } })
    expect(validarSolicitud({ ...base, zona: 'Loreto' })).toEqual({ ok: false, errores: { zona: 'formato' } })
    const r = validarSolicitud({ ...base, zona: '999999999' })
    expect(r.ok && r.datos.zonaId).toBe(999999999)
  })

  it('zona «otra» exige texto en zonaTexto', () => {
    expect(validarSolicitud({ ...base, zona: 'otra', zonaTexto: '  ' })).toEqual({ ok: false, errores: { zonaTexto: 'requerido' } })
  })
})
