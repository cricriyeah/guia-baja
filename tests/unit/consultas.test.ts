import { describe, expect, it, vi } from 'vitest'

import {
  articulosQueCitan, categoriasConLugares, conteoCombinacion, destacados, documentoPorSlug, eventosProximos, lugaresDe, resolutorDeCuerpo,
} from '../../src/sitio/datos/consultas'

const pat = { activo: false, desde: null, hasta: null }
const lugar = (id: number, zonaId: number, categoriaIds: number[], extra = {}) =>
  ({ id, slug: `l${id}`, nombre: `L${id}`, zonaId, categoriaIds, orden: 100, patrocinio: pat, destacado: { activo: false, orden: 100 }, ...extra }) as never
const evento = (id: number, inicio: string, extra = {}) =>
  ({ id, slug: `e${id}`, nombre: `E${id}`, inicio, fin: null, zonaId: 1, lugarId: null, patrocinio: pat, destacado: { activo: false, orden: 100 }, ...extra }) as never
const ahora = '2026-11-10T17:00:00.000Z'

describe('consultas sobre las listas (spec §7)', () => {
  const ls = [lugar(1, 1, [10]), lugar(2, 1, [10, 11]), lugar(3, 2, [10])]

  it('lugaresDe y conteos por combinación', () => {
    expect(lugaresDe(ls, { zonaId: 1, categoriaId: 10 }).map((l: { id: number }) => l.id)).toEqual([1, 2])
    expect(conteoCombinacion(ls, null, 10)).toBe(3)
    expect(conteoCombinacion(ls, 2, 11)).toBe(0)
  })

  it('categoriasConLugares: solo las de lugares con al menos 1', () => {
    const cats = [{ id: 10, aplicaA: 'lugar' }, { id: 11, aplicaA: 'ambos' }, { id: 12, aplicaA: 'lugar' }, { id: 13, aplicaA: 'evento' }] as never[]
    expect(categoriasConLugares(ls, cats, 2).map((c: { id: number }) => c.id)).toEqual([10])
    expect(categoriasConLugares(ls, cats).map((c: { id: number }) => c.id)).toEqual([10, 11])
  })

  it('eventosProximos: sin los pasados, por inicio, con filtro de lugar', () => {
    const es = [evento(1, '2026-11-20T18:00:00Z'), evento(2, '2026-11-01T18:00:00Z'), evento(3, '2026-11-12T18:00:00Z', { lugarId: 7 })]
    expect(eventosProximos(es, ahora, {}).map((e: { id: number }) => e.id)).toEqual([3, 1])
    expect(eventosProximos(es, ahora, { lugarId: 7 }).map((e: { id: number }) => e.id)).toEqual([3])
  })

  it('destacados: por ordenDestacado y nombre, sin eventos pasados', () => {
    const d = destacados(
      {
        lugares: [lugar(1, 1, [10], { destacado: { activo: true, orden: 2 } }), lugar(2, 1, [10])],
        eventos: [evento(5, '2026-11-01T18:00:00Z', { destacado: { activo: true, orden: 1 } }), evento(6, '2026-11-30T18:00:00Z', { destacado: { activo: true, orden: 1 } })],
        articulos: [{ id: 9, titulo: 'A', destacado: { activo: true, orden: 3 } } as never],
      },
      ahora,
    )
    expect(d.map((x) => `${x.tipo}:${x.item.id}`)).toEqual(['evento:6', 'lugar:1', 'articulo:9'])
  })

  it('articulosQueCitan', () => {
    expect(articulosQueCitan([{ id: 1, lugaresCitados: [3] }, { id: 2, lugaresCitados: [] }] as never[], 3).map((a: { id: number }) => a.id)).toEqual([1])
  })

  it('resolutorDeCuerpo: solo lo que existe en el idioma', () => {
    const r = resolutorDeCuerpo({ lugares: [lugar(1, 1, [])], eventos: [], articulos: [{ id: 4, slug: 'siete' } as never] }, 'en')
    expect(r.lugar(1)?.id).toBe(1)
    expect(r.lugar(2)).toBeUndefined()
    expect(r.href('lugares', 1)).toBe('/en/guide/places/l1')
    expect(r.href('articulos', 4)).toBe('/en/guide/articles/siete')
    expect(r.href('eventos', 9)).toBeNull()
  })
})

describe('documentoPorSlug', () => {
  const lista = [{ id: 1, slug: 'a' }, { id: 2, slug: 'b' }]
  it('devuelve la lista y la ficha de la tarjeta con ese slug', async () => {
    const ficha = vi.fn(async (id: number) => ({ id, nombre: `Ficha ${id}` }))
    expect(await documentoPorSlug(Promise.resolve(lista), ficha, 'b')).toEqual({ lista, ficha: { id: 2, nombre: 'Ficha 2' } })
    expect(ficha).toHaveBeenCalledWith(2)
  })
  it('sin tarjeta con ese slug no pide la ficha; sin ficha en el idioma da null', async () => {
    const ficha = vi.fn(async () => null)
    expect(await documentoPorSlug(Promise.resolve(lista), ficha, 'zz')).toBeNull()
    expect(ficha).not.toHaveBeenCalled()
    expect(await documentoPorSlug(Promise.resolve(lista), ficha, 'a')).toBeNull()
  })
})

