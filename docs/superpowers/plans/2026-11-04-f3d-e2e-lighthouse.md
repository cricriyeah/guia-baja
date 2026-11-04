# F3d E2E y Lighthouse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar los pasos 4 y 5 del CI (spec §11):

- **Paso 4:** E2E con Playwright contra un build de producción local con datos del seed. Cubren la lista exacta del spec y la navegación con `<Link>`.
- **Paso 5:** Lighthouse CI con emulación móvil y la mediana de 3 corridas, en portada, zona, ficha y artículo. Umbrales: LCP < 2.5 s, TBT < 200 ms y CLS < 0.1.

**Architecture:**

- **Dos modos, dos builds.** `GUIA_INDEXABLE` se lee al renderizar. Unas páginas se renderizan en el build (las de `[lang]` sin segmento dinámico: portada, eventos, negocios y privacidad) y otras en el `start` (ISR bajo demanda). Por eso cada modo usa **un solo objeto de entorno** (`envModo`), idéntico en `build`, en `start` y en Lighthouse, como pasa en Vercel:
  - `@no-indexable` con `GUIA_INDEXABLE=false`;
  - `@indexable` con `GUIA_INDEXABLE=true`.
- **Orquestador** (`scripts/e2e.mjs`). Corre los dos modos siempre y sale con un código distinto de 0 si alguno falló. En cada modo:
  - corre el seed (guardia incluida) y `preparar`, porque el seed calcula fechas respecto a «ahora»;
  - **borra `.next` entero**, porque `unstable_cache` guarda datos en `.next/cache` y un build anterior los reutilizaría;
  - corre `npm run build` con `envModo`;
  - corre `playwright test` con `E2E_MODO`.
- **El servidor lo maneja el `webServer` de Playwright** (`npm run start -- -p <puerto>`, con `envModo` y un puerto por modo). Playwright mata el árbol de procesos al terminar, en Windows y en POSIX, así que no quedan procesos `next start` huérfanos.
- **Lighthouse** corre después, contra el build del modo indexable, con el mismo `envModo` en `startServerCommand`. No sube resultados.
- **En el CI**, E2E y Lighthouse van en un job aparte (`e2e`), con su propio Postgres. Corre en paralelo al job de calidad y no consume su presupuesto de tiempo.

**Tech Stack:** Playwright (`@playwright/test`, Chromium), `@lhci/cli`, Next.js 16.4.3 en modo producción, Postgres/PostGIS, llaves de prueba de Cloudflare Turnstile.

**Spec:** `docs/specs/2026-10-30-guia-baja-design.md` §11 (CI, pasos 4 y 5), §4.1 y §9. Índice: `docs/superpowers/plans/2026-11-04-f3-sitio-publico.md`. Requiere F3a, F3b y F3c completos.

## Global Constraints

- Todo lo de F3a, F3b y F3c sigue en pie.
- **Dependencias nuevas, solo de desarrollo y con versión exacta:** `@playwright/test` y `@lhci/cli`. Se justifican en el PR por los pasos 4 y 5 del spec §11.
- **CI:**
  - Permisos de solo lectura y sin secretos de producción.
  - Lighthouse no sube resultados (`upload.target: filesystem`).
  - Un PR no se mezcla con el CI en rojo.
