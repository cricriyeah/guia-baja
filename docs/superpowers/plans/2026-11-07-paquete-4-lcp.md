# Paquete 4: velocidad de carga (LCP). Plan de implementación

> **Para agentes:** sub-skill requerida: usar superpowers:subagent-driven-development (recomendada) o
> superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** encontrar con números por qué el LCP simulado de Lighthouse pasa de 2.5 s y quitar solo la causa
probada. Si la causa es el banco, dejar la decisión al dueño con los datos.

**Arquitectura:**
- **Banco de medición en el repo:** `scripts/medir/`, más un workflow que solo corre en ramas `medir/**`. Una sola
  entrada en Node (`correr.mjs`) arma el entorno, el build y el servidor, igual que la barrera.
- **Controles:** se aplican **en la copia del CI**, nunca en el código del sitio.
- **Ruido:** cada corrida lleva un control A/A (`base` y `base2`, sin cambios). Solo se culpa a un mecanismo si su
  diferencia supera el ruido A/A.
- **Resultados:** una línea `::notice::` compacta por URL, legible por la API pública de check-runs.
- **Etapa 2:** cambios pequeños y separados, uno por mecanismo culpado. Cada uno lleva su medición antes y después.
- **Este plan va primero:** su banco también da la línea base que pide el plan 1.

**Stack:** Lighthouse 12.6.1 (`node_modules/.bin/lighthouse`, de `@lhci/cli` 0.15.1), GitHub Actions y Node 24.

**Spec:** `docs/specs/2026-11-07-paquete-4-lcp-design.md` (aprobado). Lo complementan el spec principal §9 y §11, y el
plan de F3d (`docs/superpowers/plans/2026-11-04-f3d-e2e-lighthouse.md`).

## Restricciones globales

- **No cambia:**
  - `lighthouserc.json` (umbrales: LCP 2500, TBT 200 y CLS 0.1, mediana de 3).
  - Todo el contenido en el HTML del servidor.
  - El ISR (`x-nextjs-cache: HIT`). Tampoco se usan Cache Components ni PPR.
- **No se reintenta sin evidencia nueva:** `experimental.inlineCss` y `decoding="sync"`.
- **Cambios de la etapa 2:**
  - Ninguno se aplica sin que la etapa 1 culpe a su mecanismo, por encima del ruido A/A.
  - Un cambio que empeore `/es/guia/la-paz/restaurantes` o `/es/guia/eventos` se descarta.
  - CLS sigue < 0.1.
- **Diferir `Efectos`:** no se difiere mientras `.js .entra` dependa de él, salvo que antes se haya aplicado (c) a lo
  que está arriba del pliegue.
- **Repo:** commits en español, terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push directo a
  `main`. Las ramas `medir/**` se borran al terminar, **después** de leer sus anotaciones.
- **Datos:** nunca datos reales. El banco usa el seed y el catálogo falso, como el CI.
- **Precisión sobre el spec §2.1:** el control (c) apaga `.js .entra` y no la clase `js` completa. Quitar `js` también
  apagaría el brillo de la imagen LCP y otros fundidos, y la diferencia se le atribuiría mal a `.entra`.

---

## Mapa de archivos

### Banco (etapa 1)

| Archivo | Qué hace |
|---|---|
| `scripts/medir/urls.mjs` (nuevo) | Las URLs del banco: las 4 de `scripts/lighthouse.mjs` más `/es/guia/la-paz/restaurantes` y `/es/guia/eventos`. `scripts/lighthouse.mjs` no cambia. |
| `scripts/medir/controles.mjs` (nuevo) | Define los controles y `aplicarControles(letras, leer, escribir)`. Tiene guarda de `main`, para poder importarlo en pruebas. Los CSS **agregan** una regla al final de `base.css`, así (b), (c) y (d) no se pisan: (b) `#contenido { animation: none !important }`; (c) `.js .entra { opacity: 1 !important; transform: none !important; transition: none !important }`; (d) `.resultados-entran > * { animation: none !important }`. Cada control declara `debeContener`, el selector que tiene que existir, y falla si no está. (a) reemplaza `if (e.type === 'load') aparecer(e.target)` en `Efectos.tsx`. |
| `scripts/medir/resumir.mjs` (nuevo) | Funciones puras sobre un LHR y su traza. Pasa los tres relojes a ms desde `navigationStart`: `network-requests` con `debugData.networkStartTimeTs`, la traza con su `ts` y el LCP observado ya relativo. Devuelve medianas de métricas simuladas, LCP y FCP observados, selector LCP (máximo 80 caracteres), fases simuladas (segunda tabla de `largest-contentful-paint-element`), y scripts y KiB terminados y evaluados antes del LCP observado. Totales de JS (framework con `rootMainFiles` y app por separado) y de fuentes. `lineaCompacta(resumen)` **lanza si pasa de 3800 caracteres** (el runner corta en 4096). |
| `scripts/medir/medir.mjs` (nuevo) | Para cada URL, en modo simulado y en `devtools`, corre `lighthouse` 3 veces con `--save-assets --output=json --chrome-flags="--headless=new --no-sandbox"`. Lee `.next/build-manifest.json`. Imprime una línea `::notice title=lcp {control} {url}::{compacto}` por URL (6 por paso, tope 10). |
| `scripts/medir/correr.mjs` (nuevo) | **Entrada única.** Usa `envModo('indexable')` como única fuente de entorno. Corre seed y preparar, aplica el control, levanta el catálogo falso y lo **mantiene vivo** durante build y medición, hace `npm run build` y `npm run start`, calienta cada URL con dos GET y llama a `medir.mjs`. |
| `scripts/medir/matriz.json` (nuevo) | La lista de controles de esa rama. En `main`: `["base","base2","a","b","c","d","abcd"]`. Una rama de solo línea base deja `["base","base2"]`. |
| `scripts/medir/leer.mjs` (nuevo) | Uso local: `node scripts/medir/leer.mjs {sha}`. Lee las anotaciones por la API pública, sin token, y arma la tabla en Markdown con el ruido A/A por URL. |
| `.github/workflows/medir.yml` (nuevo) | `on: push: branches: ['medir/**']`. Matriz con `fromJSON` de `matriz.json`, `fail-fast: false` y `timeout-minutes: 60`. Postgres como en `ci.yml`, `npm ci`, migrar y `node scripts/medir/correr.mjs`. |
| `tests/unit/medir.test.ts` (nuevo) | `aplicarControles` con **todos los controles que sigan definidos, en secuencia, sobre los archivos reales de `src/`**; que falla si falta `debeContener`; `resumir` (conversión de relojes, LCP de texto sin `loadStart`); y `lineaCompacta` con 30 scripts, que no pasa de 3800, y con uno enorme, que lanza. |
| `tests/unit/fixtures/lhr-real.json`, `traza-real.json` (nuevos) | Recortados de una corrida real de Lighthouse sobre este repo, no escritos a mano. |
| `docs/rendimiento/lcp-2026-11.md` (nuevo) | El resultado: tabla por URL y control, ruido A/A, fase dominante y decisión. Después, una fila por cambio de la etapa 2. |

