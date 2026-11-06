import { describe, expect, it } from 'vitest'

import { LLAVES } from '../../src/sitio/datos/llaves'

describe('llaves y etiquetas de las lecturas cacheadas (spec §10)', () => {
  it('las listas y lecturas por slug llevan etiquetas de colección', () => {
    expect(LLAVES.zonasActivas('es')).toEqual({ llave: ['zonasActivas', 'es'], etiquetas: ['media', 'zonas'] })
    expect(LLAVES.categorias('en')).toEqual({ llave: ['categorias', 'en'], etiquetas: ['categorias'] })
    expect(LLAVES.ajustes('es')).toEqual({ llave: ['ajustes', 'es'], etiquetas: ['ajustes'] })
    expect(LLAVES.redirecciones()).toEqual({ llave: ['redirecciones'], etiquetas: ['redirecciones'] })
  })

  it('listas, fichas y textos', () => {
    expect(LLAVES.lugares('es')).toEqual({ llave: ['lugares', 'es'], etiquetas: ['categorias', 'listados', 'media', 'zonas'] })
    expect(LLAVES.fichaLugar(7, 'en')).toEqual({ llave: ['fichaLugar', '7', 'en'], etiquetas: ['categorias', 'lugar:7', 'media', 'zonas'] })
    expect(LLAVES.fichaArticulo(8, 'es').etiquetas).toContain('articulo:8')
    expect(LLAVES.texto(1, 2, 'es')).toEqual({ llave: ['texto', '1', '2', 'es'], etiquetas: ['textos:1:2'] })
  })

  it('coincidencias: llave sin hora ni página', () => {
    expect(LLAVES.coincidencias('cafe', 'es', null, null)).toEqual({
      llave: ['coincidencias', 'cafe', 'es', '', ''],
      etiquetas: ['categorias', 'listados', 'zonas'],
    })
    expect(LLAVES.coincidencias('cafe', 'en', 'lugar', 3).llave).toEqual(['coincidencias', 'cafe', 'en', 'lugar', '3'])
  })

  it('cada idioma tiene su llave', () => {
    expect(LLAVES.zonasActivas('es').llave).not.toEqual(LLAVES.zonasActivas('en').llave)
  })
})
