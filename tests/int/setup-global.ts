import dotenv from 'dotenv'
import { spawnSync } from 'node:child_process'

// Una vez por corrida: base de pruebas vacía con todas las migraciones aplicadas.
// Se usa la CLI de Payload en un proceso aparte: carga los .ts de las migraciones con tsx;
// el import nativo de Node falla con los `import { MigrateUpArgs }` sin `type`.
export default function setup() {
  dotenv.config({ path: '.env.test', override: true })
  const r = spawnSync('npx', ['payload', 'migrate:fresh', '--force-accept-warning'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, NODE_OPTIONS: '--no-deprecation' },
  })
  if (r.status !== 0) throw new Error('payload migrate:fresh falló sobre la base de pruebas')
}
