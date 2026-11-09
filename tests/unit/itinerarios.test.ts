import { describe, expect, it } from 'vitest'

import { clavesDeItinerario, lugaresDeParadas, paradasValidas, paradaVisible, type Dia } from '../../src/dominio/itinerarios'

const p = (extra: Partial<Dia['paradas'][number]> = {}) => ({ hora: null, lugarId: null, tour: null, nota: null, ...extra })
const dias: Dia[] = [
  { titulo: 'Uno', paradas: [p({ tour: 'servicio:a', lugarId: 1 }), p({ tour: 'servicio:b' })] },
  { titulo: null, paradas: [p({ tour: 'servicio:a', lugarId: 2 }), p({ lugarId: 1 })] },
]

describe('itinerarios', () => {
  it('claves distintas en orden', () => expect(clavesDeItinerario(dias)).toEqual(['servicio:a', 'servicio:b']))
  it('lugares distintos en orden', () => expect(lugaresDeParadas(dias)).toEqual([1, 2]))
  it('parada visible', () => {
    expect(paradaVisible({ nota: null }, false, false)).toBe(false)
    expect(paradaVisible({ nota: 'x' }, false, false)).toBe(true)
    expect(paradaVisible({ nota: null }, true, false)).toBe(true)
    expect(paradaVisible({ nota: null }, false, true)).toBe(true)
  })
})

describe('paradasValidas', () => {
  const vacia = [{ paradas: [{ hora: null, lugar: null, tour: null, nota: null }] }]
  it('parada vacía en es: rechazada', () => expect(paradasValidas(vacia, 'es')).not.toBe(true))
  it('en en pasa: la nota está localizada', () => expect(paradasValidas(vacia, 'en')).toBe(true))
  it('con lugar, tour o nota en es: válida', () => {
    expect(paradasValidas([{ paradas: [{ lugar: 1 }] }], 'es')).toBe(true)
    expect(paradasValidas([{ paradas: [{ tour: 'servicio:a' }] }], 'es')).toBe(true)
    expect(paradasValidas([{ paradas: [{ nota: 'x' }] }], 'es')).toBe(true)
  })
})
