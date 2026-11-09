import { expect, test, type Page } from '@playwright/test'

import { SECRETO_PROXY } from '../../scripts/entorno-e2e.mjs'

// docs/specs/2026-11-07-presencia-reservas-design.md, con scripts/catalogo-falso.mjs: La Paz responde (con un servicio
// por persona de $1,500) y las demás sedes dan 500. tests/e2e/preparar.ts marca un tour relacionado en Playa Arena Fina.
const SITIO = 'https://www.salysoltours.com'
const MOVIL = { width: 390, height: 844 }
const ESCRITORIO = { width: 1280, height: 800 }

const conProxy = async (page: Page) => page.setExtraHTTPHeaders({ 'x-guia-proxy': SECRETO_PROXY })
const barra = (page: Page) => page.locator('#tours-barra a.boton')
const bajarA = (page: Page, fraccion: number) =>
  page.evaluate((f) => window.scrollTo(0, f * (document.documentElement.scrollHeight - window.innerHeight)), fraccion)

test.describe('@indexable presencia de reservas: ficha', () => {
  test.use({ viewport: MOVIL })
  test.beforeEach(async ({ page }) => conProxy(page))

  test('tour relacionado: sección, frase en el HTML, lateral sin repetir y «Reservar tour»', async ({ page, request }) => {
    const html = await (await request.get('/es/guia/lugares/playa-arena-fina', { headers: { 'x-guia-proxy': SECRETO_PROXY } })).text()
    expect(html).toContain('Para conocer Playa Arena Fina: Ballenas de prueba, desde $1,500 MXN por persona.')

    await page.goto('/es/guia/lugares/playa-arena-fina')
    const seccion = page.locator('section.relacionados')
    await expect(seccion.getByRole('heading', { name: 'Tours para conocer Playa Arena Fina' })).toBeVisible()
    await expect(seccion.locator('.relacionado')).toHaveCount(1)
    const enlace = seccion.getByRole('link', { name: /Ballenas de prueba/ })
    await expect(enlace).toHaveAttribute('href', `${SITIO}/es/servicio/empresa-prueba/ballenas-prueba?desde=guia&pieza=relacionado-playa-arena-fina`)
    await expect(enlace).toHaveAttribute('data-origen', 'relacionado')
    await expect(page.locator('.tours-zona')).not.toContainText('Ballenas de prueba')

    const reservar = page.locator('.barra-inferior a[data-origen="barra-ficha"]')
    await expect(reservar).toHaveText('Reservar tour')
    await expect(reservar).toHaveAttribute('href', `${SITIO}/es/servicio/empresa-prueba/ballenas-prueba?desde=guia&pieza=barra-lugar-playa-arena-fina`)
    await expect(page.locator('#tours-barra')).toHaveCount(0)
  })

  test('sin tours relacionados: sin sección ni «Reservar tour»', async ({ page }) => {
    await page.goto('/es/guia/lugares/cocina-marea-alta')
    await expect(page.locator('section.relacionados')).toHaveCount(0)
    await expect(page.locator('a[data-origen="barra-ficha"]')).toHaveCount(0)
  })
})

test.describe('@indexable presencia de reservas: barra fija (móvil)', () => {
  test.use({ viewport: MOVIL })
  test.beforeEach(async ({ page }) => conProxy(page))

  test('zona y portada (zona principal): precio por persona y atribución', async ({ page }) => {
    for (const ruta of ['/es/guia/la-paz', '/es/guia']) {
      await page.goto(ruta)
      await expect(barra(page)).toHaveText('Tours en La Paz desde $1,500 por persona →')
      await expect(barra(page)).toHaveAttribute('href', `${SITIO}/es/sede/la-paz?desde=guia&pieza=barra-zona-la-paz`)
      await expect(barra(page)).toHaveAttribute('data-origen', 'barra')
    }
    await page.goto('/en/guide')
    await expect(barra(page)).toHaveText('Tours in La Paz from $86 per person →')
  })

  test('con ?zona= en eventos y en categoría en todas las zonas, la zona del filtro (catálogo caído: sin precio)', async ({ page }) => {
    for (const ruta of ['/es/guia/eventos?zona=la-ventana', '/es/guia/categoria/restaurantes?zona=la-ventana']) {
      await page.goto(ruta)
      await expect(barra(page)).toHaveText('Tours en La Ventana →')
    }
    await page.goto('/es/guia/la-ventana')
    await expect(barra(page)).toHaveText('Tours en La Ventana →')
    await expect(page.locator('#tours-tarjeta')).toHaveCount(0)
  })

  test('no sale en el formulario ni en el aviso de privacidad', async ({ page }) => {
    for (const ruta of ['/es/guia/aparece-en-la-guia', '/es/guia/privacidad']) {
      await page.goto(ruta)
      await expect(page.locator('#tours-barra')).toHaveCount(0)
    }
  })

  test('fila extra al bajar a la mitad, sin pasar del 20 % de la pantalla', async ({ page }) => {
    await page.goto('/es/guia/la-paz')
    const fila = page.locator('#tours-fila')
    await expect(fila).toBeHidden()
    await bajarA(page, 0.6)
    await expect(fila).toBeVisible({ timeout: 15_000 })
    await expect(fila).toContainText('Ballenas de prueba')
    const alto = await page.locator('#tours-barra').evaluate((el) => el.getBoundingClientRect().height)
    expect(alto).toBeLessThanOrEqual(0.2 * MOVIL.height)
    await fila.getByRole('button', { name: 'Cerrar' }).click()
    await expect(fila).toBeHidden()
  })
})

