// Build de Vercel: migra con la URL directa (sin pooler) y luego construye (spec §11).
import { spawnSync } from 'node:child_process'

const unpooled = process.env.DATABASE_URL_UNPOOLED
if (!unpooled) {
  console.error('Falta DATABASE_URL_UNPOOLED')
  process.exit(1)
}
function correr(cmd, args, env) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
correr('npx', ['payload', 'migrate'], { DATABASE_URL: unpooled, NODE_OPTIONS: '--no-deprecation' })
correr('node', ['scripts/copiar-worker-maplibre.mjs'], {}) // Vercel no corre prebuild.
correr('npx', ['next', 'build'], { NODE_OPTIONS: '--no-deprecation --max-old-space-size=8000' })
