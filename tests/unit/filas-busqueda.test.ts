import { describe, expect, it } from 'vitest'

import { filasDe } from '../../src/busqueda/filas'

const lex = (t: string) => ({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: t }] }] } })

describe('filasDe: qué entra al índice (spec §6, §7)', () => {
  it('lugar publicado: una fila por idioma en que existe', () => {
    const doc = {
      id: 1, _status: 'published', nombre: 'Café Duna',
      slug: { es: 'cafe-duna', en: 'cafe-duna' }, resumen: { es: 'Café', en: null }, cuerpo: { es: lex('Pan dulce'), en: null },
      zona: 2, categorias: [3, { id: 4 }], patrocinio: { activo: true, desde: '2026-11-01T00:00:00.000Z', hasta: '2026-12-01T00:00:00.000Z' },
    }
    const filas = filasDe('lugar', doc)
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ tipo: 'lugar', docId: 1, locale: 'es', slug: 'cafe-duna', titulo: 'Café Duna', zonaIds: [2], categoriaIds: [3, 4], patrocinioActivo: true })
    expect(filas[0].texto).toContain('Pan dulce')
  })

  it('borrador o borrado: ninguna fila', () => {
    expect(filasDe('lugar', { id: 1, _status: 'draft' })).toEqual([])
    expect(filasDe('lugar', null)).toEqual([])
  })

  it('evento: fechas; artículo: varias zonas', () => {
    const ev = filasDe('evento', {
      id: 7, _status: 'published', nombre: { es: 'Trova' }, slug: { es: 'trova' }, resumen: { es: 'r' }, cuerpo: { es: lex('c') },
      zona: 2, categorias: [5], inicio: '2026-11-07T02:00:00.000Z', fin: null,
    })
    expect(ev[0]).toMatchObject({ titulo: 'Trova', inicio: '2026-11-07T02:00:00.000Z', fin: null })
    const ar = filasDe('articulo', { id: 8, _status: 'published', titulo: { es: 'T' }, slug: { es: 't' }, resumen: { es: 'r' }, cuerpo: { es: lex('c') }, zonas: [2, 9] })
    expect(ar[0].zonaIds).toEqual([2, 9])
  })

  it('zona activa con nombre; categoría con nombre', () => {
    expect(filasDe('zona', { id: 2, activa: true, slug: 'la-paz', nombre: { es: 'La Paz', en: 'La Paz' }, descripcion: { es: 'Capital' } })).toHaveLength(2)
    expect(filasDe('zona', { id: 2, activa: false, slug: 'x', nombre: { es: 'X' } })).toEqual([])
    expect(filasDe('categoria', { id: 3, nombre: { es: 'Playas', en: 'Beaches' }, slug: { es: 'playas', en: 'beaches' } }).map((f) => f.slug)).toEqual(['playas', 'beaches'])
  })
})
