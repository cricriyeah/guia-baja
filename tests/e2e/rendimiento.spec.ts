import { expect, test } from '@playwright/test'

import { SECRETO_PROXY } from '../../scripts/entorno-e2e.mjs'

test.describe('@indexable rendimiento: fundidos', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-guia-proxy': SECRETO_PROXY })
  })

  test('(c) las 2 primeras tarjetas del listado no llevan .entra', async ({ page }) => {
    await page.goto('/es/guia/la-paz/restaurantes')
    const clases = await page.locator('.lista .nota.tarjeta').evaluateAll((els) => els.slice(0, 3).map((e) => e.classList.contains('entra')))
    expect(clases[0]).toBe(false)
    expect(clases[1]).toBe(false)
  })
})