**Regla de decisión** (va en `docs/rendimiento/lcp-2026-11.md` y en `leer.mjs`):

- Un control «baja el LCP» en una URL solo si su diferencia contra `base` supera el ruido, que es la mayor diferencia
  `base`/`base2` entre las URLs.
- Si el ruido A/A es tan grande que tapa un efecto de 180 ms, los controles se corren en secuencia en un solo runner.

**Calibración contra c60283d:** la rama `medir/c60283d` parte de ese commit, trae `scripts/medir/` y el workflow, y usa
`["base","base2"]`. Así la comparación de presencia contra su línea base se hace con el mismo banco, y no contra los
números de LHCI tomados después de las E2E.

### Cambios (etapa 2, solo si la etapa 1 los culpa)

| Archivo | Qué hace |
|---|---|
| `src/sitio/ui/navegacion/aparecer.ts` | (a) Predicado puro `animaFotoAlCargar(fetchPriority)`: falso con `high`. |
| `src/sitio/ui/Efectos.tsx` | (a) `fotoLista` usa ese predicado. |
| `src/sitio/estilos/base.css` | (b) `#contenido` sale del selector de `animation: aparecer`. La navegación la sigue animando `NavegacionConEsqueleto` (el `#contenido` vive en el layout, así que el CSS solo actuaba en la carga directa). (d) `.resultados-entran > *` sale del mismo selector. |
| `src/sitio/ui/TransicionFiltros.tsx` | (d) De la base a `--filtros` o `--pagina` el componente se vuelve a montar. De `--filtros` a `--filtros`, o de `--pagina/2` a `--pagina/3`, sigue la misma instancia. Por eso un flag de módulo se prende en `alHacerClic` y lo consume un `useLayoutEffect` con dependencia en `navegando` (no en `cargando`, que no cambia en transiciones de menos de 40 ms), que actúa solo cuando `navegando` es falso: corre al montar y también al terminar una transición en la misma instancia. Llama a `aparecer` sobre los hijos (el contenedor es `display: contents`). |
| `src/sitio/ui/tarjetas/TarjetaLugar.tsx`, `src/sitio/paginas/CategoriaEnZona.tsx` | (c) Prop `entrada?: boolean` (por defecto `true`); las primeras 2 tarjetas del listado van con `entrada={false}`. Solo se agrega a otros portadores de `.entra` (`TarjetaArticulo`, `zona-tarjeta`) si la etapa 1 los nombra. |
| `tests/unit/aparecer.test.ts` (nuevo) | El predicado de (a). |
| `tests/unit/estilos.test.ts` (modificar) | Selectores de (b) y (d). |
| `tests/e2e/rendimiento.spec.ts` (nuevo, `@indexable`) | Espía `Element.prototype.animate` con `addInitScript`. (a): retiene la respuesta de las imágenes con `page.route` hasta después de hidratar, para que `load` llegue con el listener puesto; la imagen `prioridad` no se anima y una imagen sin prioridad sí (caso positivo). (d): la carga directa no anima; base a `--filtros` y `--filtros` a `--filtros` sí. No hay caso de `--pagina/2` a `--pagina/3`: el seed no llega a 3 páginas, y **no se agregan datos al seed para esto**, porque cambiaría lo que mide el banco y dejaría de ser comparable con `medir/c60283d`. (c): las tarjetas de arriba no llevan `.entra`. |

### Dependencias

- `scripts/medir/*` no importa nada de `src/`, salvo `scripts/entorno-e2e.mjs`, que ya es de scripts.
- `controles.mjs` conoce textos exactos de `src/` y falla de forma explícita si cambiaron. **Cada commit de la etapa 2
  también quita su control** de `controles.mjs` y su letra de `abcd` y de `matriz.json`; si no, `npm run test:unit`
  queda en rojo en `main`.
- Los cambios de la etapa 2 no agregan imports nuevos entre módulos.

<!-- arch-critic: APPROVED -->

---

<!-- plan-critic: APPROVED -->

## Tareas

### Tarea 1: controles

**Archivos:**
- Crear: `scripts/medir/urls.mjs`, `scripts/medir/controles.mjs`
- Prueba: `tests/unit/medir.test.ts`

**Interfaces:**
- Produce: `URLS: string[]`; `CONTROLES: Record<'a'|'b'|'c'|'d', Control[]>`; `aplicarControles(letras: string[], leer: (ruta) => string, escribir: (ruta, texto) => void): void`.

- [ ] **Paso 1: escribir la prueba que falla**

