import { defineConfig, devices } from '@playwright/test'

import { envModo, PUERTOS } from './scripts/entorno-e2e.mjs'

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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run start -- -p ${puerto}`,
    url: `http://localhost:${puerto}/es/guia`,
    env: envModo(modo),
    timeout: 120_000,
    reuseExistingServer: false,
  },
})
