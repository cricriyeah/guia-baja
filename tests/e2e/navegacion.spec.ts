import { expect, test } from '@playwright/test'

import { SECRETO_PROXY } from '../../scripts/entorno-e2e.mjs'

// Plan F3b: Efectos debe tomar el contenido que trae cada navegación con <Link> (el layout no se vuelve a montar).
test.describe('@indexable navegación con Link', () => {
  test('el contenido de la página nueva se ve', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-guia-proxy': SECRETO_PROXY })
    await page.goto('/es/guia')
    await page.locator('.guia-cab__zonas a', { hasText: 'La Paz' }).first().click()
    await expect(page).toHaveURL(/\/es\/guia\/la-paz$/)
    const tarjeta = page.locator('.feed .nota').first()
    await tarjeta.scrollIntoViewIfNeeded()
    await expect(tarjeta).toHaveCSS('opacity', '1')
    await tarjeta.click()
    await expect(page).toHaveURL(/\/es\/guia\/lugares\//)
    await expect(page.locator('h1')).toBeVisible()
  })
})
