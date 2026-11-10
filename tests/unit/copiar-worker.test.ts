import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { copiarWorker } from '../../scripts/copiar-worker-maplibre.mjs'

describe('copiarWorker', () => {
  let raiz: string
  const dist = () => path.join(raiz, 'node_modules/maplibre-gl/dist')

  beforeEach(() => {
    raiz = mkdtempSync(path.join(tmpdir(), 'worker-'))
    mkdirSync(dist(), { recursive: true })
    writeFileSync(path.join(raiz, 'node_modules/maplibre-gl/package.json'), JSON.stringify({ version: '9.9.9' }))
    writeFileSync(path.join(dist(), 'maplibre-gl-worker.mjs'), 'w')
  })
  afterEach(() => rmSync(raiz, { recursive: true, force: true }))

  it('falla si falta un archivo', () => {
    expect(() => copiarWorker(raiz)).toThrow(/maplibre-gl-shared\.mjs/)
  })

  it('copia los dos en una carpeta con la versión', () => {
    writeFileSync(path.join(dist(), 'maplibre-gl-shared.mjs'), 's')
    const destino = copiarWorker(raiz)
    expect(destino).toBe(path.join(raiz, 'public/guia-assets/maplibre/9.9.9'))
    expect(existsSync(path.join(destino, 'maplibre-gl-worker.mjs'))).toBe(true)
    expect(existsSync(path.join(destino, 'maplibre-gl-shared.mjs'))).toBe(true)
  })
})
