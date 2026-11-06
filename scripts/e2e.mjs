// Orquestador de las E2E (plan F3d): para cada modo, datos frescos, .next limpio, build con su entorno y Playwright.
import { spawnSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'

import { envModo } from './entorno-e2e.mjs'

const win = process.platform === 'win32'
// npm y npx son .cmd en Windows: Node 24 exige shell para lanzarlos (EINVAL sin él).
const correr = (cmd, args, env = {}) =>
  spawnSync(cmd, args, { stdio: 'inherit', shell: win, env: { ...process.env, ...env } }).status ?? 1

const SEMILLA = { SEED_PERMITIDO: 'true', SEED_CONTRASENA_ADMIN: 'contrasena-e2e-larga' }
let fallo = false

// E2E_SOLO=indexable (o no-indexable) corre un solo modo mientras se trabaja.
const MODOS = ['no-indexable', 'indexable'].filter((m) => !process.env.E2E_SOLO || m === process.env.E2E_SOLO)
for (const modo of MODOS) {
  const env = envModo(modo)
  console.log(`\n=== E2E modo ${modo} ===`)
  if (correr('npm', ['run', 'seed'], { ...env, ...SEMILLA }) !== 0) process.exit(1)
  if (correr('npx', ['payload', 'run', 'tests/e2e/preparar.ts'], { ...env, NODE_OPTIONS: '--no-deprecation' }) !== 0) process.exit(1)
  // unstable_cache guarda datos en .next/cache: un build anterior los reutilizaría.
  rmSync('.next', { recursive: true, force: true })
  if (correr('npm', ['run', 'build'], env) !== 0) process.exit(1)
  writeFileSync('.next/.e2e-modo', modo)
  if (correr('npx', ['playwright', 'test'], { E2E_MODO: modo }) !== 0) fallo = true
}
process.exit(fallo ? 1 : 0)
