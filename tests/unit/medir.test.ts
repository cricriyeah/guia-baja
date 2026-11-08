import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { aplicarControles, CONTROLES } from '../../scripts/medir/controles.mjs'

const memoria = () => {
  const archivos = new Map<string, string>()
  return {
    archivos,
    leer: (r: string) => archivos.get(r) ?? readFileSync(r, 'utf8'),
    escribir: (r: string, t: string) => void archivos.set(r, t),
  }
}

describe('controles', () => {
  // La etapa 2 va quitando controles de CONTROLES: estas pruebas siguen valiendo con la lista corta o vacía.
  const letras = Object.keys(CONTROLES)

  it('todos los controles definidos se aplican en secuencia sobre los archivos reales', () => {
    const m = memoria()
    aplicarControles(letras, m.leer, m.escribir)
    expect(m.archivos.size > 0).toBe(letras.length > 0)
  })
  it.skipIf(letras.length === 0)('falla si falta el texto que debe existir', () => {
    expect(() => aplicarControles([letras[0]], () => 'sin nada', () => undefined)).toThrow(/no encontró/)
  })
  it('una letra desconocida falla', () => {
    expect(() => aplicarControles(['z'], () => '', () => undefined)).toThrow(/desconocido/)
  })
  it('base no aplica nada', () => {
    const m = memoria()
    aplicarControles([], m.leer, m.escribir)
    expect(m.archivos.size).toBe(0)
  })
})
