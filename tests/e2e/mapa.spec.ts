import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { SECRETO_PROXY } from '../../scripts/entorno-e2e.mjs'

const H = { headers: { 'x-guia-proxy': SECRETO_PROXY } }
const ESTILO = JSON.parse(readFileSync('tests/e2e/fixtures/estilo-mapa.json', 'utf8'))
const VERSION = JSON.parse(readFileSync('node_modules/maplibre-gl/package.json', 'utf8')).version as string
const CORS = { 'access-control-allow-origin': '*' }
const FICHA = '/es/guia/lugares/playa-arena-fina'
const CATEGORIA = '/es/guia/la-paz/playas'

// Sin servidor externo. El GeoJSON lo procesa el worker: sin worker no llega `load`.
async function servirMapa(page: Page, retrasoEstilo = 0) {
  await page.route(/tiles\.openfreemap\.org\/styles\//, async (r) => {
    if (retrasoEstilo) await new Promise((f) => setTimeout(f, retrasoEstilo))
    await r.fulfill({ json: ESTILO, headers: CORS })
  })
  await page.route(/tiles\.openfreemap\.org\/prueba\//, (r) => r.fulfill({ status: 204, headers: CORS, body: '' }))
}

async function abrir(page: Page, ruta: string) {
  await page.setExtraHTTPHeaders(H.headers)
  await page.goto(ruta)
  await page.locator('.mapa').scrollIntoViewIfNeeded()
}

test.describe('@indexable mapa', () => {
  test('el build deja el worker y se sirve', async ({ request }) => {
    for (const archivo of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
      expect(existsSync(path.join('public/guia-assets/maplibre', VERSION, archivo)), archivo).toBe(true)
      expect((await request.get(`/guia-assets/maplibre/${VERSION}/${archivo}`, H)).status(), archivo).toBe(200)
    }
  })

  for (const ruta of [FICHA, CATEGORIA]) {
    test(`se inicia en ${ruta}, con lienzo y popup`, async ({ page }) => {
      await servirMapa(page)
      await abrir(page, ruta)
      await expect(page.locator('.mapa[data-mapa-listo="1"]')).toBeVisible({ timeout: 15_000 })
      await expect(page.locator('.mapa canvas')).toBeVisible()
      await page.locator('.maplibregl-marker').first().click()
      await expect(page.locator('.maplibregl-popup')).toContainText('Playa Arena Fina')
    })
  }

  test('con el worker bloqueado: texto de respaldo a los 10 s y nunca listo', async ({ page }) => {
    const avisos: string[] = []
    page.on('console', (m) => { if (m.type() === 'warning') avisos.push(m.text()) })
    await page.route(/maplibre-gl-(worker|shared)\.mjs/, (r) => r.abort())
    await servirMapa(page)
    await abrir(page, FICHA)
    await expect(page.locator('.mapa__respaldo')).toBeVisible({ timeout: 15_000 })
    expect(avisos.some((a) => a.includes('mapa sin cargar a los 10 s'))).toBe(true)
    await expect(page.locator('.mapa[data-mapa-listo="1"]')).toHaveCount(0)
  })

  test.describe('en móvil', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('el texto de respaldo no queda recortado por la caja 16:9 de la ficha', async ({ page }) => {
      await page.route(/maplibre-gl-(worker|shared)\.mjs/, (r) => r.abort())
      await servirMapa(page)
      await abrir(page, FICHA)
      const respaldo = page.locator('.mapa__respaldo')
      await expect(respaldo).toBeVisible({ timeout: 15_000 })
      const [caja, texto] = await Promise.all([page.locator('.mapa').boundingBox(), respaldo.boundingBox()])
      expect(texto!.y + texto!.height).toBeLessThanOrEqual(caja!.y + caja!.height + 1)
    })
  })

  test('una tesela abortada no tumba el mapa', async ({ page }) => {
    await servirMapa(page)
    await page.route(/tiles\.openfreemap\.org\/prueba\//, (r) => r.abort())
    await abrir(page, FICHA)
    await expect(page.locator('.mapa[data-mapa-listo="1"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.mapa__respaldo')).toHaveCount(0)
  })

  test('el estilo retrasado 12 s: respaldo a los 10 s y después el mapa', async ({ page }) => {
    test.setTimeout(45_000)
    await servirMapa(page, 12_000)
    await abrir(page, FICHA)
    await expect(page.locator('.mapa__respaldo')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.mapa[data-mapa-listo="1"]')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.mapa__respaldo')).toHaveCount(0)
  })

  test('el popup de un lugar con tour lleva el tour, y hay insignia y leyenda', async ({ page }) => {
    await servirMapa(page)
    await abrir(page, CATEGORIA)
    await expect(page.locator('.mapa[data-mapa-listo="1"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.mapa-leyenda')).toContainText('Con tour disponible')
    const marcador = page.getByRole('button', { name: 'Playa Arena Fina, con tour disponible' })
    await expect(marcador).toContainText('Tour')
    await marcador.click()
    const enlace = page.locator('.maplibregl-popup a[data-origen="mapa"]')
    await expect(enlace).toContainText('Ballenas de prueba, desde')
    await expect(enlace).toHaveAttribute('data-evento', 'tour_clic')
    await expect(enlace).toHaveAttribute('data-zona', 'la-paz')
    await expect(enlace).toHaveAttribute('href', /pieza=mapa-la-paz-playas$/)
  })

  test('el tema con zona suma mapa con su atribución', async ({ page }) => {
    await servirMapa(page)
    await abrir(page, '/es/guia/temas/con-ninos-en-la-paz-prueba')
    await page.getByRole('button', { name: 'Playa Arena Fina, con tour disponible' }).click()
    await expect(page.locator('.maplibregl-popup a[data-origen="mapa"]')).toHaveAttribute('href', /pieza=mapa-tema-con-ninos-en-la-paz-prueba$/)
  })
})
