import { expect, test, type APIResponse } from '@playwright/test'

import { hreflangs, metaRobots, pedirConProxy, SLUGS } from './apoyo'

test.describe('@indexable páginas y reglas (spec §11, paso 4)', () => {
  test('portada, zona, categoría, ficha y artículo responden con su contenido', async ({ page }) => {
    await page.goto('/es/guia')
    await expect(page.locator('h1')).toBeVisible()
    await page.goto(`/es/guia/${SLUGS.zona}`)
    await expect(page.locator('h1')).toHaveText(/La Paz/i)
    await page.goto(`/es/guia/${SLUGS.zona}/${SLUGS.categoriaEs}`)
    await expect(page.locator('.nota').first()).toBeVisible()
    await page.goto(`/es/guia/lugares/${SLUGS.lugar}`)
    await expect(page.locator('h1')).toHaveText(/Cocina Marea Alta/i)
    await page.goto(`/es/guia/articulos/${SLUGS.articulo}`)
    await expect(page.locator('.faq summary').first()).toBeVisible()
  })

  test('evento pasado: «Ya pasó» arriba', async ({ page }) => {
    await page.goto(`/es/guia/eventos/${SLUGS.eventoPasado}`)
    await expect(page.locator('.ya-paso')).toContainText('Este evento ya pasó')
  })

  test('404 por idioma faltante y por ruta de idioma cruzado', async ({ request }) => {
    expect((await pedirConProxy(request, `/en/guide/places/${SLUGS.lugarSoloEs}`)).status()).toBe(404)
    expect((await pedirConProxy(request, '/en/guia')).status()).toBe(404)
    expect((await pedirConProxy(request, '/es/guide')).status()).toBe(404)
  })

  test('308 de un slug viejo', async ({ request }) => {
    const pedir = () => pedirConProxy(request, `/es/guia/lugares/${SLUGS.slugViejo}`, { maxRedirects: 0 })
    const destinos = (r: APIResponse) =>
      r.headersArray().filter((h) => h.name.toLowerCase() === 'location').map((h) => new URL(h.value, 'http://x').pathname)
    const destino = `/es/guia/lugares/${SLUGS.slugNuevo}`

    // Next 16.4.3 (sigue igual en 16.4.5): en el primer render ISR escribe Location con setHeader y otra vez con
    // appendHeader desde la entrada de caché, así que pueden salir dos líneas idénticas. En el segundo pedido no.
    // Cómo lo trata Vercel se comprueba en F5.
    const primera = await pedir()
    expect(primera.status()).toBe(308)
    expect(new Set(destinos(primera))).toEqual(new Set([destino]))

    const segunda = await pedir()
    expect(segunda.status()).toBe(308)
    expect(destinos(segunda)).toEqual([destino])
  })

  test('X-Robots-Tag: noindex sin la cabecera; sin X-Robots-Tag con ella', async ({ request }) => {
    expect((await request.get('/es/guia')).headers()['x-robots-tag']).toBe('noindex')
    const conProxy = await pedirConProxy(request, '/es/guia')
    expect(conProxy.headers()['x-robots-tag']).toBeUndefined()
    expect(conProxy.headers()['x-guia-origen']).toBe('publico')
  })

  test('el HTML pedido con la cabecera después de pedirlo sin ella no tiene noindex y conserva sus hreflang', async ({ request }) => {
    const ruta = `/es/guia/lugares/${SLUGS.lugar}`
    await request.get(ruta) // primero sin cabecera: si el HTML dependiera de la petición, quedaría en caché así
    const html = await (await pedirConProxy(request, ruta)).text()
    expect(metaRobots(html)).not.toMatch(/noindex/)
    expect(hreflangs(html)).toEqual(['en-US', 'es-MX', 'x-default'])
  })

  test('sitemap con URLs absolutas', async ({ request }) => {
    const r = await pedirConProxy(request, '/guia-sitemap.xml')
    expect(r.status()).toBe(200)
    expect(await r.text()).toContain('<loc>https://www.salysoltours.com/es/guia</loc>')
  })
})
