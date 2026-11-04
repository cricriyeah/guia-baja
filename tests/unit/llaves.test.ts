import { describe, expect, it } from 'vitest'

import { LLAVES } from '../../src/sitio/datos/llaves'

describe('llaves y etiquetas de las lecturas cacheadas (spec §10)', () => {
  it('las listas y lecturas por slug llevan etiquetas de colección', () => {
    expect(LLAVES.zonasActivas('es')).toEqual({ llave: ['zonasActivas', 'es'], etiquetas: ['media', 'zonas'] })
    expect(LLAVES.categorias('en')).toEqual({ llave: ['categorias', 'en'], etiquetas: ['categorias'] })
    expect(LLAVES.ajustes('es')).toEqual({ llave: ['ajustes', 'es'], etiquetas: ['ajustes'] })
    expect(LLAVES.redirecciones()).toEqual({ llave: ['redirecciones'], etiquetas: ['redirecciones'] })
  })

  it('cada idioma tiene su llave', () => {
    expect(LLAVES.zonasActivas('es').llave).not.toEqual(LLAVES.zonasActivas('en').llave)
  })
})
