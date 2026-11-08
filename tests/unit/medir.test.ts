import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { aplicarControles, CONTROLES } from '../../scripts/medir/controles.mjs'
import { lineaCompacta, mediana, resumirCorrida } from '../../scripts/medir/resumir.mjs'
import lhr from './fixtures/lhr-real.json'
import traza from './fixtures/traza-real.json'

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

const manifiesto = { rootMainFiles: [] as string[] }

describe('resumirCorrida', () => {
  const r = resumirCorrida(lhr, traza, manifiesto)
  it('métricas simuladas y observadas', () => {
    expect(r.lcp).toBeGreaterThan(0)
    expect(r.lcpObservado).toBeGreaterThan(0)
    expect(r.fcpObservado).toBeGreaterThan(0)
  })
  it('selector recortado', () => {
    expect(r.selector.length).toBeLessThanOrEqual(80)
  })
  it('las fases simuladas vienen de la segunda tabla', () => {
    expect(r.fases).toHaveProperty('ttfb')
    expect(r.fases).toHaveProperty('renderDelay')
  })
  it('scripts antes del LCP en el mismo reloj', () => {
    expect(r.scriptsAntes).toBeGreaterThanOrEqual(0)
    expect(r.scriptsAntes).toBeLessThanOrEqual(r.scriptsTotal)
    expect(r.kibAntes).toBeLessThanOrEqual(r.kibTotal)
  })
  it('un script que termina después del LCP observado no cuenta', () => {
    const tarde = structuredClone(lhr)
    for (const it of tarde.audits['network-requests'].details.items) it.networkEndTime = 9e9
    expect(resumirCorrida(tarde, traza, manifiesto).scriptsAntes).toBe(0)
  })
  it('un LCP de texto, sin loadStart, no rompe las fases', () => {
    // JSON.parse da `any`: el tipo que TypeScript infiere del fixture exige `percent` en cada fila.
    const copia = JSON.parse(JSON.stringify(lhr))
    copia.audits['largest-contentful-paint-element'].details.items[1].items = [
      { phase: 'TTFB', timing: 100 }, { phase: 'Render Delay', timing: 900 },
    ]
    expect(resumirCorrida(copia, traza, manifiesto).fases).toMatchObject({ ttfb: 100, renderDelay: 900 })
  })
})

describe('mediana', () => {
  it('impar y par', () => {
    expect(mediana([3, 1, 2])).toBe(2)
    expect(mediana([1, 2, 3, 4])).toBe(2.5)
  })
})

describe('lineaCompacta', () => {
  const r = resumirCorrida(lhr, traza, manifiesto)
  it('con 30 scripts no pasa de 3800', () => {
    expect(lineaCompacta({ simulado: { ...r, scriptsTotal: 30 }, devtools: { ...r, scriptsTotal: 30 } }).length).toBeLessThanOrEqual(3800)
  })
  it('si se pasa, lanza', () => {
    expect(() => lineaCompacta({ simulado: { ...r, selector: 'x'.repeat(4000) }, devtools: r })).toThrow(/3800/)
  })
})