- **Datos:** nunca datos reales, solo el seed de datos inventados. Turnstile usa las llaves de prueba que siempre pasan: `1x00000000000000000000AA` y `1x0000000000000000000000000000000AA`. La prueba del formulario necesita red (`challenges.cloudflare.com`).
- **Alcance:** las E2E no tocan el esquema ni cambian código de la app. Si una revela una falla de la app, se arregla en una tarea aparte con su prueba unitaria o de integración.
- Commits en español con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nunca `push`. No tocar `.great_cto/` ni `shared/`.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `package.json`, `package-lock.json` | Modificar | `devDependencies`: `@playwright/test` y `@lhci/cli`. Scripts: `test:e2e` (`node scripts/e2e.mjs`) y `lighthouse` (`node scripts/lighthouse.mjs`). |
| `scripts/entorno-e2e.mjs` | Crear | `envModo(modo)`: el objeto de entorno de cada modo, que usan el orquestador, la config de Playwright y Lighthouse. Lleva `GUIA_INDEXABLE`, `GUIA_PROXY_SECRET`, `TURNSTILE_SITE_KEY`/`SECRET_KEY` de prueba, `IP_HASH_SALT`, `CRON_SECRET` y `SITIO_URL`. También `PUERTOS = { 'no-indexable': 3101, indexable: 3102 }`. |
| `scripts/e2e.mjs` | Crear | Orquestador, sin shell (`spawn` de `process.execPath` o `npm` con `shell` solo en win32 para `npm`). Para cada modo: seed (`SEED_PERMITIDO` y contraseña de prueba) → `preparar` → `rm -rf .next` → `npm run build` con `envModo` → `npx playwright test` con `E2E_MODO`. Corre los dos modos y sale con 1 si cualquiera falló. |
| `scripts/lighthouse.mjs` | Crear | Si `.next` no es del modo indexable, lo reconstruye. Después corre `lhci autorun` con `envModo('indexable')`. |
| `playwright.config.ts` | Crear | Lee `E2E_MODO`: `grep` (`@no-indexable` o `@indexable`), `baseURL` (`http://localhost:<puerto>`) y `webServer` (`npm run start -- -p <puerto>`, `env: envModo(modo)`, `url: …/es/guia`, `timeout: 120_000` y `reuseExistingServer: false`). Reporter `list` + `['html', { open: 'never', outputFolder: 'playwright-report/<modo>' }]`; `outputDir: 'test-results/<modo>'`; `retries` 1 en el CI. |
| `tests/e2e/preparar.ts` | Crear | Script de `payload run`, idempotente. <ul><li>Enciende `formularioActivo`.</li><li>Cambia el slug en español de «Mesa del Desierto» a `mesa-del-desierto-nueva`, sin `sinRedirecciones`, para crear la redirección 308.</li><li>Borra las Solicitudes de pruebas anteriores.</li></ul> |
| `tests/e2e/apoyo.ts` | Crear | Secreto del proxy (de `envModo`), `pedirConProxy(request, ruta, { maxRedirects? })`, `metaRobots(html)`, `hreflangs(html)` (solo los `<link rel="alternate">`) y slugs del seed. |
| `tests/e2e/no-indexable.spec.ts` | Crear | `@no-indexable`: `<meta name="robots">` con `noindex` (portada y zona); `/guia-sitemap.xml` da 404; sin la cabecera del proxy, `X-Robots-Tag: noindex`. |
| `tests/e2e/indexable.spec.ts` | Crear | `@indexable` (spec §11, paso 4): <ul><li>portada, zona, categoría en zona, ficha, evento pasado («Ya pasó») y artículo;</li><li>404 por idioma faltante y 404 en ruta de idioma cruzado;</li><li>308 de un slug viejo, con `maxRedirects: 0` (`status` 308 y `location`);</li><li>sin la cabecera, `X-Robots-Tag: noindex`; con la cabecera, sin ella;</li><li>el HTML pedido con la cabecera después de pedirlo sin ella no tiene `noindex` y conserva sus `hreflang`;</li><li>sitemap con URLs.</li></ul> |
| `tests/e2e/formulario.spec.ts` | Crear | `@indexable`. Cada caso abre una página nueva y usa un correo único (`Date.now()` + `testInfo.retry`). Espera a que `cf-turnstile-response` tenga valor antes de enviar. Casos: sin aceptar el aviso (error del campo) y envío válido (confirmación). |
| `tests/e2e/navegacion.spec.ts` | Crear | `@indexable`: navega con los links de la cabecera (`<Link>`) entre portada, zona y ficha, y comprueba que el contenido nuevo se ve con opacidad 1. Es la prueba de `Efectos` que pidió F3b. |
| `lighthouserc.json` | Crear | `collect`: 4 URLs del modo indexable y `numberOfRuns: 3`, con el móvil por defecto de Lighthouse, sin `preset`. `assert.assertions`: `largest-contentful-paint` `{ maxNumericValue: 2500, aggregationMethod: 'median' }`, `total-blocking-time` 200 y `cumulative-layout-shift` 0.1, también con la mediana. `upload: { target: 'filesystem', outputDir: '.lighthouseci' }`. El arranque del servidor lo pone `scripts/lighthouse.mjs` (`--collect.startServerCommand`) con el entorno del modo. |
| `.github/workflows/ci.yml` | Modificar | Job nuevo, `e2e` (`timeout-minutes: 40`), en paralelo a `calidad`, con su servicio de Postgres. Pasos: <ul><li>`payload migrate` sobre la base `guia` que crea el servicio (`POSTGRES_DB`; sin `createdb`);</li><li>`npx playwright install --with-deps chromium`;</li><li>`npm run test:e2e` (paso 4) y `npm run lighthouse` (paso 5);</li><li>si algo falla, se suben como artefactos `playwright-report/`, `test-results/` y `.lighthouseci/`.</li></ul> |
| `.gitignore` | Modificar | `playwright-report/`, `test-results/` y `.lighthouseci/`. |
| `eslint.config.mjs` | Modificar | Ignorar `playwright-report/`, `test-results/` y `.lighthouseci/`. |
| `AGENTS.md` | Modificar | `npm run test:e2e` (Docker arriba; corre seed, `preparar` y dos builds; borra `.next`) y `npm run lighthouse`. |

