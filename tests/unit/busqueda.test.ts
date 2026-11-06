import { describe, expect, it } from 'vitest'

import { consultaPrefijo, leerConsultaBusqueda, limpiarTermino, ordenarGrupo, partesResaltadas, type FilaResultado } from '../../src/dominio/busqueda'

describe('reglas de la búsqueda (spec §7)', () => {
  it('limpiarTermino normaliza y limita', () => {
    expect(limpiarTermino('  Playas   en  La Paz ')).toBe('playas en la paz')
    expect(limpiarTermino('x'.repeat(150))).toHaveLength(100)
    expect(limpiarTermino(null)).toBe('')
  })

  it('limpiarTermino quita controles, normaliza a NFC y no termina en espacio', () => {
    expect(limpiarTermino('caf\u0000e\u0007 duna')).toBe('caf e duna')
    expect(limpiarTermino('a\u0085b')).toBe('a b')
    expect(limpiarTermino('café')).toBe('café')
    expect(limpiarTermino('x'.repeat(99) + ' y')).toBe('x'.repeat(99))
  })

  it('consultaPrefijo nunca deja sintaxis del visitante', () => {
    expect(consultaPrefijo('play')).toBe('play:*')
    expect(consultaPrefijo('tacos de pesc')).toBe('tacos & de & pesc:*')
    expect(consultaPrefijo('a) & !foo | <->')).toBe('a & foo:*')
    expect(consultaPrefijo('café')).toBe('café:*')
    expect(consultaPrefijo('!!! ()')).toBeNull()
  })

  it('leerConsultaBusqueda acepta solo tipos y zonas válidos', () => {
    expect(leerConsultaBusqueda(new URLSearchParams('q=Balandra&tipo=lugar&zona=la-paz&pagina=2'))).toEqual({ q: 'balandra', tipo: 'lugar', zona: 'la-paz', pagina: 2 })
    expect(leerConsultaBusqueda(new URLSearchParams('q=x&tipo=zona&zona=No Valida&pagina=0'))).toEqual({ q: 'x', tipo: null, zona: null, pagina: 1 })
  })

  it('ordenarGrupo: hasta 2 patrocinios vigentes arriba; el resto por relevancia', () => {
    const vig = (desde: string) => ({ activo: true, desde, hasta: '2026-12-31T00:00:00.000Z' })
    const sin: FilaResultado['patrocinio'] = { activo: false, desde: null, hasta: null }
    const f = (id: number, rank: number, patrocinio: FilaResultado['patrocinio'] = sin): FilaResultado => ({
      tipo: 'lugar', docId: id, slug: `l${id}`, titulo: `L${id}`, texto: '', zonaIds: [], categoriaIds: [], inicio: null, fin: null, rank, patrocinio,
    })
    const ahora = new Date('2026-11-10T12:00:00-07:00')
    const r = ordenarGrupo(
      [f(1, 0.9), f(2, 0.1, vig('2026-11-05T00:00:00.000Z')), f(3, 0.5), f(4, 0.2, vig('2026-11-01T00:00:00.000Z')), f(5, 0.3, vig('2026-11-02T00:00:00.000Z'))],
      ahora,
    )
    expect(r.map((x) => x.docId)).toEqual([4, 5, 1, 3, 2])
  })

  it('partesResaltadas marca coincidencias sin importar acentos ni mayúsculas', () => {
    expect(partesResaltadas('Café Duna en La Paz', 'cafe paz')).toEqual([
      { texto: 'Café', coincide: true },
      { texto: ' Duna en La ', coincide: false },
      { texto: 'Paz', coincide: true },
    ])
    expect(partesResaltadas('Sin nada', '')).toEqual([{ texto: 'Sin nada', coincide: false }])
  })
})
