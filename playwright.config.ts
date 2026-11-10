import { defineConfig, devices } from '@playwright/test'

import { envModo, PUERTO_CATALOGO, PUERTOS } from './scripts/entorno-e2e.mjs'

const modo = (process.env.E2E_MODO ?? 'indexable') as 'no-indexable' | 'indexable'
const puerto = PUERTOS[modo]

// El servidor lo maneja Playwright (mata el árbol en Windows y POSIX). El build lo hace scripts/e2e.mjs.
export default defineConfig({
  testDir: 'tests/e2e',
  grep: new RegExp(`@${modo}\\b`),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: `playwright-report/${modo}` }]],
  outputDir: `test-results/${modo}`,
  use: { baseURL: `http://localhost:${puerto}` },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /mapa\.spec\.ts/ },
    {
      // WebGL por software: el CI no tiene GPU (spec del paquete 3 §2.4).
      name: 'mapa',
      testMatch: /mapa\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
    },
  ],
  webServer: [
    {
      command: 'node scripts/catalogo-falso.mjs',
      url: `http://localhost:${PUERTO_CATALOGO}/api/sedes/la-paz/servicios/`,
      reuseExistingServer: false,
    },
    {
      command: `npm run start -- -p ${puerto}`,
      url: `http://localhost:${puerto}/es/guia`,
      env: envModo(modo),
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
})