```ts
// tests/unit/medir.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { aplicarControles, CONTROLES } from '../../scripts/medir/controles.mjs'

const memoria = () => {
  const archivos = new Map<string, string>()
  return {
    archivos,
    leer: (r: string) => archivos.get(r) ?? readFileSync(r, 'utf8'),
    escribir: (r: string, t: string) => void archivos.set(r, t),
  }
}

describe('controles', () => {
  // La etapa 2 va quitando controles de CONTROLES: estas pruebas siguen valiendo con la lista corta o vacía.
  const letras = Object.keys(CONTROLES)

  it('todos los controles definidos se aplican en secuencia sobre los archivos reales', () => {
    const m = memoria()
    aplicarControles(letras, m.leer, m.escribir)
    expect(m.archivos.size > 0).toBe(letras.length > 0)
  })
  it.skipIf(letras.length === 0)('falla si falta el texto que debe existir', () => {
    expect(() => aplicarControles([letras[0]], () => 'sin nada', () => undefined)).toThrow(/no encontró/)
  })
  it('una letra desconocida falla', () => {
    expect(() => aplicarControles(['z'], () => '', () => undefined)).toThrow(/desconocido/)
  })
  it('base no aplica nada', () => {
    const m = memoria()
    aplicarControles([], m.leer, m.escribir)
    expect(m.archivos.size).toBe(0)
  })
})
```

- [ ] **Paso 2: correrla y ver que falla.** `npx vitest run tests/unit/medir.test.ts`.

- [ ] **Paso 3: implementar**

```js
// scripts/medir/urls.mjs
// Las 4 URLs de la barrera (scripts/lighthouse.mjs) y las 2 extra del spec del paquete 4 §2.1.
export const URLS = [
  '/es/guia',
  '/es/guia/la-paz',
  '/es/guia/lugares/cocina-marea-alta',
  '/es/guia/articulos/que-hacer-en-la-paz-prueba',
  '/es/guia/la-paz/restaurantes',
  '/es/guia/eventos',
]
```

```js
// scripts/medir/controles.mjs
// Controles de la etapa 1 del paquete 4. Se aplican SOLO en la copia del CI, nunca en el código del sitio.
// Las reglas CSS se agregan al final, así los controles no se pisan entre sí. Cada commit de la etapa 2 quita su control.
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const CSS = 'src/sitio/estilos/base.css'
const agregar = (selector, regla) => ({ archivo: CSS, debeContener: selector, agregar: `\n${selector} { ${regla} }\n` })

export const CONTROLES = {
  a: [{
    archivo: 'src/sitio/ui/Efectos.tsx',
    debeContener: "if (e.type === 'load') aparecer(e.target)",
    reemplazar: ["if (e.type === 'load') aparecer(e.target)", ''],
  }],
  b: [agregar('#contenido', 'animation: none !important;')],
  // Apaga .js .entra y no la clase js: quitar js también apagaría el brillo de la imagen LCP (plan del paquete 4).
  c: [agregar('.js .entra', 'opacity: 1 !important; transform: none !important; transition: none !important;')],
  d: [agregar('.resultados-entran > *', 'animation: none !important;')],
}

export function aplicarControles(letras, leer, escribir) {
  for (const letra of letras) {
    const control = CONTROLES[letra]
    if (!control) throw new Error(`Control desconocido: ${letra}`)
    for (const c of control) {
      const texto = leer(c.archivo)
      if (!texto.includes(c.debeContener)) throw new Error(`Control ${letra}: no encontró «${c.debeContener}» en ${c.archivo}`)
      escribir(c.archivo, c.reemplazar ? texto.replace(c.reemplazar[0], c.reemplazar[1]) : texto + c.agregar)
    }
  }
}

// Uso: node scripts/medir/controles.mjs a,b. «base» y «base2» no aplican nada; «abcd» aplica los que sigan definidos.
export function letrasDe(nombre) {
  if (nombre === 'base' || nombre === 'base2') return []
  if (nombre === 'abcd') return Object.keys(CONTROLES)
  return nombre.split(',')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  aplicarControles(letrasDe(process.argv[2] ?? 'base'), (r) => readFileSync(r, 'utf8'), (r, t) => writeFileSync(r, t))
}
```

- [ ] **Paso 4: correrla y ver que pasa.**

- [ ] **Paso 5: commit** con mensaje `chore: controles del banco de medición de LCP` y la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Tarea 2: resumen de Lighthouse

**Archivos:**
- Crear: `scripts/medir/resumir.mjs`, `tests/unit/fixtures/lhr-real.json`, `tests/unit/fixtures/traza-real.json`
- Prueba: `tests/unit/medir.test.ts`

**Interfaces:**
- Produce: `mediana(valores: number[]): number`; `resumirCorrida(lhr, traza, manifiesto): Resumen`; `medianas(resumenes: Resumen[]): Resumen`; `lineaCompacta(resumen): string` (lanza si pasa de 3800 caracteres).

- [ ] **Paso 1: generar los fixtures reales.** Con un build indexable y el servidor arriba (`npm run lighthouse` deja el build; luego `npm run start -- -p 3102`, con el catálogo falso corriendo):

```bash
npx lighthouse http://localhost:3102/es/guia/lugares/cocina-marea-alta --only-categories=performance --form-factor=mobile --output=json --output-path=/tmp/lhr.json --save-assets --chrome-flags="--headless=new" --quiet
```

Recortar con un script temporal a lo que usa `resumir.mjs`: del LHR, `audits` (`metrics`, `largest-contentful-paint-element`, `network-requests`), `lighthouseVersion` y `requestedUrl`; de la traza, los eventos `navigationStart`, `largestContentfulPaint::Candidate` y `EvaluateScript`. Guardar en `tests/unit/fixtures/`. Comprobar a mano, en esos JSON, los valores que va a afirmar la prueba del paso 2.

- [ ] **Paso 2: escribir la prueba que falla.** Agregar a `tests/unit/medir.test.ts`:

