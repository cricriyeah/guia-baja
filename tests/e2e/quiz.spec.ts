import { gzipSync } from 'node:zlib'

import { expect, test, type Page } from '@playwright/test'

import { SECRETO_PROXY } from '../../scripts/entorno-e2e.mjs'

const H = { headers: { 'x-guia-proxy': SECRETO_PROXY } }
type Evento = { evento: string; props: Record<string, string> }
const quiz = (page: Page) => page.locator('#quiz-tours')
const ver = (page: Page) => quiz(page).getByRole('link', { name: 'Ver mis tours' })
const visibles = (page: Page) => quiz(page).locator('[data-quiz-tour]:visible')
const retrasar = (ms: number) => async (r: { continue(): Promise<void> }) => {
  await new Promise((f) => setTimeout(f, ms))
  await r.continue()
}

// Sobrevive a la navegación: la lista vive en Node.
async function escucharEventos(page: Page): Promise<Evento[]> {
  const eventos: Evento[] = []
  await page.exposeFunction('anotarEvento', (d: Evento) => eventos.push(d))
  await page.addInitScript(() => {
    window.addEventListener('guia:evento', (e) => (window as unknown as { anotarEvento(d: unknown): void }).anotarEvento((e as CustomEvent).detail))
  })
  return eventos
}

// El texto del botón cambia al hidratar: desde ahí el activador ya escucha.
async function abrir(page: Page, ruta = '/es/guia/la-paz') {
  await page.setExtraHTTPHeaders(H.headers)
  await page.goto(ruta)
  await expect(ver(page)).toBeVisible()
}

