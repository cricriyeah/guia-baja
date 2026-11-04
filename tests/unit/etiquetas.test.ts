import { describe, expect, it } from 'vitest'

import { etiqueta, etiquetasDeCambio } from '../../src/dominio/etiquetas'

describe('etiquetasDeCambio (spec §10)', () => {
  it('lugar: su id, listados, zona y categorías de antes y de después', () => {
    expect(etiquetasDeCambio('lugares', { id: 1, zona: 2, categorias: [3, { id: 4 }] }, { id: 1, zona: 5, categorias: [3] })).toEqual(
      ['categoria:3', 'categoria:4', 'listados', 'lugar:1', 'zona:2', 'zona:5'],
    )
  })

  it('evento: también el lugar donde ocurre', () => {
    expect(etiquetasDeCambio('eventos', { id: 7, zona: 2, categorias: [3], lugar: 9 }, null)).toEqual([
      'categoria:3', 'evento:7', 'listados', 'lugar:9', 'zona:2',
    ])
  })

  it('artículo: sus zonas, categorías y los lugares citados antes y después', () => {
    expect(
      etiquetasDeCambio('articulos', { id: 8, zonas: [2], categorias: [], lugaresCitados: [10] }, { id: 8, zonas: [2], lugaresCitados: [11] }),
    ).toEqual(['articulo:8', 'listados', 'lugar:10', 'lugar:11', 'zona:2'])
  })

  it('zona y categoría emiten su etiqueta de colección', () => {
    expect(etiquetasDeCambio('zonas', { id: 2 }, null)).toEqual(['listados', 'zona:2', 'zonas'])
    expect(etiquetasDeCambio('categorias', { id: 3 }, null)).toEqual(['categoria:3', 'categorias', 'listados'])
  })

  it('textos, fotos de tours, media y redirecciones', () => {
    expect(etiquetasDeCambio('textos-zona-categoria', { id: 1, zona: 2, categoria: { id: 3 } }, { id: 1, zona: 2, categoria: 4 })).toEqual([
      'textos:2:3', 'textos:2:4',
    ])
    expect(etiquetasDeCambio('fotos-tours', { id: 1 }, null)).toEqual(['tours-fotos'])
    expect(etiquetasDeCambio('media', { id: 1 }, null)).toEqual(['media'])
    expect(etiquetasDeCambio('redirects', { id: 1 }, null)).toEqual(['redirecciones'])
  })

  it('constructores', () => {
    expect(etiqueta.catalogo('la-paz')).toBe('catalogo:la-paz')
    expect(etiqueta.textos(1, 2)).toBe('textos:1:2')
  })
})
