// Corre Lighthouse 3 veces por URL y modo, e imprime una línea ::notice por URL. Uso: node scripts/medir/medir.mjs {control} {puerto}
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'

import { lineaCompacta, medianas, resumirCorrida } from './resumir.mjs'
import { URLS } from './urls.mjs'

const [control, puerto] = process.argv.slice(2)
const CORRIDAS = 3
const MODOS = { simulado: 'simulate', devtools: 'devtools' }
const manifiesto = JSON.parse(readFileSync('.next/build-manifest.json', 'utf8'))

function corrida(url, metodo) {
  rmSync('medicion/tmp', { recursive: true, force: true })
  mkdirSync('medicion/tmp', { recursive: true })
  const r = spawnSync('npx', [
    'lighthouse', `http://localhost:${puerto}${url}`,
    '--only-categories=performance', '--form-factor=mobile',
    `--throttling-method=${metodo}`,
    '--output=json', '--output-path=medicion/tmp/lhr.json', '--save-assets', '--quiet',
    '--chrome-flags=--headless=new --no-sandbox',
  ], { stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`Lighthouse falló en ${url} (${metodo})`)
  return resumirCorrida(
    JSON.parse(readFileSync('medicion/tmp/lhr.json', 'utf8')),
    JSON.parse(readFileSync('medicion/tmp/lhr-0.trace.json', 'utf8')),
    manifiesto,
  )
}

for (const url of URLS) {
  const porModo = {}
  for (const [nombre, metodo] of Object.entries(MODOS)) {
    porModo[nombre] = medianas(Array.from({ length: CORRIDAS }, () => corrida(url, metodo)))
  }
  console.log(`::notice title=lcp ${control} ${url}::${lineaCompacta(porModo)}`)
}
