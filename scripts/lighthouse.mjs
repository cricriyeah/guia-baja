// Paso 5 del CI (spec §11). Usa el build del modo indexable; si .next no lo es, lo rehace como el orquestador.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

import { envModo, PUERTOS } from './entorno-e2e.mjs'

const win = process.platform === 'win32'
const env = envModo('indexable')
const correr = (cmd, args, extra = {}) => spawnSync(cmd, args, { stdio: 'inherit', shell: win, env: { ...process.env, ...env, ...extra } }).status ?? 1

const modo = existsSync('.next/.e2e-modo') ? readFileSync('.next/.e2e-modo', 'utf8').trim() : null
if (modo !== 'indexable') {
  if (correr('npm', ['run', 'seed'], { SEED_PERMITIDO: 'true', SEED_CONTRASENA_ADMIN: 'contrasena-e2e-larga' }) !== 0) process.exit(1)
  if (correr('npx', ['payload', 'run', 'tests/e2e/preparar.ts'], { NODE_OPTIONS: '--no-deprecation' }) !== 0) process.exit(1)
  rmSync('.next', { recursive: true, force: true })
  if (correr('npm', ['run', 'build']) !== 0) process.exit(1)
  writeFileSync('.next/.e2e-modo', 'indexable')
}

const base = `http://localhost:${PUERTOS.indexable}`
const urls = ['/es/guia', '/es/guia/la-paz', '/es/guia/lugares/cocina-marea-alta', '/es/guia/articulos/que-hacer-en-la-paz-prueba']
// Con shell (Windows), Node une los argumentos sin comillas: el comando con espacios va entre comillas dobles.
const comillas = (a) => (win ? `"${a}"` : a)
const args = [
  'lhci', 'autorun',
  comillas(`--collect.startServerCommand=npm run start -- -p ${PUERTOS.indexable}`),
  '--collect.startServerReadyPattern=Ready',
  '--collect.startServerReadyTimeout=60000',
  ...(process.env.CI ? [comillas('--collect.settings.chromeFlags=--no-sandbox')] : []),
  ...urls.map((u) => `--collect.url=${base}${u}`),
]
process.exit(correr('npx', args))