```ts
import lhr from './fixtures/lhr-real.json'
import traza from './fixtures/traza-real.json'
import { lineaCompacta, mediana, medianas, resumirCorrida } from '../../scripts/medir/resumir.mjs'

const manifiesto = { rootMainFiles: [] as string[] }

describe('resumirCorrida', () => {
  const r = resumirCorrida(lhr, traza, manifiesto)
  it('métricas simuladas y observadas', () => {
    expect(r.lcp).toBeGreaterThan(0)
    expect(r.lcpObservado).toBeGreaterThan(0)
    expect(r.fcpObservado).toBeGreaterThan(0)
  })
  it('selector recortado', () => {
    expect(r.selector.length).toBeLessThanOrEqual(80)
  })
  it('las fases simuladas vienen de la segunda tabla', () => {
    expect(r.fases).toHaveProperty('ttfb')
    expect(r.fases).toHaveProperty('renderDelay')
  })
  it('scripts antes del LCP en el mismo reloj', () => {
    expect(r.scriptsAntes).toBeGreaterThanOrEqual(0)
    expect(r.scriptsAntes).toBeLessThanOrEqual(r.scriptsTotal)
    expect(r.kibAntes).toBeLessThanOrEqual(r.kibTotal)
  })
  it('un script que termina después del LCP observado no cuenta', () => {
    const tarde = structuredClone(lhr)
    for (const it of tarde.audits['network-requests'].details.items) it.networkEndTime = 9e9
    expect(resumirCorrida(tarde, traza, manifiesto).scriptsAntes).toBe(0)
  })
  it('un LCP de texto, sin loadStart, no rompe las fases', () => {
    // JSON.parse da `any`: el tipo que TypeScript infiere del fixture exige `percent` en cada fila.
    const copia = JSON.parse(JSON.stringify(lhr))
    copia.audits['largest-contentful-paint-element'].details.items[1].items = [
      { phase: 'TTFB', timing: 100 }, { phase: 'Render Delay', timing: 900 },
    ]
    expect(resumirCorrida(copia, traza, manifiesto).fases).toMatchObject({ ttfb: 100, renderDelay: 900 })
  })
})

describe('mediana', () => {
  it('impar y par', () => {
    expect(mediana([3, 1, 2])).toBe(2)
    expect(mediana([1, 2, 3, 4])).toBe(2.5)
  })
})

describe('lineaCompacta', () => {
  const r = resumirCorrida(lhr, traza, manifiesto)
  it('con 30 scripts no pasa de 3800', () => {
    expect(lineaCompacta({ simulado: { ...r, scriptsTotal: 30 }, devtools: { ...r, scriptsTotal: 30 } }).length).toBeLessThanOrEqual(3800)
  })
  it('si se pasa, lanza', () => {
    expect(() => lineaCompacta({ simulado: { ...r, selector: 'x'.repeat(4000) }, devtools: r })).toThrow(/3800/)
  })
})
```

- [ ] **Paso 3: correrla y ver que falla.**

- [ ] **Paso 4: implementar**

```js
// scripts/medir/resumir.mjs
// Funciones puras sobre un LHR de Lighthouse 12.6.1 y su traza (--save-assets). Sin imports de src/.
const MAX_LINEA = 3800
const MAX_SELECTOR = 80

export function mediana(valores) {
  const v = [...valores].sort((a, b) => a - b)
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

const FASES = { TTFB: 'ttfb', 'Load Delay': 'loadDelay', 'Load Time': 'loadTime', 'Render Delay': 'renderDelay' }

// La segunda tabla de largest-contentful-paint-element es la de fases simuladas (LCPBreakdown sobre Lantern).
function fasesDe(auditoria) {
  const tabla = auditoria?.details?.items?.[1]?.items ?? []
  const fases = {}
  for (const fila of tabla) {
    const clave = FASES[fila.phase]
    if (clave) fases[clave] = Math.round(fila.timing)
  }
  return fases
}

// Los tres relojes a ms desde navigationStart: la traza usa µs absolutos; network-requests, ms desde el primer
// arranque de red (debugData.networkStartTimeTs, en µs); el LCP observado ya viene relativo.
function evaluaciones(traza, inicioTs) {
  const primero = new Map()
  for (const ev of traza.traceEvents) {
    if (ev.name !== 'EvaluateScript') continue
    const url = ev.args?.data?.url
    if (url && !primero.has(url)) primero.set(url, (ev.ts - inicioTs) / 1000)
  }
  return primero
}

export function resumirCorrida(lhr, traza, manifiesto) {
  const m = lhr.audits.metrics.details.items[0]
  const red = lhr.audits['network-requests']
  const inicioTs = m.observedNavigationStartTs
  const desfaseRedMs = ((red.details.debugData?.networkStartTimeTs ?? inicioTs) - inicioTs) / 1000
  const evals = evaluaciones(traza, inicioTs)
  const lcpObs = m.observedLargestContentfulPaint
  const scripts = red.details.items.filter((r) => r.resourceType === 'Script')
  const fuentes = red.details.items.filter((r) => r.resourceType === 'Font')
  const antes = scripts.filter((s) => s.networkEndTime + desfaseRedMs < lcpObs && (evals.get(s.url) ?? Infinity) < lcpObs)
  const kib = (lista) => Math.round(lista.reduce((t, r) => t + (r.transferSize ?? 0), 0) / 1024)
  const esFramework = (s) => (manifiesto.rootMainFiles ?? []).some((f) => s.url.endsWith(f))
  const lcpEl = lhr.audits['largest-contentful-paint-element']
  return {
    lcp: Math.round(m.largestContentfulPaint),
    fcp: Math.round(m.firstContentfulPaint),
    tbt: Math.round(m.totalBlockingTime),
    cls: Number((m.cumulativeLayoutShift ?? 0).toFixed(3)),
    lcpObservado: Math.round(lcpObs),
    fcpObservado: Math.round(m.observedFirstContentfulPaint),
    selector: String(lcpEl?.details?.items?.[0]?.items?.[0]?.node?.selector ?? '').slice(0, MAX_SELECTOR),
    fases: fasesDe(lcpEl),
    scriptsTotal: scripts.length,
    scriptsAntes: antes.length,
    kibTotal: kib(scripts),
    kibAntes: kib(antes),
    kibFramework: kib(scripts.filter(esFramework)),
    kibApp: kib(scripts.filter((s) => !esFramework(s))),
    kibFuentes: kib(fuentes),
  }
}

export function medianas(resumenes) {
  const primero = resumenes[0]
  const salida = { ...primero }
  for (const clave of Object.keys(primero)) {
    if (typeof primero[clave] === 'number') salida[clave] = mediana(resumenes.map((r) => r[clave]))
  }
  salida.fases = {}
  for (const clave of Object.keys(primero.fases)) salida.fases[clave] = mediana(resumenes.map((r) => r.fases[clave] ?? 0))
  return salida
}

// El runner corta las anotaciones en 4096 caracteres: mejor fallar que leer un JSON cortado.
export function lineaCompacta(porModo) {
  const linea = JSON.stringify(porModo)
  if (linea.length > MAX_LINEA) throw new Error(`Línea de medición de ${linea.length} caracteres; el máximo es ${MAX_LINEA}.`)
  return linea
}
```