test.describe('@indexable quiz de tours', () => {
  test('mar y animales: tarjeta, razón, atribución, foco y evento', async ({ page }) => {
    const eventos = await escucharEventos(page)
    await abrir(page)
    await quiz(page).getByRole('radio', { name: 'En familia con niños' }).check()
    await quiz(page).getByRole('radio', { name: 'Mar y animales' }).check()
    await ver(page).click()
    await expect(visibles(page)).toHaveCount(1)
    const tarjeta = visibles(page).first()
    await expect(tarjeta).toContainText('Ballenas de prueba')
    await expect(tarjeta.locator('[data-quiz-razon]')).toContainText('Para familias · mar y animales')
    await expect(tarjeta.locator('a')).toHaveAttribute('href', /pieza=quiz-la-paz$/)
    await expect(tarjeta.locator('a')).toHaveAttribute('data-origen', 'quiz')
    await expect(quiz(page).locator('[data-quiz-titulo]')).toBeFocused()
    await expect(quiz(page).locator('[aria-live="polite"]')).toHaveText('Estos tours van contigo')
    await expect.poll(() => eventos).toContainEqual({ evento: 'quiz_resultado', props: { zona: 'la-paz', gusto: 'mar-y-animales' } })
    expect(eventos.filter((e) => e.evento === 'tour_clic')).toHaveLength(0)
  })

  test('un gusto sin tours: texto de respaldo y dos tarjetas', async ({ page }) => {
    await abrir(page)
    await quiz(page).getByRole('radio', { name: 'Cultura y comida' }).check()
    await ver(page).click()
    await expect(quiz(page).locator('[data-quiz-titulo]')).toHaveText('No encontramos uno exacto; mira estos tours en La Paz')
    await expect(visibles(page)).toHaveCount(2)
  })

  test('sin gusto no sale de la página, y «Volver a empezar» limpia', async ({ page }) => {
    await abrir(page)
    await expect(ver(page)).toHaveAttribute('aria-disabled', 'true')
    await ver(page).click({ force: true }) // Playwright no hace clic en un link con aria-disabled sin `force`.
    await expect(page).toHaveURL(/\/es\/guia\/la-paz$/)
    await quiz(page).getByRole('radio', { name: 'Aventura' }).check()
    await ver(page).click()
    await expect(visibles(page).first()).toContainText('Pesca de prueba')
    await quiz(page).getByRole('button', { name: 'Volver a empezar' }).click()
    await expect(quiz(page).getByRole('radio', { name: 'Aventura' })).not.toBeChecked()
    await expect(ver(page)).toHaveAttribute('aria-disabled', 'true')
  })

  test('con teclado', async ({ page }) => {
    await abrir(page)
    await expect(quiz(page).getByRole('group', { name: '¿Qué te gusta más?' })).toBeVisible()
    await quiz(page).getByRole('radio', { name: 'Mar y animales' }).focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('Tab') // Pasa al grupo del tiempo.
    await page.keyboard.press('Tab') // Pasa al botón.
    await expect(ver(page)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(quiz(page).locator('[data-quiz-titulo]')).toBeFocused()
  })

  test('con el módulo retrasado 1 s espera y no sale de la página', async ({ page }) => {
    await abrir(page)
    await page.route('**/*.js', retrasar(1000))
    await quiz(page).getByRole('radio', { name: 'Aventura' }).check()
    await ver(page).click()
    await expect(visibles(page).first()).toContainText('Pesca de prueba')
    await expect(page).toHaveURL(/\/es\/guia\/la-paz$/)
  })

  test('con el módulo bloqueado el botón lleva a la sede y cuenta el clic', async ({ page }) => {
    const eventos = await escucharEventos(page)
    await abrir(page)
    await page.route('**/*.js', (r) => r.abort())
    await page.route(/pieza=quiz-la-paz-sin-js/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'sede' }))
    await quiz(page).getByRole('radio', { name: 'Aventura' }).check()
    await ver(page).click()
    await page.waitForURL(/pieza=quiz-la-paz-sin-js/)
    await expect.poll(() => eventos.filter((e) => e.evento === 'tour_clic')).toEqual([{ evento: 'tour_clic', props: { zona: 'la-paz', origen: 'quiz' } }])
  })

  test('con el módulo tardando más de 3 s sigue el link', async ({ page }) => {
    await abrir(page)
    await page.route('**/*.js', retrasar(6000))
    await page.route(/pieza=quiz-la-paz-sin-js/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'sede' }))
    await quiz(page).getByRole('radio', { name: 'Aventura' }).check()
    await ver(page).click()
    await page.waitForURL(/pieza=quiz-la-paz-sin-js/)
  })

  test('sin JavaScript el botón es el link a la sede', async ({ browser }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false, extraHTTPHeaders: H.headers })
    const pagina = await contexto.newPage()
    await pagina.goto('/es/guia/la-paz')
    const enlace = pagina.getByRole('link', { name: 'Ver todos los tours en La Paz' }).and(pagina.locator('[data-quiz-ver]'))
    await expect(enlace).toHaveAttribute('href', /pieza=quiz-la-paz-sin-js$/)
    await expect(enlace).not.toHaveAttribute('data-evento')
    await contexto.close()
  })

  test('el módulo no se pide antes de tocar el quiz y pesa menos de 3 KiB', async ({ page }) => {
    // Los chunks llevan hash y otros módulos también se cargan tarde: se identifica por una cadena que solo está en activarQuiz.ts.
    const MARCA = 'data-quiz-preguntas'
    const scripts: { antes: boolean; cuerpo: Promise<Buffer> }[] = []
    let tocado = false
    page.on('response', (r) => {
      if (r.request().resourceType() === 'script') scripts.push({ antes: !tocado, cuerpo: r.body().catch(() => Buffer.alloc(0)) })
    })
    await abrir(page)
    await page.waitForLoadState('networkidle')
    tocado = true
    await quiz(page).getByRole('radio', { name: 'Aventura' }).check()
    await ver(page).click()
    await expect(visibles(page).first()).toBeVisible()
    const leidos = await Promise.all(scripts.map(async (s) => ({ antes: s.antes, cuerpo: await s.cuerpo })))
    const delQuiz = leidos.filter((s) => s.cuerpo.includes(MARCA))
    expect(delQuiz.length).toBeGreaterThan(0)
    expect(delQuiz.some((s) => s.antes)).toBe(false)
    expect(delQuiz.reduce((suma, s) => suma + gzipSync(s.cuerpo).length, 0)).toBeLessThan(3 * 1024)
  })

  test('sale en el tema con zona, no con el catálogo caído, y la zona sigue siendo ISR', async ({ page, request }) => {
    await abrir(page, '/es/guia/temas/con-ninos-en-la-paz-prueba')
    await page.goto('/es/guia/la-ventana')
    await expect(quiz(page)).toHaveCount(0)
    await request.get('/es/guia/la-paz', H)
    expect((await request.get('/es/guia/la-paz', H)).headers()['x-nextjs-cache']).toBe('HIT')
  })
})