test.describe('@indexable presencia de reservas: tarjeta (escritorio)', () => {
  test.use({ viewport: ESCRITORIO })
  test.beforeEach(async ({ page }) => conProxy(page))

  test('sin barra en escritorio; la tarjeta no sale antes de 5 s, sale a la mitad, Esc la cierra y no vuelve en la sesión', async ({ page }) => {
    await page.goto('/es/guia/la-paz')
    await expect(page.locator('#tours-barra')).toBeHidden()
    const tarjeta = page.locator('#tours-tarjeta')
    await bajarA(page, 0.6)
    await page.waitForTimeout(2500)
    await expect(tarjeta).toBeHidden()
    await expect(tarjeta).toBeVisible({ timeout: 15_000 })
    await expect(tarjeta.getByRole('link', { name: /Ballenas de prueba/ })).toHaveAttribute('href', /pieza=tarjeta-la-paz$/)
    await page.keyboard.press('Escape')
    await expect(tarjeta).toBeHidden()

    await page.goto('/es/guia/la-paz/restaurantes')
    await bajarA(page, 0.6)
    await page.waitForTimeout(7000)
    await expect(page.locator('#tours-tarjeta')).toBeHidden()
  })

  test('no sale con otra capa abierta', async ({ page }) => {
    await page.goto('/es/guia/la-paz')
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div class="visor mostrado" id="visor-prueba"></div>'))
    await bajarA(page, 0.6)
    await page.waitForTimeout(7000)
    await expect(page.locator('#tours-tarjeta')).toBeHidden()
    await page.evaluate(() => document.getElementById('visor-prueba')?.remove())
    await bajarA(page, 0.65)
    await expect(page.locator('#tours-tarjeta')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('@indexable presencia de reservas: evento, búsqueda e ISR', () => {
  test.beforeEach(async ({ page }) => conProxy(page))

  test('evento: tours de la zona con su atribución', async ({ page }) => {
    await page.goto('/es/guia/eventos/concierto-de-prueba')
    const enlace = page.locator('.tours-zona a', { hasText: 'Pesca de prueba' })
    await expect(enlace).toHaveAttribute('href', /pieza=evento-concierto-de-prueba$/)
    await expect(enlace).toHaveAttribute('data-origen', 'evento')
  })

  test('búsqueda: tours de la zona principal, también sin resultados; con zona sin catálogo, no hay bloque', async ({ page }) => {
    await page.goto('/es/guia/buscar?q=zzzzzz')
    const enlace = page.locator('.tours-zona a', { hasText: 'Pesca de prueba' })
    await expect(enlace).toHaveAttribute('href', /pieza=busqueda$/)
    await expect(enlace).toHaveAttribute('data-origen', 'busqueda')
    await page.goto('/es/guia/buscar?q=zzzzzz&zona=la-ventana')
    await expect(page.locator('.tours-zona')).toHaveCount(0)
  })

  test('el listado de eventos y la ficha siguen siendo ISR con el slot @tours', async ({ request }) => {
    for (const ruta of ['/es/guia/eventos', '/es/guia/lugares/playa-arena-fina']) {
      await request.get(ruta, { headers: { 'x-guia-proxy': SECRETO_PROXY } })
      const r = await request.get(ruta, { headers: { 'x-guia-proxy': SECRETO_PROXY } })
      expect(r.headers()['x-nextjs-cache'], ruta).toBe('HIT')
    }
  })
})
