import { expect, test, type Page } from '@playwright/test'

import { SECRETO_PROXY } from '../../scripts/entorno-e2e.mjs'

const MOVIL = { width: 390, height: 844 }
const ESCRITORIO = { width: 1280, height: 800 }
const conProxy = (page: Page) => page.setExtraHTTPHeaders({ 'x-guia-proxy': SECRETO_PROXY })
const ld = async (page: Page, tipo: string) =>
  (await page.locator('script[type="application/ld+json"]').allTextContents()).filter((t) => t.includes(`"${tipo}"`))

test.describe('@indexable paquete 1: ficha', () => {
  test.use({ viewport: MOVIL })
  test.beforeEach(async ({ page }) => conProxy(page))

  test('«Antes de ir», preguntas, FAQPage y amenityFeature', async ({ page }) => {
    await page.goto('/es/guia/lugares/playa-arena-fina')
    await expect(page.getByRole('heading', { name: 'Antes de ir' })).toBeVisible()
    await expect(page.locator('.antes-de-ir')).toContainText('45 min en auto desde La Paz')
    await expect(page.locator('.datos')).toContainText('$100 MXN por persona')
    await expect(page.locator('.faq')).toContainText('¿Hay sombra?')
    expect(await ld(page, 'FAQPage')).toHaveLength(1)
    expect((await ld(page, 'LocationFeatureSpecification'))[0]).toContain('Sombra')
  })

  test('TouristTrip con el precio que se ve y asociado al lugar', async ({ page }) => {
    await page.goto('/es/guia/lugares/playa-arena-fina')
    await expect(page.locator('section.relacionados')).toContainText('$1,500')
    const trips = await ld(page, 'TouristTrip')
    const conLugar = trips.find((t) => t.includes('#lugar'))!
    expect(conLugar).toContain('"minPrice":1500')
    expect(conLugar).toContain('"priceCurrency":"MXN"')
    expect(conLugar).toContain('"unitText":"por persona"')
  })

  test('WhatsApp en «Tours para conocer» y no en el lateral', async ({ page }) => {
    await page.goto('/es/guia/lugares/playa-arena-fina')
    await expect(page.locator('section.relacionados a[data-evento="whatsapp_clic"]')).toHaveAttribute('href', /wa\.me\/5210000000000/)
    await expect(page.locator('.lateral a[data-evento="whatsapp_clic"]')).toHaveCount(0)
  })
})

test.describe('@indexable paquete 1: artículo', () => {
  test.beforeEach(async ({ page }) => conProxy(page))

  test('bloque Tour con su pieza, mención enlazada y lugar patrocinado sin enlace', async ({ page }) => {
    await page.goto('/es/guia/articulos/que-hacer-en-la-paz-prueba')
    const tour = page.locator('.b-tour a', { hasText: 'Ballenas de prueba' })
    await expect(tour).toHaveAttribute('href', /pieza=tour-articulo-que-hacer-en-la-paz-prueba$/)
    await expect(tour).toHaveAttribute('data-origen', 'articulo')
    await expect(page.locator('.b-tour')).toContainText('Ballenas de prueba, desde $1,500 MXN por persona.')
    await expect(page.locator('.art-cuerpo a', { hasText: 'Arena Fina' }).first()).toHaveAttribute('href', '/es/guia/lugares/playa-arena-fina')
    await expect(page.locator('.art-cuerpo a', { hasText: 'Patrocinado Prueba' })).toHaveCount(0)
  })
})

test.describe('@indexable paquete 1: temporada', () => {
  test.beforeEach(async ({ page }) => conProxy(page))

  test('el tour en temporada va primero, con su etiqueta, y está en la portada', async ({ page }) => {
    await page.goto('/es/guia/la-paz')
    const primero = page.locator('section.seccion:has(h2:text-is("Tours en La Paz")) a.tour, section.seccion:has(h2:text-is("Tours en La Paz")) a.tour-texto').first()
    await expect(primero).toContainText('Ballenas de prueba')
    await expect(primero).toContainText('En temporada')
    await page.goto('/es/guia')
    const seccion = page.locator('section[aria-labelledby="t-temporada"]')
    await expect(seccion).toContainText('Ballenas de prueba')
    await expect(seccion.locator('a').first()).toHaveAttribute('href', /pieza=portada-temporada$/)
  })
})

test.describe('@indexable paquete 1: WhatsApp en barra y tarjeta', () => {
  test.beforeEach(async ({ page }) => conProxy(page))

  test.describe('móvil', () => {
    test.use({ viewport: MOVIL })
    test('botón en la barra, que no pasa del 20 %', async ({ page }) => {
      await page.goto('/es/guia/la-paz')
      await expect(page.locator('#tours-barra a.boton-whatsapp')).toHaveAttribute('aria-label', 'Preguntar por WhatsApp')
      const alto = await page.locator('#tours-barra').evaluate((el) => el.getBoundingClientRect().height)
      expect(alto).toBeLessThanOrEqual(0.2 * MOVIL.height)
    })
    test('riel de zona y pie', async ({ page }) => {
      await page.goto('/es/guia/la-paz')
      await expect(page.locator('.seccion__cabeza a[data-origen="zona"][data-evento="whatsapp_clic"]')).toHaveCount(1)
      await expect(page.locator('a.pie-sb__boton[href*="wa.me"]')).toHaveAttribute('data-evento', 'whatsapp_clic')
    })
  })

  test.describe('escritorio', () => {
    test.use({ viewport: ESCRITORIO })
    test('la tarjeta lo lleva en zona y no en ficha', async ({ page }) => {
      await page.goto('/es/guia/la-paz')
      await expect(page.locator('#tours-tarjeta a[data-evento="whatsapp_clic"]')).toHaveCount(1)
      await page.goto('/es/guia/lugares/playa-arena-fina')
      await expect(page.locator('#tours-tarjeta a[data-evento="whatsapp_clic"]')).toHaveCount(0)
    })
  })
})

test.describe('@indexable paquete 1: fallos e ISR', () => {
  test.beforeEach(async ({ page }) => conProxy(page))

  test('sin catálogo la ficha carga sin tours', async ({ page }) => {
    const r = await page.goto('/es/guia/lugares/mirador-de-prueba')
    expect(r?.status()).toBe(200)
    await expect(page.locator('h1')).toContainText('Mirador de prueba')
    await expect(page.locator('section.relacionados')).toHaveCount(0)
    expect(await ld(page, 'TouristTrip')).toHaveLength(0)
  })

  test('siguen siendo ISR', async ({ request }) => {
    for (const ruta of ['/es/guia/lugares/playa-arena-fina', '/es/guia/la-paz', '/es/guia/articulos/que-hacer-en-la-paz-prueba']) {
      await request.get(ruta, { headers: { 'x-guia-proxy': SECRETO_PROXY } })
      const r = await request.get(ruta, { headers: { 'x-guia-proxy': SECRETO_PROXY } })
      expect(r.headers()['x-nextjs-cache'], ruta).toBe('HIT')
    }
  })
})
