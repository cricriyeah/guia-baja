import { describe, expect, it } from 'vitest'

import { etiquetasQuiz, jornadaDe, puntuarTours, razonTour, toursDelQuiz } from '../../src/dominio/perfil-tour'

const tour = (clave: string, extra: Partial<{ gustos: string[]; paraQuien: string[]; jornada: string | null; meses: number[] }> = {}) => ({
  clave, gustos: ['mar-y-animales'], paraQuien: [] as string[], jornada: null as string | null, meses: [] as number[], ...extra,
})

describe('jornadaDe', () => {
  it('respeta la jornada escrita', () => expect(jornadaDe('servicio', 'medio-dia')).toBe('medio-dia'))
  it('un paquete sin jornada cuenta como varios días', () => expect(jornadaDe('paquete', null)).toBe('varios-dias'))
  it('un servicio sin jornada no tiene', () => expect(jornadaDe('servicio', undefined)).toBeNull())
})

describe('puntuarTours', () => {
  it('el gusto es obligatorio: nunca gana un tour de otro gusto', () => {
    const otro = tour('otro', { gustos: ['aventura'], paraQuien: ['familia'], jornada: 'medio-dia', meses: [3] })
    const bueno = tour('bueno')
    expect(puntuarTours([otro, bueno], { gusto: 'mar-y-animales', paraQuien: 'familia', jornada: 'medio-dia' }, 3)).toEqual([bueno])
  })
  it('suma un punto por para quién, por jornada y por temporada', () => {
    const uno = tour('uno', { paraQuien: ['familia'] })
    const tres = tour('tres', { paraQuien: ['familia'], jornada: 'medio-dia', meses: [3] })
    const cero = tour('cero')
    expect(puntuarTours([cero, uno, tres], { gusto: 'mar-y-animales', paraQuien: 'familia', jornada: 'medio-dia' }, 3)?.map((t) => t.clave)).toEqual(['tres', 'uno'])
  })
  it('un empate lo gana el primero del orden recibido', () => {
    expect(puntuarTours([tour('a'), tour('b'), tour('c')], { gusto: 'mar-y-animales' }, 3)?.map((t) => t.clave)).toEqual(['a', 'b'])
  })
  it('la temporada puntúa aunque solo se conteste el gusto', () => {
    expect(puntuarTours([tour('fuera'), tour('dentro', { meses: [3] })], { gusto: 'mar-y-animales' }, 3)?.[0].clave).toBe('dentro')
  })
  it('un tour sin perfil no participa', () => {
    expect(puntuarTours([tour('x', { gustos: [] })], { gusto: 'mar-y-animales' }, 3)).toBeNull()
  })
  it('sin coincidencias devuelve null para usar el respaldo', () => {
    expect(puntuarTours([tour('x')], { gusto: 'cultura-y-comida' }, 3)).toBeNull()
  })
})

describe('toursDelQuiz', () => {
  it('con menos de 3 tours con perfil no hay quiz', () => {
    expect(toursDelQuiz([tour('a'), tour('b'), tour('c', { gustos: [] })])).toBeNull()
  })
  it('junta perfiles y respaldo sin repetir y en el orden de la sede', () => {
    const lista = [tour('s1', { gustos: [] }), tour('p1'), tour('p2'), tour('p3')]
    const r = toursDelQuiz(lista)!
    expect(r.tarjetas.map((t) => t.clave)).toEqual(['s1', 'p1', 'p2', 'p3'])
    expect(r.respaldo).toEqual(['s1', 'p1'])
  })
  it('a lo más 12 con perfil', () => {
    const r = toursDelQuiz(Array.from({ length: 15 }, (_, i) => tour(`t${i}`)))!
    expect(r.tarjetas).toHaveLength(12)
  })
})

describe('razonTour', () => {
  const e = etiquetasQuiz('es')
  it('nombra solo lo que coincide', () => {
    const t = tour('a', { paraQuien: ['familia'], meses: [3] })
    expect(razonTour(t, { gusto: 'mar-y-animales', paraQuien: 'familia', jornada: 'medio-dia' }, 3, e)).toBe('Para familias · mar y animales · en temporada')
  })
  it('empieza con mayúscula si solo coincide el gusto', () => {
    expect(razonTour(tour('a'), { gusto: 'mar-y-animales' }, 3, e)).toBe('Mar y animales')
  })
})