- [ ] **Paso 5: correrla y ver que pasa.** Si una ruta del LHR real difiere (por ejemplo `observedNavigationStartTs`), corregir `resumir.mjs` contra el fixture real.

- [ ] **Paso 6: commit** con mensaje `chore: resumen de corridas de Lighthouse para el banco de LCP` y la línea `Co-Authored-By`.

### Tarea 3: medir, correr y workflow

**Archivos:**
- Crear: `scripts/medir/medir.mjs`, `scripts/medir/correr.mjs`, `scripts/medir/matriz.json`, `scripts/medir/leer.mjs`, `.github/workflows/medir.yml`

- [ ] **Paso 1: `medir.mjs`**

```js
// scripts/medir/medir.mjs
// Corre Lighthouse 3 veces por URL y modo, e imprime una línea ::notice por URL. Uso: node scripts/medir/medir.mjs {control} {puerto}
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'

import { lineaCompacta, medianas, resumirCorrida } from './resumir.mjs'
import { URLS } from './urls.mjs'

const [control, puerto] = process.argv.slice(2)
const CORRIDAS = 3
const MODOS = { simulado: 'simulate', devtools: 'devtools' }
const manifiesto = JSON.parse(readFileSync('.next/build-manifest.json', 'utf8'))

function corrida(url, metodo) {
  rmSync('medicion/tmp', { recursive: true, force: true })
  mkdirSync('medicion/tmp', { recursive: true })
  const r = spawnSync('npx', [
    'lighthouse', `http://localhost:${puerto}${url}`,
    '--only-categories=performance', '--form-factor=mobile',
    `--throttling-method=${metodo}`,
    '--output=json', '--output-path=medicion/tmp/lhr.json', '--save-assets', '--quiet',
    '--chrome-flags=--headless=new --no-sandbox',
  ], { stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`Lighthouse falló en ${url} (${metodo})`)
  return resumirCorrida(
    JSON.parse(readFileSync('medicion/tmp/lhr.json', 'utf8')),
    JSON.parse(readFileSync('medicion/tmp/lhr-0.trace.json', 'utf8')),
    manifiesto,
  )
}

for (const url of URLS) {
  const porModo = {}
  for (const [nombre, metodo] of Object.entries(MODOS)) {
    porModo[nombre] = medianas(Array.from({ length: CORRIDAS }, () => corrida(url, metodo)))
  }
  console.log(`::notice title=lcp ${control} ${url}::${lineaCompacta(porModo)}`)
}
```

- [ ] **Paso 2: `correr.mjs`**

```js
// scripts/medir/correr.mjs
// Entrada única del banco: entorno, seed, control, build, servidor, calentamiento y medición. Uso: node scripts/medir/correr.mjs {control}
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as esperar } from 'node:timers/promises'

import { chromium } from '@playwright/test'

import { envModo, PUERTOS } from '../entorno-e2e.mjs'
import { aplicarControles, letrasDe } from './controles.mjs'
import { URLS } from './urls.mjs'

const control = process.argv[2] ?? 'base'
// CHROME_PATH: el Chromium que instala Playwright, el mismo de las E2E.
const env = { ...process.env, ...envModo('indexable'), SEED_PERMITIDO: 'true', SEED_CONTRASENA_ADMIN: 'contrasena-e2e-larga', CHROME_PATH: chromium.executablePath() }
const puerto = PUERTOS.indexable

const correr = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env })
  if (r.status !== 0) throw new Error(`Falló: ${cmd} ${args.join(' ')}`)
}

correr('npm', ['run', 'seed'])
correr('npx', ['payload', 'run', 'tests/e2e/preparar.ts'])
aplicarControles(letrasDe(control), (r) => readFileSync(r, 'utf8'), (r, t) => writeFileSync(r, t))

// El catálogo falso sigue vivo durante el build y la medición: las páginas se cachean con sus tours, como en producción.
const catalogo = spawn('node', ['scripts/catalogo-falso.mjs'], { stdio: 'ignore', env })
let servidor
try {
  correr('npm', ['run', 'build'])
  servidor = spawn('npm', ['run', 'start', '--', '-p', String(puerto)], { stdio: 'ignore', env, detached: true })
  for (let i = 0; i < 60; i += 1) {
    const ok = await fetch(`http://localhost:${puerto}/es/guia`).then((r) => r.ok, () => false)
    if (ok) break
    if (i === 59) throw new Error('El servidor no arrancó.')
    await esperar(1000)
  }
  // Dos GET por URL: la primera corrida no debe medir un render en frío.
  for (const url of URLS) for (let i = 0; i < 2; i += 1) await fetch(`http://localhost:${puerto}${url}`)
  correr('node', ['scripts/medir/medir.mjs', control, String(puerto)])
} finally {
  catalogo.kill()
  if (servidor) process.kill(-servidor.pid)
}
```

- [ ] **Paso 3: `matriz.json` y workflow**

```json
["base", "base2", "a", "b", "c", "d", "abcd"]
```

```yaml
# .github/workflows/medir.yml
# Banco de medición de LCP (paquete 4). Solo corre en ramas medir/**.
name: medir
on:
  push:
    branches: ['medir/**']
jobs:
  matriz:
    runs-on: ubuntu-latest
    outputs:
      controles: ${{ steps.leer.outputs.controles }}
    steps:
      - uses: actions/checkout@v4
      - id: leer
        run: echo "controles=$(cat scripts/medir/matriz.json | tr -d '\n')" >> "$GITHUB_OUTPUT"
  medir:
    needs: matriz
    runs-on: ubuntu-latest
    timeout-minutes: 60
    strategy:
      fail-fast: false
      matrix:
        control: ${{ fromJSON(needs.matriz.outputs.controles) }}
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
      - run: npx payload migrate
      - run: npx playwright install --with-deps chromium
      - run: node scripts/medir/correr.mjs ${{ matrix.control }}
