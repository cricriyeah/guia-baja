import { describe, expect, it } from 'vitest'

import { CAMPOS_FORMULARIO, mensajeDeError } from '../../src/formulario/mensajes'
import { validarSolicitud } from '../../src/dominio/solicitud'
import { textos } from '../../src/sitio/textos'

// Todo error que la validación del servidor puede devolver debe tener un lugar y un mensaje en la página, en los dos idiomas.
const largo = (n: number) => 'x'.repeat(n)
const FORMULARIOS: Record<string, string>[] = [
  {},
  { negocio: largo(500), giro: largo(500), zonaTexto: largo(500), contactoNombre: largo(500), correo: `${largo(500)}@a.com`, telefono: largo(500), webOInstagram: largo(500), mensaje: largo(5000), zona: 'otra', aceptoPrivacidad: 'on' },
  { negocio: 'Cocina', correo: 'no-es-correo', telefono: 'abc', zona: 'abc', aceptoPrivacidad: 'on' },
  { negocio: 'Cocina', correo: 'a@b.mx', zona: 'otra', aceptoPrivacidad: 'on' },
]

describe('mensajes de error del formulario', () => {
  const errores = FORMULARIOS.flatMap((f) => {
    const v = validarSolicitud(f)
    return v.ok ? [] : Object.entries(v.errores)
  })

  it('los formularios de prueba cubren todos los códigos y campos posibles', () => {
    expect(new Set(errores.map(([, c]) => c))).toEqual(new Set(['requerido', 'largo', 'formato', 'contacto', 'acepto']))
    expect(new Set(errores.map(([k]) => k))).toEqual(new Set(CAMPOS_FORMULARIO))
  })

  it.each(['es', 'en'] as const)('cada campo con error está en la página y tiene mensaje (%s)', (lang) => {
    for (const [campo, codigo] of errores) {
      expect(CAMPOS_FORMULARIO, campo).toContain(campo)
      expect(mensajeDeError(lang, campo, codigo).length, `${campo}:${codigo}`).toBeGreaterThan(5)
    }
  })

  it('«requerido» del texto de la zona no habla del nombre del negocio', () => {
    expect(mensajeDeError('es', 'zonaTexto', 'requerido')).toBe(textos('es').formulario.zonaTextoRequerido)
    expect(mensajeDeError('es', 'negocio', 'requerido')).toBe('Escribe el nombre del negocio.')
  })

  it('un código desconocido cae en el mensaje de formato en vez de pintar «undefined»', () => {
    expect(mensajeDeError('es', 'negocio', 'inventado')).toBe('Revisa este dato.')
  })
})
