import { expect, test } from '@playwright/test'

import { metaRobots, pedirConProxy, SLUGS } from './apoyo'

test.describe('@no-indexable GUIA_INDEXABLE=false (spec §9, §15)', () => {
  test('el HTML lleva noindex aunque venga por el proxy', async ({ request }) => {
    for (const ruta of ['/es/guia', `/es/guia/${SLUGS.zona}`, '/en/guide']) {
      const r = await pedirConProxy(request, ruta)
      expect(r.status()).toBe(200)
      expect(metaRobots(await r.text())).toMatch(/noindex/)
    }
  })

  test('el sitemap da 404', async ({ request }) => {
    expect((await pedirConProxy(request, '/guia-sitemap.xml')).status()).toBe(404)
  })

  test('sin la cabecera del proxy, X-Robots-Tag: noindex', async ({ request }) => {
    const r = await request.get('/es/guia')
    expect(r.headers()['x-robots-tag']).toBe('noindex')
    expect(r.headers()['x-guia-origen']).toBe('directo')
  })
})