```

- [ ] **Paso 4: `leer.mjs`**

```js
// scripts/medir/leer.mjs
// Uso: node scripts/medir/leer.mjs {sha}. Lee las anotaciones de la API pública y arma la tabla con el ruido A/A.
const REPO = 'cricriyeah/guia-baja'
const sha = process.argv[2]
const api = async (ruta) => {
  const r = await fetch(`https://api.github.com/repos/${REPO}/${ruta}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'medir-lcp' } })
  if (!r.ok) throw new Error(`GitHub respondió ${r.status} en ${ruta}`)
  return r.json()
}

const { check_runs: corridas } = await api(`commits/${sha}/check-runs?per_page=100`)
const datos = {}
for (const c of corridas) {
  const anotaciones = await api(`check-runs/${c.id}/annotations?per_page=100`)
  for (const a of anotaciones) {
    const m = /^lcp (\S+) (\S+)$/.exec(a.title ?? '')
    if (!m) continue
    ;(datos[m[2]] ??= {})[m[1]] = JSON.parse(a.message)
  }
}

console.log('| URL | control | LCP sim | Δ vs base | TBT sim | LCP real | TBT real | LCP obs | scripts antes | fase mayor | elemento LCP | JS framework / app (KiB) | fuentes (KiB) |')
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for (const [url, porControl] of Object.entries(datos)) {
  const base = porControl.base?.simulado
  for (const [control, modos] of Object.entries(porControl)) {
    const s = modos.simulado
    const real = modos.devtools
    const fase = Object.entries(s.fases).sort((a, b) => b[1] - a[1])[0]?.join('=') ?? ''
    const selector = s.selector.replaceAll('|', '\\|')
    console.log(`| ${url} | ${control} | ${s.lcp} | ${base ? s.lcp - base.lcp : ''} | ${s.tbt} | ${real.lcp} | ${real.tbt} | ${s.lcpObservado} | ${s.scriptsAntes}/${s.scriptsTotal} | ${fase} | \`${selector}\` | ${s.kibFramework} / ${s.kibApp} | ${s.kibFuentes} |`)
  }
}
const ruido = Math.max(0, ...Object.values(datos).map((p) => (p.base && p.base2 ? Math.abs(p.base.simulado.lcp - p.base2.simulado.lcp) : 0)))
console.log(`\nRuido A/A (máxima diferencia base/base2 entre URLs): ${ruido} ms. Un control solo «baja el LCP» si su diferencia pasa de eso.`)
```

- [ ] **Paso 5: comprobar localmente lo que se pueda.** `node --check scripts/medir/medir.mjs`, lo mismo para `correr.mjs` y `leer.mjs`, y `npx vitest run tests/unit/medir.test.ts`. `npm run typecheck` y `npm run lint`.

- [ ] **Paso 6: commit y push a `main`**, con mensaje `chore: banco de medición de LCP en el CI` y la línea `Co-Authored-By`. El workflow no corre en `main`.

### Tarea 4: etapa 1 (medir)

**Archivos:**
- Crear: `docs/rendimiento/lcp-2026-11.md`

- [ ] **Paso 1: correr el banco sobre `main`.**

```bash
git switch -c medir/etapa1 && git push -u origin medir/etapa1 && git switch main
```

Esperar a que termine el workflow `medir`. Se revisa con la API pública: `https://api.github.com/repos/cricriyeah/guia-baja/commits/{sha}/check-runs`. Si un job falla, leer la anotación de error, corregir en `main`, y repetir con un push nuevo a la rama.

- [ ] **Paso 2: calibrar contra c60283d.**

```bash
git worktree add -b medir/c60283d ../medir-c60283d c60283d
git -C ../medir-c60283d checkout main -- scripts/medir .github/workflows/medir.yml
printf '["base","base2"]\n' > ../medir-c60283d/scripts/medir/matriz.json
git -C ../medir-c60283d add scripts/medir .github/workflows/medir.yml
git -C ../medir-c60283d commit -m "chore: banco de medición sobre c60283d

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git -C ../medir-c60283d push -u origin medir/c60283d
git worktree remove ../medir-c60283d
```

(En un worktree aparte: los cambios sin commit de `main` no estorban.)

- [ ] **Paso 3: leer y escribir el documento.** `node scripts/medir/leer.mjs {sha de medir/etapa1}` y lo mismo para `medir/c60283d`. Escribir `docs/rendimiento/lcp-2026-11.md` con:
  - la tabla de `medir/etapa1` y el ruido A/A;
  - la diferencia de `base` contra `medir/c60283d`, que es el costo de presencia;
  - por cada control, si baja el LCP por encima del ruido;
  - las fuentes: las que declara `next/font/local` en `src/app/(sitio)/[lang]/layout.tsx`, sus KiB (columna de la tabla) y, viendo el selector, si el elemento LCP es texto que espera una de ellas;
  - el veredicto, con la fila de la tabla del spec §2.2 que aplica: artefacto del banco, fundido culpable (cuáles), JS o fuentes, retraso de carga del recurso, tiempo de carga del recurso o TTFB.

- [ ] **Paso 4: si presencia pasó del margen** (+100 ms de LCP o +50 ms de TBT, por encima del ruido), **parar y reportar al dueño** antes de seguir.

- [ ] **Paso 5: elegir el camino según el veredicto.**
  - **Artefacto del banco, TTFB, o tiempo de carga con las fotos de prueba:** anotarlo y saltar a la tarea 9. No se cambia el sitio.
  - **Fundido culpable:** seguir con las tareas 5 a 8, solo las culpadas.
  - **JS o fuentes, o retraso de carga del recurso:** **parar**. Este plan no trae el código de esas filas, porque dependen del número que salga aquí. Escribir un plan complementario con las opciones de esa fila del spec §2.2, incluida la E2E de componentes diferidos del spec §5 (cabecera, un `tour_clic` espiado y barra de presencia) si se difiere algo, pasarlo por el crítico y ejecutarlo antes de la tarea 9.

