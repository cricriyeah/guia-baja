import { describe, expect, it } from 'vitest'

import { idiomasSinAviso } from '../../src/dominio/aviso'

const lexical = (t: string) => ({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: t }] }] } })
const vacio = { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } }

describe('idiomasSinAviso', () => {
  it('con texto en los dos idiomas no falta ninguno', () => {
    expect(idiomasSinAviso({ es: lexical('Aviso'), en: lexical('Notice') })).toEqual([])
  })
  it('un idioma ausente, nulo o con solo párrafos vacíos cuenta como faltante', () => {
    expect(idiomasSinAviso({ es: lexical('Aviso') })).toEqual(['en'])
    expect(idiomasSinAviso({ es: null, en: lexical('Notice') })).toEqual(['es'])
    expect(idiomasSinAviso({ es: vacio, en: lexical('  ') })).toEqual(['es', 'en'])
    expect(idiomasSinAviso({})).toEqual(['es', 'en'])
  })
})
