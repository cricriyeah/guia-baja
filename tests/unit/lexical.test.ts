import { describe, expect, it } from 'vitest'

import { lugaresEnCuerpo } from '../../src/dominio/lexical'

const bloque = (blockType: string, extra: Record<string, unknown>) => ({ type: 'block', version: 2, format: '', fields: { id: 'x', blockName: '', blockType, ...extra } })
const cuerpo = (...hijos: unknown[]) => ({ root: { type: 'root', children: hijos } })

describe('lugaresEnCuerpo', () => {
  it('saca los ids de las tarjetas de lugar, sin repetir y en orden', () => {
    const c = cuerpo(bloque('tarjetaLugar', { lugar: 7 }), { type: 'paragraph', children: [] }, bloque('tarjetaLugar', { lugar: { id: 3 } }), bloque('tarjetaLugar', { lugar: 7 }))
    expect(lugaresEnCuerpo(c)).toEqual([7, 3])
  })

  it('ignora otros bloques y nodos anidados sin lugar', () => {
    const c = cuerpo(bloque('tarjetaEvento', { evento: 9 }), { type: 'list', children: [{ type: 'listitem', children: [bloque('tarjetaLugar', { lugar: 4 })] }] })
    expect(lugaresEnCuerpo(c)).toEqual([4])
  })

  it('devuelve vacío con un cuerpo vacío o raro', () => {
    expect(lugaresEnCuerpo(null)).toEqual([])
    expect(lugaresEnCuerpo({})).toEqual([])
    expect(lugaresEnCuerpo(cuerpo(bloque('tarjetaLugar', { lugar: null })))).toEqual([])
  })
})