- [ ] **Paso 6: commit y borrar ramas.** Commit de `docs/rendimiento/lcp-2026-11.md` con mensaje `docs: diagnóstico de LCP (etapa 1)` y la línea `Co-Authored-By`, push a `main`, y `git push origin --delete medir/etapa1 medir/c60283d`.

### Tareas 5 a 8: etapa 2 (solo las que la etapa 1 culpe)

Cada tarea se hace solo si el documento de la etapa 1 culpa a ese mecanismo. **Cada una termina igual:**
1. Quitar su control de `CONTROLES` en `scripts/medir/controles.mjs` y su letra de `matriz.json`.
2. Medir: rama `medir/{letra}` desde `main` con el cambio aplicado y `matriz.json` en `["base","base2"]`, comparar con la `base` de la etapa 1 y agregar la fila al documento.
3. Si empeora `/es/guia/la-paz/restaurantes`, `/es/guia/eventos` o CLS, revertir el cambio y anotarlo.
4. Correr `npm run test:unit`, `npm run typecheck` y `E2E_SOLO=indexable npm run test:e2e`.
5. Commit con la medición de antes y después en el mensaje, la línea `Co-Authored-By`, y push a `main`.

**Antes de la primera de estas tareas que se haga,** crear la base de la E2E, en la que las tareas 5, 7 y 8 agregan sus casos:

```ts
// tests/e2e/rendimiento.spec.ts
import { expect, test, type Page } from '@playwright/test'

import { SECRETO_PROXY } from '../../scripts/entorno-e2e.mjs'

const espiar = (page: Page) => page.addInitScript(() => {
  const original = Element.prototype.animate
  ;(window as unknown as { animados: Element[] }).animados = []
  Element.prototype.animate = function (...args: Parameters<Element['animate']>) {
    ;(window as unknown as { animados: Element[] }).animados.push(this)
    return original.apply(this, args)
  }
})

test.describe('@indexable rendimiento: fundidos', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-guia-proxy': SECRETO_PROXY })
    await espiar(page)
  })
})
```

#### Tarea 5: (a) no animar la imagen con prioridad

**Archivos:** Modificar `src/sitio/ui/navegacion/aparecer.ts`, `src/sitio/ui/Efectos.tsx`. Prueba: `tests/unit/aparecer.test.ts`, `tests/e2e/rendimiento.spec.ts`.

- [ ] **Paso 1: prueba que falla**

```ts
// tests/unit/aparecer.test.ts
import { describe, expect, it } from 'vitest'

import { animaFotoAlCargar } from '../../src/sitio/ui/navegacion/aparecer'

describe('animaFotoAlCargar', () => {
  it('una imagen con prioridad alta no se anima', () => expect(animaFotoAlCargar('high')).toBe(false))
  it('las demás sí', () => {
    expect(animaFotoAlCargar(null)).toBe(true)
    expect(animaFotoAlCargar('auto')).toBe(true)
  })
})
```

Agregar al `describe` de `rendimiento.spec.ts`:

```ts
  test('(a) la imagen con prioridad no se anima y una sin prioridad sí', async ({ page }) => {
    // Retiene las imágenes hasta hidratar: así `load` llega con el listener de Efectos puesto.
    let soltar = () => {}
    const hidratado = new Promise<void>((r) => { soltar = r })
    await page.route('**/*.{webp,jpg,jpeg,png,avif}', async (route) => { await hidratado; await route.continue() })
    await page.goto('/es/guia/la-paz', { waitUntil: 'domcontentloaded' })
    // `data-visto` lo pone Efectos: desde ahí su listener de `load` ya está puesto. La clase `js` la pone un script inline.
    await page.waitForSelector('.entra[data-visto]', { state: 'attached' })
    soltar()
    await page.waitForLoadState('load')
    await page.waitForTimeout(500)
    const r = await page.evaluate(() => {
      const anim = (window as unknown as { animados: Element[] }).animados
      const imgs = [...document.querySelectorAll<HTMLImageElement>('img[data-img]')]
      return {
        prioridad: imgs.filter((i) => i.getAttribute('fetchpriority') === 'high').some((i) => anim.includes(i)),
        otras: imgs.filter((i) => i.getAttribute('fetchpriority') !== 'high').some((i) => anim.includes(i)),
      }
    })
    expect(r.prioridad).toBe(false)
    expect(r.otras).toBe(true)
  })
```

- [ ] **Paso 2: correrla y ver que falla.**

- [ ] **Paso 3: implementar.** En `aparecer.ts`:

```ts
// La imagen LCP (fetchpriority="high") no se funde: un fundido desde opacidad 0 retrasaría el LCP (paquete 4).
export const animaFotoAlCargar = (fetchPriority: string | null): boolean => fetchPriority !== 'high'
```

En `Efectos.tsx`, importar `animaFotoAlCargar` y cambiar la línea:

```ts
      if (e.type === 'load' && animaFotoAlCargar(e.target.getAttribute('fetchpriority'))) aparecer(e.target)
```

- [ ] **Paso 4: correrla y ver que pasa, y cerrar** con los 5 puntos de arriba.

#### Tarea 6: (b) `#contenido` sin animación en la carga directa

**Archivos:** Modificar `src/sitio/estilos/base.css`. Prueba: `tests/unit/estilos.test.ts`.

- [ ] **Paso 1: prueba que falla.** En `tests/unit/estilos.test.ts`:

```ts
it('#contenido no se anima en la carga directa', () => {
  const css = readFileSync('src/sitio/estilos/base.css', 'utf8')
  const regla = css.split('\n').find((l) => l.includes('animation: aparecer 180ms'))!
  expect(regla).not.toContain('#contenido')
})
```

- [ ] **Paso 2: correrla y ver que falla.**

- [ ] **Paso 3: implementar.** Quitar `#contenido, ` del selector con `animation: aparecer 180ms ease-out` y del selector equivalente dentro de `prefers-reduced-motion`. La navegación la sigue animando `NavegacionConEsqueleto` con `aparecer()`.

- [ ] **Paso 4: correrla y cerrar** con los 5 puntos.

#### Tarea 7: (c) tarjetas de arriba sin `.entra`

