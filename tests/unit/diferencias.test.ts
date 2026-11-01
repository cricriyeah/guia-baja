import { describe, expect, it } from 'vitest'

import { calcularCambios, NO_PUBLICADO, type Instantanea } from '../../src/redirecciones/diferencias'

const ambos = { es: true, en: true }
const pub = (es: string, en?: string, existe = { es: true, en: Boolean(en) }): Instantanea => ({
  publicado: true,
  slugs: { es, en },
  existe,
})

describe('calcularCambios', () => {
  it('sin cambios no hace nada', () => {
    expect(calcularCambios(pub('a', 'b'), pub('a', 'b'))).toEqual([])
  })
  it('cambio de slug en un idioma', () => {
    expect(calcularCambios(pub('a', 'b'), pub('a', 'c'))).toEqual([
      { tipo: 'cambioSlug', locale: 'en', slugViejo: 'b', slugNuevo: 'c' },
    ])
  })
  it('despublicar retira en los idiomas donde existía', () => {
    expect(calcularCambios(pub('a', 'b'), { ...pub('a', 'b'), publicado: false })).toEqual([
      { tipo: 'retiro', locale: 'es', slug: 'a' },
      { tipo: 'retiro', locale: 'en', slug: 'b' },
    ])
  })
  it('borrar equivale a no publicado', () => {
    expect(calcularCambios(pub('a'), NO_PUBLICADO)).toEqual([{ tipo: 'retiro', locale: 'es', slug: 'a' }])
  })
  it('dejar de existir en un idioma lo retira de ese idioma', () => {
    expect(calcularCambios(pub('a', 'b'), pub('a', 'b', { es: true, en: false }))).toEqual([
      { tipo: 'retiro', locale: 'en', slug: 'b' },
    ])
  })
  it('si antes no estaba publicado, no hay nada que redirigir', () => {
    expect(calcularCambios({ ...pub('a'), publicado: false }, pub('z'))).toEqual([])
  })
  it('un idioma que no existía antes no genera nada', () => {
    expect(calcularCambios(pub('a', 'b', { es: true, en: false }), pub('a', 'c', ambos))).toEqual([])
  })
})
