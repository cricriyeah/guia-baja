import { expect, test, type Page } from '@playwright/test'

// Necesita red: el widget de Turnstile carga de challenges.cloudflare.com (llaves de prueba que siempre pasan).
async function llenar(page: Page, correo: string, aceptar: boolean) {
  await page.goto('/es/guia/aparece-en-la-guia')
  await page.fill('#negocio', 'Negocio de prueba E2E')
  await page.fill('#correo', correo)
  if (aceptar) await page.check('input[name="aceptoPrivacidad"]')
  await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue('', { timeout: 20_000 })
  await page.click('button[type="submit"]')
}

test.describe('@indexable formulario «Aparece en la guía» (spec §11)', () => {
  test('sin aceptar el aviso, error en el campo', async ({ page }, info) => {
    await llenar(page, `e2e-${Date.now()}-${info.retry}@ejemplo.invalid`, false)
    await expect(page.locator('.msg')).toContainText('aviso de privacidad')
  })

  test('envío válido: confirmación', async ({ page }, info) => {
    await llenar(page, `e2e-${Date.now()}-${info.retry}@ejemplo.invalid`, true)
    await expect(page.getByRole('status')).toContainText('Recibimos tu solicitud')
  })
})
