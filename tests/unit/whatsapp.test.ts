import { describe, expect, it } from 'vitest'

import { digitosWhatsapp, enlaceWhatsapp, mensajeWhatsapp } from '../../src/dominio/whatsapp'

describe('digitosWhatsapp', () => {
  it('normaliza', () => expect(digitosWhatsapp('+52 (612) 000-0000')).toBe('526120000000'))
  it('rechaza corto y largo', () => {
    expect(digitosWhatsapp('612000')).toBeNull()
    expect(digitosWhatsapp('1'.repeat(16))).toBeNull()
  })
  it('vacío', () => {
    expect(digitosWhatsapp('')).toBeNull()
    expect(digitosWhatsapp(undefined)).toBeNull()
  })
})

describe('enlaceWhatsapp y mensajeWhatsapp', () => {
  it('codifica el mensaje', () => {
    expect(enlaceWhatsapp('5210000000000', 'Hola, ¿qué tal?')).toBe('https://wa.me/5210000000000?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F')
  })
  it('mensaje por idioma', () => {
    expect(mensajeWhatsapp('es', 'La Paz')).toBe('Hola, vengo de la Guía (La Paz). Quiero información de tours.')
    expect(mensajeWhatsapp('en', 'La Paz')).toBe('Hi, I came from the Guide (La Paz). I would like information about tours.')
  })
})
