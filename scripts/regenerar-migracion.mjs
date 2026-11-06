// Solo antes del primer deploy a producción: deja las dos migraciones previas al deploy, `inicial` y `busqueda`.
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

if (!process.argv.includes('--no-hay-deploy')) {
  console.error('Uso: npm run migracion:regenerar -- --no-hay-deploy')
  console.error('Prohibido después del primer deploy a producción: crea una migración nueva con `npm run payload migrate:create <nombre>`.')
  process.exit(1)
}
rmSync('src/migrations', { recursive: true, force: true })

const crear = (nombre) =>
  spawnSync('npx', ['payload', 'migrate:create', nombre, '--force-accept-warning'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, NODE_OPTIONS: '--no-deprecation' },
  }).status ?? 1

if (crear('inicial') !== 0) process.exit(1)
// Segundo proceso: fecha posterior, así `busqueda` corre después de `inicial` (writeMigrationIndex ordena por nombre).
if (crear('busqueda') !== 0) process.exit(1)
const archivo = readdirSync('src/migrations').find((f) => /_busqueda\.ts$/.test(f))
if (!archivo) {
  console.error('No se creó la migración busqueda')
  process.exit(1)
}
writeFileSync(`src/migrations/${archivo}`, readFileSync('scripts/migraciones/busqueda.ts.txt', 'utf8'))
const indice = readFileSync('src/migrations/index.ts', 'utf8')
if (!(indice.indexOf('_inicial') > -1 && indice.indexOf('_inicial') < indice.indexOf('_busqueda'))) {
  console.error('En src/migrations/index.ts, inicial debe ir antes que busqueda')
  process.exit(1)
}
