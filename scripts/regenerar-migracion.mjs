// Solo antes del primer deploy a producción: deja una sola migración «inicial».
import { rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

if (!process.argv.includes('--no-hay-deploy')) {
  console.error('Uso: npm run migracion:regenerar -- --no-hay-deploy')
  console.error('Prohibido después del primer deploy a producción: crea una migración nueva con `npm run payload migrate:create <nombre>`.')
  process.exit(1)
}
rmSync('src/migrations', { recursive: true, force: true })
const r = spawnSync('npx', ['payload', 'migrate:create', 'inicial'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, NODE_OPTIONS: '--no-deprecation' },
})
process.exit(r.status ?? 1)
