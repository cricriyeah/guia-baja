// Entrada única del banco: entorno, seed, control, build, servidor, calentamiento y medición. Uso: node scripts/medir/correr.mjs {control}
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as esperar } from 'node:timers/promises'

import { chromium } from '@playwright/test'

import { envModo, PUERTOS } from '../entorno-e2e.mjs'
import { aplicarControles, letrasDe } from './controles.mjs'
import { URLS } from './urls.mjs'

const control = process.argv[2] ?? 'base'
// CHROME_PATH: el Chromium que instala Playwright, el mismo de las E2E.
const env = { ...process.env, ...envModo('indexable'), SEED_PERMITIDO: 'true', SEED_CONTRASENA_ADMIN: 'contrasena-e2e-larga', CHROME_PATH: chromium.executablePath() }
const puerto = PUERTOS.indexable

const correr = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env })
  if (r.status !== 0) throw new Error(`Falló: ${cmd} ${args.join(' ')}`)
}

correr('npm', ['run', 'seed'])
correr('npx', ['payload', 'run', 'tests/e2e/preparar.ts'])
aplicarControles(letrasDe(control), (r) => readFileSync(r, 'utf8'), (r, t) => writeFileSync(r, t))

// El catálogo falso sigue vivo durante el build y la medición: las páginas se cachean con sus tours, como en producción.
const catalogo = spawn('node', ['scripts/catalogo-falso.mjs'], { stdio: 'ignore', env })
let servidor
try {
  correr('npm', ['run', 'build'])
  servidor = spawn('npm', ['run', 'start', '--', '-p', String(puerto)], { stdio: 'ignore', env, detached: true })
  for (let i = 0; i < 60; i += 1) {
    const ok = await fetch(`http://localhost:${puerto}/es/guia`).then((r) => r.ok, () => false)
    if (ok) break
    if (i === 59) throw new Error('El servidor no arrancó.')
    await esperar(1000)
  }
  // Dos GET por URL: la primera corrida no debe medir un render en frío.
  for (const url of URLS) for (let i = 0; i < 2; i += 1) await fetch(`http://localhost:${puerto}${url}`)
  correr('node', ['scripts/medir/medir.mjs', control, String(puerto)])
} finally {
  catalogo.kill()
  if (servidor) process.kill(-servidor.pid)
}