<!-- arch-critic: APPROVED -->

---

### Task 1: Infraestructura E2E y el modo no indexable

**Files:**
- Create: `scripts/entorno-e2e.mjs`, `scripts/e2e.mjs`, `playwright.config.ts`, `tests/e2e/preparar.ts`, `tests/e2e/apoyo.ts`, `tests/e2e/no-indexable.spec.ts`
- Modify: `package.json`, `package-lock.json`, `.gitignore`, `eslint.config.mjs`

**Interfaces:**
- Produces:
  - `envModo(modo: 'no-indexable' | 'indexable'): Record<string, string>` y `PUERTOS`.
  - `pedirConProxy(request, ruta, opciones?)`, `metaRobots(html)` y `hreflangs(html)`.
  - El marcador `.next/.e2e-modo`, que el orquestador escribe después de cada build.

- [ ] **Step 1: Dependencias**

```bash
npm install --save-dev --save-exact @playwright/test@latest @lhci/cli@latest
npx playwright install chromium
```

Comprueba con `npm view <paquete> time` que las versiones instaladas tengan al menos dos semanas de publicadas. Si no, instala la anterior con `--save-exact`. Anota las versiones en el reporte.

En `package.json`, agrega a `scripts`: `"test:e2e": "node scripts/e2e.mjs"` y `"lighthouse": "node scripts/lighthouse.mjs"`.

En `.gitignore`, agrega `.lighthouseci/` (ya trae `/test-results/` y `/playwright-report/`). En `eslint.config.mjs`, agrega esas mismas carpetas a `ignores`.

- [ ] **Step 2: Entorno, preparación y apoyo**

```js
// scripts/entorno-e2e.mjs
// Un solo entorno por modo: el mismo en build, start (webServer) y Lighthouse (plan F3d). Valores de prueba.
export const PUERTOS = { 'no-indexable': 3101, indexable: 3102 }
export const SECRETO_PROXY = 'secreto-e2e'

export function envModo(modo) {
  return {
    GUIA_INDEXABLE: modo === 'indexable' ? 'true' : 'false',
    GUIA_PROXY_SECRET: SECRETO_PROXY,
    TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
    TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
    IP_HASH_SALT: 'sal-e2e',
    CRON_SECRET: 'cron-e2e',
    SITIO_URL: 'https://www.salysoltours.com',
  }
}
```

```ts
// tests/e2e/preparar.ts
import { getPayload } from 'payload'

import config from '../../src/payload.config'

// Corre después del seed (plan F3d): formulario encendido, una redirección 308 real y sin Solicitudes viejas.
const payload = await getPayload({ config })
await payload.updateGlobal({ slug: 'ajustes-guia', data: { formularioActivo: true }, overrideAccess: true, context: { disableRevalidate: true } })
const { docs } = await payload.find({ collection: 'lugares', where: { nombre: { equals: 'Mesa del Desierto' } }, overrideAccess: true, locale: 'es', limit: 1 })
if (docs[0] && docs[0].slug !== 'mesa-del-desierto-nueva') {
  // Sin sinRedirecciones: el hook de F2 crea /es/guia/lugares/mesa-del-desierto → …-nueva.
  await payload.update({ collection: 'lugares', id: docs[0].id, locale: 'es', data: { slug: 'mesa-del-desierto-nueva' }, overrideAccess: true, context: { disableRevalidate: true } })
}
await payload.delete({ collection: 'solicitudes', where: { id: { exists: true } }, overrideAccess: true })
process.exit(0)
```

