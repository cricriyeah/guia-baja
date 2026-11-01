import { describe, expect, it } from 'vitest'

import { esSlugReservadoZona, esSlugValido, slugify, SLUGS_RESERVADOS_ZONA } from '../../src/dominio/slugs'

describe('slugify', () => {
  it('quita acentos, eñes y signos', () => {
    expect(slugify('Café La Peña & Bar')).toBe('cafe-la-pena-bar')
  })
  it('colapsa espacios y guiones y recorta extremos', () => {
    expect(slugify('  --Playa   Balandra--  ')).toBe('playa-balandra')
  })
  it('deja números', () => {
    expect(slugify('Festival 2026')).toBe('festival-2026')
  })
})

describe('esSlugValido', () => {
  it.each(['la-paz', 'cafe', 'festival-2026'])('acepta %s', (s) => expect(esSlugValido(s)).toBe(true))
  it.each(['La-Paz', 'la_paz', '-la', 'la-', 'la--paz', '', 'café'])('rechaza %s', (s) =>
    expect(esSlugValido(s)).toBe(false),
  )
})

describe('slugs reservados de zona', () => {
  it('incluye las palabras de la sección 6 del spec', () => {
    expect([...SLUGS_RESERVADOS_ZONA].sort()).toEqual(
      [
        'aparece-en-la-guia', 'articles', 'articulos', 'categoria', 'category', 'eventos', 'events',
        'get-listed', 'lugares', 'places', 'privacidad', 'privacy',
      ].sort(),
    )
  })
  it('detecta reservados', () => {
    expect(esSlugReservadoZona('eventos')).toBe(true)
    expect(esSlugReservadoZona('la-paz')).toBe(false)
  })
})
