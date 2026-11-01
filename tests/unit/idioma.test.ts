import { describe, expect, it } from 'vitest'

import { aplanarIdioma, existeEnIdioma, tieneValor } from '../../src/dominio/idioma'

const lexical = (texto: string) => ({
  root: { type: 'root', children: [{ type: 'paragraph', children: texto ? [{ type: 'text', text: texto }] : [] }] },
})

describe('tieneValor', () => {
  it('texto vacío o en blanco no cuenta', () => {
    expect(tieneValor('')).toBe(false)
    expect(tieneValor('   ')).toBe(false)
    expect(tieneValor(null)).toBe(false)
    expect(tieneValor(undefined)).toBe(false)
  })
  it('texto con contenido cuenta', () => expect(tieneValor('hola')).toBe(true))
  it('Lexical sin texto no cuenta', () => expect(tieneValor(lexical(''))).toBe(false))
  it('Lexical con texto cuenta', () => expect(tieneValor(lexical('Hola'))).toBe(true))
})

describe('existeEnIdioma', () => {
  const campos = ['slug', 'resumen', 'cuerpo'] as const
  it('existe si todos los campos tienen valor', () => {
    expect(existeEnIdioma({ slug: 'a', resumen: 'r', cuerpo: lexical('c') }, campos)).toBe(true)
  })
  it('no existe si falta uno', () => {
    expect(existeEnIdioma({ slug: 'a', resumen: '', cuerpo: lexical('c') }, campos)).toBe(false)
    expect(existeEnIdioma({ slug: 'a', resumen: 'r', cuerpo: lexical('') }, campos)).toBe(false)
  })
})

describe('aplanarIdioma', () => {
  it('toma el valor del idioma en los campos localizados y deja los demás igual', () => {
    const doc = { nombre: 'Café Luna', slug: { es: 'cafe-luna', en: 'luna-cafe' }, cuerpo: { es: lexical('x') } }
    expect(aplanarIdioma(doc, 'en', ['slug', 'cuerpo'])).toEqual({
      nombre: 'Café Luna',
      slug: 'luna-cafe',
      cuerpo: undefined,
    })
  })
})