```ts
// tests/e2e/apoyo.ts
import type { APIRequestContext } from '@playwright/test'

import { SECRETO_PROXY } from '../../scripts/entorno-e2e.mjs'

export const SLUGS = {
  zona: 'la-paz',
  categoriaEs: 'restaurantes',
  lugar: 'cocina-marea-alta',
  lugarSoloEs: 'bar-la-ballena-gris',
  eventoPasado: 'feria-de-prueba-pasada',
  articulo: 'que-hacer-en-la-paz-prueba',
  slugViejo: 'mesa-del-desierto',
  slugNuevo: 'mesa-del-desierto-nueva',
}

export const pedirConProxy = (request: APIRequestContext, ruta: string, opciones: { maxRedirects?: number } = {}) =>
  request.get(ruta, { headers: { 'x-guia-proxy': SECRETO_PROXY }, ...opciones })

export const metaRobots = (html: string) => html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? null
// Solo los alternos de la metadata (<link rel="alternate">): el selector de idioma también lleva hrefLang en un <a>.
export const hreflangs = (html: string) =>
  [...html.matchAll(/<link\b[^>]*\brel="alternate"[^>]*\bhrefLang="([^"]+)"/gi)].map((m) => m[1]).sort()
```

Importar un `.mjs` desde TypeScript requiere que `tsconfig` lo permita (`allowJs` o un `.d.ts`). Si `typecheck` lo rechaza, crea `scripts/entorno-e2e.d.mts` con las firmas `export const PUERTOS: Record<'no-indexable' | 'indexable', number>`, `export const SECRETO_PROXY: string` y `export function envModo(modo: 'no-indexable' | 'indexable'): Record<string, string>`.

- [ ] **Step 3: Configuración de Playwright y orquestador**

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

import { envModo, PUERTOS } from './scripts/entorno-e2e.mjs'

const modo = (process.env.E2E_MODO ?? 'indexable') as 'no-indexable' | 'indexable'
const puerto = PUERTOS[modo]

