import { expect, test } from '@playwright/test'

import { SECRETO_PROXY } from '../../scripts/entorno-e2e.mjs'
import { erroresResumenV1 } from '../contrato/resumen-v1'

const SITIO = 'https://www.salysoltours.com'

// Spec §8.1, con scripts/catalogo-falso.mjs: La Paz responde y las demás sedes dan 500.
test.describe('@indexable tours en esta zona', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-guia-proxy': SECRETO_PROXY })
  })

  test('zona en español: pesos, enlaces con atribución y tour_clic', async ({ page }) => {
    await page.goto('/es/guia/la-paz')
    const seccion = page.locator('section', { has: page.getByRole('heading', { name: 'Tours en La Paz' }) })
    await expect(seccion).toContainText('Pesca de prueba')
    await expect(seccion).toContainText('desde $11,290 MXN por grupo')
    await expect(seccion).toContainText('Paquete de prueba')
    await expect(seccion).toContainText('5 noches')
    await expect(seccion).not.toContainText('Tour apagado')
    const enlace = seccion.getByRole('link', { name: /Pesca de prueba/ })
    await expect(enlace).toHaveAttribute('href', `${SITIO}/es/servicio/empresa-prueba/pesca-prueba?desde=guia&pieza=zona-la-paz`)
    await expect(enlace).toHaveAttribute('data-evento', 'tour_clic')
    await expect(enlace).toHaveAttribute('data-origen', 'zona')
    await expect(seccion.getByRole('link', { name: /Paquete de prueba/ })).toHaveAttribute('href', `${SITIO}/es/sede/la-paz/paquete/paquete-prueba?desde=guia&pieza=zona-la-paz`)
  })

  test('la página con tours sigue siendo ISR: el fetch sin caché no la vuelve dinámica', async ({ request }) => {
    await request.get('/es/guia/la-paz', { headers: { 'x-guia-proxy': SECRETO_PROXY } })
    const r = await request.get('/es/guia/la-paz', { headers: { 'x-guia-proxy': SECRETO_PROXY } })
    expect(r.headers()['cache-control']).not.toContain('no-store')
    expect(r.headers()['x-nextjs-cache']).toBe('HIT')
  })

  test('catálogo caído: la página carga y no hay bloque', async ({ page }) => {
    const r = await page.goto('/es/guia/la-ventana')
    expect(r?.status()).toBe(200)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Tours en/ })).toHaveCount(0)
    await expect(page.locator('.tours__panel')).toBeVisible()
  })

  test('categoría en zona: atribución de la categoría', async ({ page }) => {
    await page.goto('/es/guia/la-paz/restaurantes')
    const enlace = page.locator('.riel__pista.tours a', { hasText: 'Pesca de prueba' })
    await expect(enlace).toHaveAttribute('href', /pieza=categoria-restaurantes$/)
    await expect(enlace).toHaveAttribute('data-origen', 'categoria')
  })

  test('ficha de lugar: filas con atribución del lugar', async ({ page }) => {
    await page.goto('/es/guia/lugares/cocina-marea-alta')
    const enlace = page.locator('.tours-zona a', { hasText: 'Pesca de prueba' })
    await expect(enlace).toHaveAttribute('href', /pieza=lugar-cocina-marea-alta$/)
    await expect(enlace).toHaveAttribute('data-origen', 'lugar')
  })

  test('artículo: bloque dentro del cuerpo', async ({ page }) => {
    await page.goto('/es/guia/articulos/que-hacer-en-la-paz-prueba')
    const enlace = page.locator('.b-tours a', { hasText: 'Pesca de prueba' })
    await expect(enlace).toHaveAttribute('href', /pieza=articulo-que-hacer-en-la-paz-prueba$/)
    await expect(enlace).toHaveAttribute('data-origen', 'articulo')
  })
})

// Spec §8.2: la ruta real, servida por el build de producción.
test.describe('@indexable contrato /api/publico/v1', () => {
  const ruta = '/api/publico/v1/zonas/la-paz/resumen'

  test('200 con la forma congelada y su Cache-Control', async ({ request }) => {
    const r = await request.get(`${ruta}?lang=es`)
    expect(r.status()).toBe(200)
    expect(r.headers()['cache-control']).toBe('public, s-maxage=600, stale-while-revalidate=3600')
    const json = await r.json()
    expect(erroresResumenV1(json)).toEqual([])
    expect(json.zona).toEqual({ nombre: 'La Paz', url: `${SITIO}/es/guia/la-paz` })
    expect(json.articulos.length).toBeGreaterThan(0)
  })

  test('404 sin zona activa con ese sedeSlug', async ({ request }) => {
    expect((await request.get('/api/publico/v1/zonas/puerto-chale/resumen?lang=es')).status()).toBe(404)
    expect((await request.get('/api/publico/v1/zonas/no-existe/resumen?lang=es')).status()).toBe(404)
  })

  test('400 con un idioma que no existe', async ({ request }) => {
    expect((await request.get(`${ruta}?lang=fr`)).status()).toBe(400)
    expect((await request.get(ruta)).status()).toBe(400)
  })
})

test.describe('@indexable tours en inglés', () => {
  test('dólares redondeados hacia arriba y rutas en inglés', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-guia-proxy': SECRETO_PROXY })
    await page.goto('/en/guide/la-paz')
    const seccion = page.locator('section', { has: page.getByRole('heading', { name: 'Tours in La Paz' }) })
    await expect(seccion).toContainText('from $646 USD per group')
    await expect(seccion.getByRole('link', { name: /Test fishing/ })).toHaveAttribute('href', `${SITIO}/en/servicio/empresa-prueba/pesca-prueba?desde=guia&pieza=zona-la-paz`)
  })
})
