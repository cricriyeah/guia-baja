import { expect, test, type Page } from '@playwright/test'

import { SECRETO_PROXY } from '../../scripts/entorno-e2e.mjs'

const conProxy = (page: Page) => page.setExtraHTTPHeaders({ 'x-guia-proxy': SECRETO_PROXY })
const H = { headers: { 'x-guia-proxy': SECRETO_PROXY } }

test.describe('@indexable paquete 2', () => {
  test.beforeEach(async ({ page }) => conProxy(page))

  test('itinerario: días, tarjetas, atribución y TouristTrip con itinerary', async ({ page }) => {
    await page.goto('/es/guia/itinerarios/dos-dias-en-la-paz-prueba')
    await expect(page.getByRole('heading', { name: 'Día 1: La playa' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Día 2: La ciudad' })).toBeVisible()
    const tour = page.locator('.dia-itinerario .b-tour a', { hasText: 'Ballenas de prueba' })
    await expect(tour).toHaveAttribute('href', /pieza=itinerario-dos-dias-en-la-paz-prueba-dia1$/)
    await expect(tour).toHaveAttribute('data-origen', 'itinerario')
    await expect(page.locator('section[aria-labelledby="t-tours-plan"] a').first()).toHaveAttribute('href', /pieza=itinerario-dos-dias-en-la-paz-prueba-resumen$/)
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).find((t) => t.includes('"itinerary"') && t.includes('TouristAttraction'))!
    expect(ld).toContain('Playa Arena Fina')
  })

  test('itinerario en inglés: el día sin título sale como «Day 2»', async ({ page }) => {
    await page.goto('/en/guide/itineraries/two-days-in-la-paz-sample')
    await expect(page.getByRole('heading', { name: 'Day 1: The beach' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Day 2', exact: true })).toBeVisible()
  })

  test('sin página de listado', async ({ request }) => {
    expect((await request.get('/es/guia/itinerarios', H)).status()).toBe(404)
  })

  test('tema con 3 lugares es indexable y está en el sitemap; el de menos no', async ({ page, request }) => {
    await page.goto('/es/guia/temas/con-ninos-en-la-paz-prueba')
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
    const tour = page.locator('section[aria-labelledby="t-tours-plan"] a').first()
    await expect(tour).toHaveAttribute('href', /pieza=tema-con-ninos-en-la-paz-prueba$/)
    await expect(tour).toHaveAttribute('data-origen', 'tema')
    await page.goto('/es/guia/temas/planes-en-la-baja-prueba')
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1)
    const sitemap = await (await request.get('/guia-sitemap.xml', H)).text()
    expect(sitemap).toContain('/es/guia/temas/con-ninos-en-la-paz-prueba')
    expect(sitemap).toContain('/es/guia/itinerarios/dos-dias-en-la-paz-prueba')
    expect(sitemap).not.toContain('/es/guia/temas/planes-en-la-baja-prueba')
  })

  test('«Planes en La Paz» en la zona y «Aparece en» en la ficha', async ({ page }) => {
    await page.goto('/es/guia/la-paz')
    const planes = page.locator('section[aria-labelledby="t-planes"]')
    await expect(planes).toContainText('Dos días en La Paz (prueba)')
    await expect(planes).toContainText('2 días')
    await page.goto('/es/guia/lugares/playa-arena-fina')
    await expect(page.locator('section[aria-labelledby="t-aparece-en"]')).toContainText('Dos días en La Paz (prueba)')
  })

  test('la búsqueda y las sugerencias encuentran el itinerario', async ({ page, request }) => {
    await page.goto('/es/guia/buscar?q=dos+dias')
    await expect(page.locator('a', { hasText: 'Dos días en La Paz (prueba)' }).first()).toHaveAttribute('href', '/es/guia/itinerarios/dos-dias-en-la-paz-prueba')
    const r = await request.get('/es/guia/buscar/sugerencias?q=dos+dias', H)
    expect(r.status()).toBe(200)
    expect(await r.json()).toContainEqual(expect.objectContaining({ tipo: 'itinerario', ruta: '/es/guia/itinerarios/dos-dias-en-la-paz-prueba' }))
  })

  test('aviso en la variante con filtros', async ({ page }) => {
    // El tema del seed lleva lugares fijos, no criterios: este caso se comprueba con preparar.ts, que le pone categoría y característica.
    await page.goto('/es/guia/la-paz/restaurantes?caracteristica=para-ninos')
    await expect(page.locator('.hay-guia a')).toHaveAttribute('href', '/es/guia/temas/filtro-prueba')
  })

  test('siguen siendo ISR', async ({ request }) => {
    for (const ruta of ['/es/guia/itinerarios/dos-dias-en-la-paz-prueba', '/es/guia/temas/con-ninos-en-la-paz-prueba']) {
      await request.get(ruta, H)
      const r = await request.get(ruta, H)
      expect(r.headers()['x-nextjs-cache'], ruta).toBe('HIT')
    }
  })
})

test.describe('@no-indexable paquete 2', () => {
  test('las dos páginas llevan noindex', async ({ page }) => {
    await conProxy(page)
    for (const ruta of ['/es/guia/itinerarios/dos-dias-en-la-paz-prueba', '/es/guia/temas/con-ninos-en-la-paz-prueba']) {
      await page.goto(ruta)
      await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1)
    }
  })
})