**Archivos:** Modificar `src/sitio/ui/tarjetas/TarjetaLugar.tsx`, `src/sitio/paginas/CategoriaEnZona.tsx`. Prueba: `tests/e2e/rendimiento.spec.ts`.

- [ ] **Paso 1: prueba que falla.** Agregar al `describe` de `rendimiento.spec.ts`:

```ts
  test('(c) las 2 primeras tarjetas del listado no llevan .entra', async ({ page }) => {
    await page.goto('/es/guia/la-paz/restaurantes')
    const clases = await page.locator('.lista .nota.tarjeta').evaluateAll((els) => els.slice(0, 3).map((e) => e.classList.contains('entra')))
    expect(clases[0]).toBe(false)
    expect(clases[1]).toBe(false)
  })
```

- [ ] **Paso 2: correrla y ver que falla.**

- [ ] **Paso 3: implementar.** En `TarjetaLugar.tsx`, agregar a las props `entrada = true` y cambiar la clase a ``className={`nota tarjeta presionable${entrada ? ' entra' : ''} ${categoria?.claseGrupo ?? ''}`}``. En `CategoriaEnZona.tsx`, donde se pintan las tarjetas, pasar `entrada={i >= 2}` en el `map` del primer listado. Otros portadores (`TarjetaArticulo`, `.zona-tarjeta`) solo cambian si la etapa 1 los nombra.

- [ ] **Paso 4: correrla y cerrar** con los 5 puntos.

#### Tarea 8: (d) resultados sin animación en la carga directa

**Archivos:** Modificar `src/sitio/estilos/base.css`, `src/sitio/ui/TransicionFiltros.tsx`. Prueba: `tests/unit/estilos.test.ts`, `tests/e2e/rendimiento.spec.ts`.

- [ ] **Paso 1: pruebas que fallan.** En `tests/unit/estilos.test.ts`:

```ts
it('.resultados-entran no se anima por CSS', () => {
  const css = readFileSync('src/sitio/estilos/base.css', 'utf8')
  expect(css.split('\n').find((l) => l.includes('animation: aparecer 180ms'))).not.toContain('.resultados-entran')
})
```

En `rendimiento.spec.ts`:

```ts
  test('(d) la carga directa no anima los resultados; al filtrar sí', async ({ page }) => {
    const animadosDeResultados = () => page.evaluate(() => (window as unknown as { animados: Element[] }).animados.filter((e) => e.parentElement?.classList.contains('resultados-entran')).length)
    await page.goto('/es/guia/la-paz/restaurantes')
    await page.waitForLoadState('networkidle')
    expect(await animadosDeResultados()).toBe(0)
    await page.locator('.herramientas a.chip', { hasText: 'Para niños' }).click()
    await page.waitForURL(/caracteristica=para-ninos/)
    await expect.poll(animadosDeResultados).toBeGreaterThan(0)
    const antes = await animadosDeResultados()
    await page.locator('.herramientas a.chip', { hasText: 'Con comida' }).click()
    await page.waitForURL(/caracteristica=con-comida/)
    await expect.poll(animadosDeResultados).toBeGreaterThan(antes)
  })
```

No se agregan datos al seed para esta prueba: cambiaría lo que mide el banco.

- [ ] **Paso 2: correrlas y ver que fallan.**

- [ ] **Paso 3: implementar.** En `base.css`, quitar `.resultados-entran > *, ` del selector y de su equivalente en `prefers-reduced-motion`.

`TransicionFiltros.tsx`:

```tsx
'use client'

import { useLayoutEffect, useRef, type MouseEvent, type ReactNode } from 'react'

import { aparecer } from './navegacion/aparecer'
import { esCambioDeConsulta, linkDeClic } from './navegacion/destino'
import { useNavegacion } from './navegacion/useNavegacion'

// De la base a --filtros o --pagina el componente se vuelve a montar; de --filtros a --filtros sigue la misma instancia.
// El flag vive en el módulo para sobrevivir al remontaje y se consume cuando ya no se está navegando.
let filtroEnCurso = false

export function TransicionFiltros({ controles, esqueleto, children }: { controles: ReactNode; esqueleto: ReactNode; children: ReactNode }) {
  const { cargando, navegando, ir } = useNavegacion()
  const resultados = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (navegando || !filtroEnCurso) return
    filtroEnCurso = false
    Array.from(resultados.current?.children ?? []).forEach(aparecer)
  }, [navegando])

  const alHacerClic = (e: MouseEvent<HTMLDivElement>) => {
    const link = linkDeClic(e)
    if (!link || !esCambioDeConsulta(link.href, window.location.href)) return
    e.preventDefault()
    filtroEnCurso = true
    ir(link.getAttribute('href') ?? link.href)
  }

  return (
    <div className="contenidos" onClickCapture={alHacerClic} aria-busy={cargando}>
      {controles}
      {cargando && <div className="contenidos" aria-hidden="true">{esqueleto}</div>}
      <div ref={resultados} className="contenidos resultados-entran" hidden={cargando}>{children}</div>
    </div>
  )
}
```

- [ ] **Paso 4: correrlas y cerrar** con los 5 puntos.

### Tarea 9: cierre

**Archivos:** Modificar `docs/rendimiento/lcp-2026-11.md`, y `docs/specs/2026-10-30-guia-baja-design.md` si cambió algo de §9.

- [ ] **Paso 1:** correr el CI normal sobre `main`, con `npm run lighthouse` en el job `e2e`. Anotar el resultado de las 4 URLs.
- [ ] **Paso 2: si la barrera queda en verde** (LCP < 2500, TBT < 200, CLS < 0.1 en las 4 URLs): anotar el commit como la nueva línea base de los paquetes siguientes.
- [ ] **Paso 3: si no,** completar el documento con lo medido, lo probado y lo que falta, y **presentar al dueño las 3 opciones del spec §2.3, sin elegir por él**.
- [ ] **Paso 4: si queda ruido en las ramas,** `git push origin --delete` de cualquier `medir/*`.
- [ ] **Paso 5: commit y push,** con mensaje `docs: resultado del paquete de LCP` y la línea `Co-Authored-By`.