// El servidor lo maneja Playwright (mata el árbol en Windows y POSIX). El build lo hace scripts/e2e.mjs.
export default defineConfig({
  testDir: 'tests/e2e',
  grep: new RegExp(`@${modo}\\b`),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: `playwright-report/${modo}` }]],
  outputDir: `test-results/${modo}`,
  use: { baseURL: `http://localhost:${puerto}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run start -- -p ${puerto}`,
    url: `http://localhost:${puerto}/es/guia`,
    env: envModo(modo),
    timeout: 120_000,
    reuseExistingServer: false,
  },
})
```

```js
// scripts/e2e.mjs
// Orquestador de las E2E (plan F3d): para cada modo, datos frescos, .next limpio, build con su entorno y Playwright.
import { spawnSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'

import { envModo } from './entorno-e2e.mjs'

const win = process.platform === 'win32'
// npm y npx son .cmd en Windows: Node 24 exige shell para lanzarlos (EINVAL sin él).
const correr = (cmd, args, env = {}) =>
  spawnSync(cmd, args, { stdio: 'inherit', shell: win, env: { ...process.env, ...env } }).status ?? 1

const SEMILLA = { SEED_PERMITIDO: 'true', SEED_CONTRASENA_ADMIN: 'contrasena-e2e-larga' }
let fallo = false

// E2E_SOLO=indexable (o no-indexable) corre un solo modo mientras se trabaja.
const MODOS = ['no-indexable', 'indexable'].filter((m) => !process.env.E2E_SOLO || m === process.env.E2E_SOLO)
for (const modo of MODOS) {
  const env = envModo(modo)
  console.log(`\n=== E2E modo ${modo} ===`)
  if (correr('npm', ['run', 'seed'], { ...env, ...SEMILLA }) !== 0) process.exit(1)
  if (correr('npx', ['payload', 'run', 'tests/e2e/preparar.ts'], { ...env, NODE_OPTIONS: '--no-deprecation' }) !== 0) process.exit(1)
  // unstable_cache guarda datos en .next/cache: un build anterior los reutilizaría.
  rmSync('.next', { recursive: true, force: true })
  if (correr('npm', ['run', 'build'], env) !== 0) process.exit(1)
  writeFileSync('.next/.e2e-modo', modo)
  if (correr('npx', ['playwright', 'test'], { E2E_MODO: modo }) !== 0) fallo = true
}
process.exit(fallo ? 1 : 0)
```

En Windows, borrar `.next` falla (`EBUSY`) si hay un `next dev` o un `next start` corriendo; deténlo antes. Queda escrito en `AGENTS.md` (Task 5).

- [ ] **Step 4: Pruebas del modo no indexable**

```ts
// tests/e2e/no-indexable.spec.ts
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
```

- [ ] **Step 5: Run and commit**

Run: `docker compose up -d`, `E2E_SOLO=no-indexable npm run test:e2e`, `npm run typecheck` y `npm run lint`.
Expected: las 3 pruebas pasan; typecheck y lint limpios.

```bash
git add package.json package-lock.json .gitignore eslint.config.mjs playwright.config.ts scripts/entorno-e2e.mjs scripts/e2e.mjs tests/e2e
git commit -m "test: infraestructura E2E con dos modos y pruebas sin indexar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: E2E del modo indexable (lista del spec §11)

**Files:**
- Create: `tests/e2e/indexable.spec.ts`

**Interfaces:**
- Consumes: `apoyo.ts` (Task 1), el seed de F3b y `preparar.ts`.

- [ ] **Step 1: Write the tests**

```ts
// tests/e2e/indexable.spec.ts
import { expect, test } from '@playwright/test'

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
    const r = await pedirConProxy(request, `/es/guia/lugares/${SLUGS.slugViejo}`, { maxRedirects: 0 })
    expect(r.status()).toBe(308)
    expect(new URL(r.headers()['location'], 'http://x').pathname).toBe(`/es/guia/lugares/${SLUGS.slugNuevo}`)
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
```

- [ ] **Step 2: Run**

Run: `E2E_SOLO=indexable npm run test:e2e`
Expected: PASS. Si la prueba del 308 da 200 o 404, la redirección dentro de una página ISR no funciona como pide el spec §6. Eso se arregla en la app, en una tarea aparte y con su prueba, no aflojando esta prueba.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/indexable.spec.ts
git commit -m "test: E2E de páginas, 404, 308, origen y hreflang en modo indexable

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: E2E del formulario y de la navegación con `<Link>`

**Files:**
- Create: `tests/e2e/formulario.spec.ts`, `tests/e2e/navegacion.spec.ts`

- [ ] **Step 1: Write the tests**

```ts
// tests/e2e/formulario.spec.ts
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
```

```ts
// tests/e2e/navegacion.spec.ts
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
```

- [ ] **Step 2: Run**

Run: `E2E_SOLO=indexable npm run test:e2e`
Expected: PASS. El formulario necesita red. Si el CI no la tiene, esta prueba es la única que falla y se nota en el reporte.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/formulario.spec.ts tests/e2e/navegacion.spec.ts
git commit -m "test: E2E del formulario con Turnstile de prueba y de la navegación con Link

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Lighthouse CI

**Files:**
- Create: `lighthouserc.json`, `scripts/lighthouse.mjs`

- [ ] **Step 1: Write the configuration**

```json
{
  "ci": {
    "collect": { "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500, "aggregationMethod": "median" }],
        "total-blocking-time": ["error", { "maxNumericValue": 200, "aggregationMethod": "median" }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1, "aggregationMethod": "median" }]
      }
    },
    "upload": { "target": "filesystem", "outputDir": ".lighthouseci" }
  }
}
```

Sin `settings.preset`, Lighthouse ya emula móvil con estrangulamiento simulado (spec §11). Las URLs y el arranque los pone `scripts/lighthouse.mjs`, para que el puerto salga de un solo lugar (`PUERTOS`).

```js
// scripts/lighthouse.mjs
// Paso 5 del CI (spec §11). Usa el build del modo indexable; si .next no lo es, lo rehace como el orquestador.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

import { envModo, PUERTOS } from './entorno-e2e.mjs'

const win = process.platform === 'win32'
const env = envModo('indexable')
const correr = (cmd, args, extra = {}) => spawnSync(cmd, args, { stdio: 'inherit', shell: win, env: { ...process.env, ...env, ...extra } }).status ?? 1

const modo = existsSync('.next/.e2e-modo') ? readFileSync('.next/.e2e-modo', 'utf8').trim() : null
if (modo !== 'indexable') {
  if (correr('npm', ['run', 'seed'], { SEED_PERMITIDO: 'true', SEED_CONTRASENA_ADMIN: 'contrasena-e2e-larga' }) !== 0) process.exit(1)
  if (correr('npx', ['payload', 'run', 'tests/e2e/preparar.ts'], { NODE_OPTIONS: '--no-deprecation' }) !== 0) process.exit(1)
  rmSync('.next', { recursive: true, force: true })
  if (correr('npm', ['run', 'build']) !== 0) process.exit(1)
  writeFileSync('.next/.e2e-modo', 'indexable')
}

const base = `http://localhost:${PUERTOS.indexable}`
const urls = ['/es/guia', '/es/guia/la-paz', '/es/guia/lugares/cocina-marea-alta', '/es/guia/articulos/que-hacer-en-la-paz-prueba']
// Con shell (Windows), Node une los argumentos sin comillas: el comando con espacios va entre comillas dobles.
const comillas = (a) => (win ? `"${a}"` : a)
const args = [
  'lhci', 'autorun',
  comillas(`--collect.startServerCommand=npm run start -- -p ${PUERTOS.indexable}`),
  '--collect.startServerReadyPattern=Ready',
  '--collect.startServerReadyTimeout=60000',
  ...(process.env.CI ? [comillas('--collect.settings.chromeFlags=--no-sandbox')] : []),
  ...urls.map((u) => `--collect.url=${base}${u}`),
]
process.exit(correr('npx', args))
```

Revisa el texto que imprime `next start` 16.4.3 al quedar listo (por ejemplo «✓ Ready in …») y ajusta `startServerReadyPattern` a algo que sí aparezca. El reporte de Lighthouse guarda el `benchmarkIndex` de cada corrida; con él se distingue ruido del runner de una regresión de la app.

- [ ] **Step 2: Run**

Run: `npm run lighthouse`
Expected: termina con las tres aserciones en verde. Si LCP o TBT fallan de forma reproducible, abre los reportes en `.lighthouseci/` y anota la causa. La corrección (imágenes, JS de cliente, fuentes) es una tarea de la app aparte; no subas los umbrales del spec.

- [ ] **Step 3: Commit**

```bash
git add lighthouserc.json scripts/lighthouse.mjs
git commit -m "test: Lighthouse CI con mediana de 3 corridas en móvil

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Job `e2e` del CI y documentación

**Files:**
- Modify: `.github/workflows/ci.yml`, `AGENTS.md`

- [ ] **Step 1: Job nuevo**

Agrega a `.github/workflows/ci.yml`, al mismo nivel que `calidad`:

```yaml
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 40
    services:
      postgres:
        image: postgis/postgis:17-3.5
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: guia
        ports: ['5433:5432']
        options: >-
          --health-cmd "pg_isready -h 127.0.0.1 -U postgres -d guia"
          --health-interval 5s --health-timeout 5s --health-retries 20
    env:
      # El seed solo corre contra localhost (src/seed/guardia.ts).
      DATABASE_URL: postgres://postgres:postgres@localhost:5433/guia
      DATABASE_URL_UNPOOLED: postgres://postgres:postgres@localhost:5433/guia
      PAYLOAD_SECRET: secreto-solo-para-ci
      NODE_OPTIONS: --no-deprecation
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - name: Migrar la base
        run: npx payload migrate
      - run: npx playwright install --with-deps chromium
      # Paso 4 del spec §11: E2E en los dos modos (seed, preparar y build propios).
      - run: npm run test:e2e
      # Paso 5: Lighthouse sobre el build indexable que dejó el paso anterior.
      - run: npm run lighthouse
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: reportes-e2e
          include-hidden-files: true # .lighthouseci/ es una carpeta oculta
          path: |
            playwright-report/
            test-results/
            .lighthouseci/
```

Fija `actions/upload-artifact` igual que las demás acciones del archivo. Si F6 las fija por SHA, esta también.

- [ ] **Step 2: AGENTS.md**

En «Comandos», agrega:

```markdown
- `npm run test:e2e` — E2E con Playwright en dos modos (`GUIA_INDEXABLE` false y true). Necesita Docker arriba;
  corre el seed (datos inventados, borra todo), prepara datos de prueba, **borra `.next`** y construye dos veces.
  En Windows, detén antes cualquier `next dev`/`next start` (si no, borrar `.next` falla con EBUSY).
  `E2E_SOLO=indexable` corre un solo modo.
- `npm run lighthouse` — Lighthouse CI (mediana de 3 corridas, móvil) sobre el build indexable; si `.next` no lo es, lo rehace.
```

y en «CI» agrega: «Job `e2e` aparte: E2E (paso 4) y Lighthouse (paso 5).»

- [ ] **Step 3: Verify**

Corre `npm run test:e2e` y `npm run lighthouse` en local otra vez. Valida la sintaxis del workflow con `npx --yes @action-validator/cli .github/workflows/ci.yml` si está disponible; si no, revísala a ojo, cuidando la indentación de `services` y `steps`.
Expected: todo pasa.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml AGENTS.md
git commit -m "ci: job de E2E y Lighthouse en paralelo al de calidad

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<!-- plan-review: APPROVED (2026-11-04) -->
