import { describe, expect, it } from 'vitest'

import { numeroDePagina, paginar } from '../../src/dominio/paginacion'

describe('paginación (spec §7)', () => {
  const lista = Array.from({ length: 30 }, (_, i) => i)

  it('rebana y cuenta páginas', () => {
    expect(paginar(lista, 1, 24)).toEqual({ items: lista.slice(0, 24), pagina: 1, totalPaginas: 2 })
    expect(paginar(lista, 2, 24)?.items).toEqual(lista.slice(24))
  })

  it('fuera de rango es null (la página da 404)', () => {
    expect(paginar(lista, 3, 24)).toBeNull()
    expect(paginar(lista, 0, 24)).toBeNull()
  })

  it('una lista vacía tiene una sola página', () => {
    expect(paginar([], 1)).toEqual({ items: [], pagina: 1, totalPaginas: 1 })
  })

  it('numeroDePagina solo acepta enteros positivos sin ceros a la izquierda', () => {
    expect(numeroDePagina('2')).toBe(2)
    expect(numeroDePagina('02')).toBeNull()
    expect(numeroDePagina('x')).toBeNull()
  })
})
