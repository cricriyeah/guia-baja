import dotenv from 'dotenv'
import { spawnSync } from 'node:child_process'

// migrate:fresh borra TODO. Solo se permite sobre una base llamada guia_test.
export function verificarBaseDePruebas(url: string | undefined): void {
  let base = ''
  try {
    base = decodeURIComponent(new URL(url ?? '').pathname.replace(/^\//, ''))
  } catch {
    // URL ausente o mal formada: se trata como base no permitida.
  }
  if (base !== 'guia_test') {
    throw new Error('Las pruebas de integración borran la base: DATABASE_URL debe apuntar a una base llamada guia_test.')
  }
}

// Una vez por corrida: base de pruebas vacía con todas las migraciones aplicadas.
// Se usa la CLI de Payload en un proceso aparte: carga los .ts de las migraciones con tsx;
// el import nativo de Node falla con los `import { MigrateUpArgs }` sin `type`.
export default function setup() {
  dotenv.config({ path: '.env.test', override: true })
  verificarBaseDePruebas(process.env.DATABASE_URL)
  const r = spawnSync('npx', ['payload', 'migrate:fresh', '--force-accept-warning'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, NODE_OPTIONS: '--no-deprecation' },
  })
  if (r.status !== 0) throw new Error('payload migrate:fresh falló sobre la base de pruebas')
}
