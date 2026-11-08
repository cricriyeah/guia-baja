# Paquete 3: «¿Qué tour es para mí?» y mapa con tours. Plan de implementación

> **Para agentes:** sub-skill requerida: usar superpowers:subagent-driven-development (recomendada) o
> superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** un quiz de 3 preguntas que recomienda 2 tours, un mapa que muestra qué lugares tienen tour y la
actualización de `maplibre-gl` a 6.4.1.

**Arquitectura:**
- **Quiz:** el servidor pinta el formulario y las tarjetas ocultas. Un módulo pequeño, cargado al primer toque, puntúa
  con una función pura compartida.
- **Mapa:** recibe los tours ya armados en cada punto. El worker de MapLibre se sirve copiado, con versión en la ruta.
- **Orden:** este plan se ejecuta después de los planes 1 y 2.

**Stack:** Next.js 16.4.3, Payload 3.92.1, maplibre-gl 6.4.1, Vitest, Playwright.

**Spec:** `docs/specs/2026-11-07-paquete-3-quiz-y-mapa-design.md` (aprobado).

## Restricciones globales

- **Las del plan 1**, en `docs/superpowers/plans/2026-11-07-paquete-1-fichas-y-articulos.md`.
- **`maplibre-gl` exacta: 6.4.1.** Importa con exports con nombre. `setWorkerUrl` apunta a
  `/guia-assets/maplibre/${m.getVersion()}/maplibre-gl-worker.mjs`: `getVersion()` viene en la librería, así la ruta
  siempre coincide con el paquete cargado y no hace falta generar un módulo (precisa la opción que dejaba abierta el
  spec §2.4).
- **El worker se copia desde los dos caminos de build:** `scripts/build-vercel.mjs` y `prebuild`/`predev`. Se copian
  el worker y `maplibre-gl-shared.mjs`, y el build falla si faltan.
- **El quiz no agrega JavaScript inicial** salvo su activador. El módulo pesa menos de 3 KiB comprimido.
- **El botón «Ver mis tours» no lleva `data-evento`.**
- **Los popups** se arman con nodos DOM y `esEnlaceSeguro`, nunca con HTML.

---

## Mapa de archivos

### Reglas puras (`src/dominio/`)

| Archivo | Qué hace |
|---|---|
| `src/dominio/perfil-tour.ts` (nuevo) | Listas cerradas `PARA_QUIEN`, `GUSTOS` y `JORNADAS` (es/en). `jornadaDe(tipo, jornada)`. `puntuarTours(tours, respuestas, mesActual)`: gusto obligatorio, +1 por «para quién», +1 por jornada y +1 por temporada; devuelve hasta 2 o `null` para el respaldo. Sin imports de `sitio/`, para que el módulo cliente la use. |
| `src/dominio/temporada.ts` (modificar) | `registroTourConDatos` suma el perfil: `gustos`, `paraQuien` o `jornada` cuentan en cualquier idioma, porque no están localizados. |
| `src/dominio/enlaces.ts` (nuevo) | `esEnlaceSeguro`, sacado de `CuerpoRico`. |
| `src/dominio/mapa.ts` (nuevo) | `clasificarErrorMapa(evento, estiloCargado)` → `'duro' \| 'leve'`. |

### Esquema

| Archivo | Cambio |
|---|---|
| `src/collections/FotosTours.ts` | `paraQuien`, `gustos` y `jornada`. La regla de registro vacío se amplía en `dominio/temporada.ts`. |
| `src/migrations/*`, `payload-types.ts` | Regenerados. |

### Datos y UI

| Archivo | Qué hace |
|---|---|
| `src/sitio/datos/lecturas/catalogo.ts`, `cacheadas.ts` | `FotoTour` y `TourConFoto` suman el perfil. |
| `src/sitio/datos/mapa-tours.ts` (nuevo) | `puntosConTours(lugares, tours, atribucion, ...)`: arma los puntos con `tours` (máximo 2, nombre, precio en texto, `href`). |
| `src/sitio/ui/quiz/QuizTours.tsx` (nuevo, async) | Formulario y tarjetas ocultas: perfiles (máximo 12) más los 2 de respaldo. Sin 3 tours con perfil no pinta nada. |
| `src/sitio/ui/quiz/ActivadorQuiz.tsx` (nuevo, cliente) | Carga el módulo al primer toque. Intercepta «Ver mis tours» y espera hasta 3 s; si falla, sigue el link y llama a `track('tour_clic', …)`. |
| `src/sitio/ui/quiz/activarQuiz.ts` (nuevo) | El módulo diferido: lee `data-*`, llama a `puntuarTours`, muestra el resultado, maneja `aria-live` y el foco, y llama a `track('quiz_resultado', …)`. |
| `src/sitio/ui/Mapa.tsx` (modificar) | Exports con nombre, `setWorkerUrl`, marcador con insignia, popup con tours, `data-mapa-listo`, leyenda, `clasificarErrorMapa`, aviso a los 10 s. |
| `src/sitio/paginas/CategoriaEnZona.tsx`, `temas/[slug]/page.tsx` | Puntos con tours. El tema con zona suma mapa. |
| `[zona]/page.tsx`, `temas/[slug]/page.tsx` | Agregan `<QuizTours>`. |
| `src/sitio/ui/CuerpoRico.tsx` | Importa `esEnlaceSeguro` de `dominio/enlaces`. |
| `src/sitio/analitica/track.ts`, `adaptador.ts` | `quiz_resultado`, y el `CustomEvent('guia:evento')` en `enviarEvento`. |
| `src/sitio/textos.ts`, `src/sitio/estilos/*.css` | Textos y estilos del quiz, la insignia y la leyenda. |

### Build, seed, pruebas y documentación

| Archivo | Cambio |
|---|---|
| `package.json` | `maplibre-gl` 6.4.1; `prebuild` y `predev` llaman al script de copia. |
| `scripts/copiar-worker-maplibre.mjs` (nuevo) | Copia los dos archivos a `public/guia-assets/maplibre/{version}/`, con la versión de `node_modules/maplibre-gl/package.json`, y falla si faltan. |
| `scripts/build-vercel.mjs` | Llama al script antes de `next build`. |
| `.gitignore`, `eslint.config.*` | `public/guia-assets/maplibre/`: fuera de git y fuera de ESLint. |
| `scripts/catalogo-falso.mjs`, `tests/e2e/preparar.ts` | «Kayak de prueba» y los 3 perfiles (actualiza el de Ballenas buscando por sede, tipo y slug). |
| `playwright.config.ts` | Proyecto con `--use-angle=swiftshader` y `--enable-unsafe-swiftshader` para las pruebas de mapa. |
| `tests/e2e/fixtures/estilo-mapa.json` (nuevo) | Fondo, GeoJSON con círculo y una fuente de teselas local. |
| `tests/unit/perfil-tour.test.ts`, `enlaces.test.ts`, `mapa.test.ts`, `mapa-tours.test.ts` (nuevos); `temporada.test.ts` (modificar) | Lo de §5 del spec, y un registro con solo perfil aceptado en los dos idiomas. |
| `tests/unit/copiar-worker.test.ts` (nuevo) | Que el script falla si falta un archivo. |
| `tests/e2e/quiz.spec.ts`, `mapa.spec.ts` (nuevos) | Quiz, teclado, módulo bloqueado y retrasado, gusto sin tours; el módulo **no** se pide antes de la primera interacción y pesa menos de 3 KiB comprimido; la zona da `x-nextjs-cache: HIT`. Mapa, worker bloqueado, estilo retrasado, tesela abortada y popup con tour. |
| `docs/specs/2026-10-30-guia-baja-design.md`, `docs/editores/escribir-para-buscadores.md` | Sección 13 y perfil de los tours. |

### Dependencias

- `dominio/perfil-tour.ts` y `dominio/mapa.ts` no importan nada de `sitio/`.
- `activarQuiz.ts` importa de `dominio/` y de `sitio/analitica/track`. No importa `cacheadas`, para no meter Payload
  al cliente.
- `Mapa.tsx` recibe los datos ya armados, sin leer tours.

<!-- arch-critic: APPROVED -->
<!-- plan-critic: APPROVED -->

---

## Tareas

Antes de la tarea 1: los planes 1 y 2 ya están aplicados. Cada tarea termina con `npm run typecheck` en verde y su
commit lleva la línea `Co-Authored-By`.

### Tarea 1: perfil de los tours (reglas puras)

**Archivos:**
- Crear: `src/dominio/perfil-tour.ts`
- Modificar: `src/dominio/temporada.ts`
- Prueba: `tests/unit/perfil-tour.test.ts`, `tests/unit/temporada.test.ts`

**Interfaces:**
- Consume: `enTemporada(meses, mes)` y `registroTourConDatos(datos, locale)` del plan 1.
- Produce: `PARA_QUIEN`, `GUSTOS`, `JORNADAS`; `jornadaDe(tipo, jornada): string | null`;
  `puntuarTours<T extends TourPuntuable>(tours, respuestas, mes): T[] | null`;
  `toursDelQuiz<T>(tours): { tarjetas: T[]; respaldo: string[] } | null`;
  `etiquetasQuiz(lang): Etiquetas`; `razonTour(tour, respuestas, mes, etiquetas): string`.

- [ ] **Paso 1: escribir la prueba que falla**

```ts
// tests/unit/perfil-tour.test.ts
import { describe, expect, it } from 'vitest'

import { etiquetasQuiz, jornadaDe, puntuarTours, razonTour, toursDelQuiz } from '../../src/dominio/perfil-tour'

const tour = (clave: string, extra: Partial<{ gustos: string[]; paraQuien: string[]; jornada: string | null; meses: number[] }> = {}) => ({
  clave, gustos: ['mar-y-animales'], paraQuien: [] as string[], jornada: null as string | null, meses: [] as number[], ...extra,
})

describe('jornadaDe', () => {
  it('respeta la jornada escrita', () => expect(jornadaDe('servicio', 'medio-dia')).toBe('medio-dia'))
  it('un paquete sin jornada cuenta como varios días', () => expect(jornadaDe('paquete', null)).toBe('varios-dias'))
  it('un servicio sin jornada no tiene', () => expect(jornadaDe('servicio', undefined)).toBeNull())
})

describe('puntuarTours', () => {
  it('el gusto es obligatorio: nunca gana un tour de otro gusto', () => {
    const otro = tour('otro', { gustos: ['aventura'], paraQuien: ['familia'], jornada: 'medio-dia', meses: [3] })
    const bueno = tour('bueno')
    expect(puntuarTours([otro, bueno], { gusto: 'mar-y-animales', paraQuien: 'familia', jornada: 'medio-dia' }, 3)).toEqual([bueno])
  })
  it('suma un punto por para quién, por jornada y por temporada', () => {
    const uno = tour('uno', { paraQuien: ['familia'] })
    const tres = tour('tres', { paraQuien: ['familia'], jornada: 'medio-dia', meses: [3] })
    const cero = tour('cero')
    expect(puntuarTours([cero, uno, tres], { gusto: 'mar-y-animales', paraQuien: 'familia', jornada: 'medio-dia' }, 3)?.map((t) => t.clave)).toEqual(['tres', 'uno'])
  })
  it('un empate lo gana el primero del orden recibido', () => {
    expect(puntuarTours([tour('a'), tour('b'), tour('c')], { gusto: 'mar-y-animales' }, 3)?.map((t) => t.clave)).toEqual(['a', 'b'])
  })
  it('la temporada puntúa aunque solo se conteste el gusto', () => {
    expect(puntuarTours([tour('fuera'), tour('dentro', { meses: [3] })], { gusto: 'mar-y-animales' }, 3)?.[0].clave).toBe('dentro')
  })
  it('un tour sin perfil no participa', () => {
    expect(puntuarTours([tour('x', { gustos: [] })], { gusto: 'mar-y-animales' }, 3)).toBeNull()
  })
  it('sin coincidencias devuelve null para usar el respaldo', () => {
    expect(puntuarTours([tour('x')], { gusto: 'cultura-y-comida' }, 3)).toBeNull()
  })
})

describe('toursDelQuiz', () => {
  it('con menos de 3 tours con perfil no hay quiz', () => {
    expect(toursDelQuiz([tour('a'), tour('b'), tour('c', { gustos: [] })])).toBeNull()
  })
  it('junta perfiles y respaldo sin repetir y en el orden de la sede', () => {
    const lista = [tour('s1', { gustos: [] }), tour('p1'), tour('p2'), tour('p3')]
    const r = toursDelQuiz(lista)!
    expect(r.tarjetas.map((t) => t.clave)).toEqual(['s1', 'p1', 'p2', 'p3'])
    expect(r.respaldo).toEqual(['s1', 'p1'])
  })
  it('a lo más 12 con perfil', () => {
    const r = toursDelQuiz(Array.from({ length: 15 }, (_, i) => tour(`t${i}`)))!
    expect(r.tarjetas).toHaveLength(12)
  })
})

describe('razonTour', () => {
  const e = etiquetasQuiz('es')
  it('nombra solo lo que coincide', () => {
    const t = tour('a', { paraQuien: ['familia'], meses: [3] })
    expect(razonTour(t, { gusto: 'mar-y-animales', paraQuien: 'familia', jornada: 'medio-dia' }, 3, e)).toBe('Para familias · mar y animales · en temporada')
  })
  it('empieza con mayúscula si solo coincide el gusto', () => {
    expect(razonTour(tour('a'), { gusto: 'mar-y-animales' }, 3, e)).toBe('Mar y animales')
  })
})
```

En `tests/unit/temporada.test.ts`, dentro de `describe('registroTourConDatos')`:

```ts
  it('un registro con solo perfil se acepta en los dos idiomas', () => {
    for (const datos of [{ gustos: ['aventura'] }, { paraQuien: ['familia'] }, { jornada: 'medio-dia' }]) {
      expect(registroTourConDatos(datos, 'es')).toBe(true)
      expect(registroTourConDatos(datos, 'en')).toBe(true)
    }
  })
  it('un perfil vacío no cuenta', () => {
    expect(registroTourConDatos({ gustos: [], paraQuien: [], jornada: null }, 'es')).toBe(false)
  })
```

- [ ] **Paso 2: correrlas y ver que fallan.** `npx vitest run --project unit tests/unit/perfil-tour.test.ts tests/unit/temporada.test.ts`. Esperado: FAIL (no existe `perfil-tour`).

- [ ] **Paso 3: implementar**

```ts
// src/dominio/perfil-tour.ts
import type { Locale } from './idioma'
import { enTemporada } from './temporada'

// Perfil de los tours para «¿Qué tour es para mí?» (spec del paquete 3 §2.1). Listas cerradas en código, como
// CARACTERISTICAS. Este módulo lo usa el módulo cliente del quiz: nada de imports de `sitio/`.
export const PARA_QUIEN = [
  { valor: 'pareja', es: 'En pareja', en: 'As a couple', motivoEs: 'Para parejas', motivoEn: 'For couples' },
  { valor: 'familia', es: 'En familia con niños', en: 'Family with kids', motivoEs: 'Para familias', motivoEn: 'For families' },
  { valor: 'amigos', es: 'Con amigos', en: 'With friends', motivoEs: 'Para amigos', motivoEn: 'For friends' },
  { valor: 'solo', es: 'Solo', en: 'On my own', motivoEs: 'Para ir solo', motivoEn: 'For solo travelers' },
] as const

export const GUSTOS = [
  { valor: 'mar-y-animales', es: 'Mar y animales', en: 'Sea and wildlife' },
  { valor: 'aventura', es: 'Aventura', en: 'Adventure' },
  { valor: 'playa-y-descanso', es: 'Playa y descanso', en: 'Beach and rest' },
  { valor: 'cultura-y-comida', es: 'Cultura y comida', en: 'Culture and food' },
] as const

export const JORNADAS = [
  { valor: 'medio-dia', es: 'Medio día', en: 'Half a day' },
  { valor: 'dia-completo', es: 'Un día completo', en: 'A full day' },
  { valor: 'varios-dias', es: 'Varios días', en: 'Several days' },
] as const

export const jornadaDe = (tipo: 'servicio' | 'paquete', jornada: string | null | undefined): string | null =>
  jornada ?? (tipo === 'paquete' ? 'varios-dias' : null)

export type Respuestas = { gusto: string; paraQuien?: string | null; jornada?: string | null }
export type TourPuntuable = { clave: string; gustos: readonly string[]; paraQuien: readonly string[]; jornada: string | null; meses: readonly number[] }
export type Etiquetas = { paraQuien: Record<string, string>; gustos: Record<string, string>; jornadas: Record<string, string>; temporada: string }

const coincidePara = (t: TourPuntuable, r: Respuestas) => Boolean(r.paraQuien) && t.paraQuien.includes(r.paraQuien as string)
const coincideJornada = (t: TourPuntuable, r: Respuestas) => Boolean(r.jornada) && t.jornada === r.jornada

// Hasta 2 tours del gusto elegido. `sort` es estable: un empate conserva el orden de toursDeSede. null: usar el respaldo.
export function puntuarTours<T extends TourPuntuable>(tours: readonly T[], r: Respuestas, mes: number): T[] | null {
  const puntos = (t: T) => Number(coincidePara(t, r)) + Number(coincideJornada(t, r)) + Number(enTemporada(t.meses, mes))
  const ganadores = tours.filter((t) => t.gustos.includes(r.gusto)).sort((a, b) => puntos(b) - puntos(a)).slice(0, 2)
  return ganadores.length ? ganadores : null
}

// Las tarjetas que el servidor deja ocultas: los primeros 12 con perfil más los 2 primeros de la sede (spec §2.2).
export function toursDelQuiz<T extends { clave: string; gustos: readonly string[] }>(tours: readonly T[]): { tarjetas: T[]; respaldo: string[] } | null {
  const conPerfil = tours.filter((t) => t.gustos.length > 0)
  if (conPerfil.length < 3) return null
  const respaldo = tours.slice(0, 2).map((t) => t.clave)
  const incluidos = new Set([...conPerfil.slice(0, 12).map((t) => t.clave), ...respaldo])
  return { tarjetas: tours.filter((t) => incluidos.has(t.clave)), respaldo }
}

export function etiquetasQuiz(lang: Locale): Etiquetas {
  const es = lang === 'es'
  const minusculas = (lista: readonly { valor: string; es: string; en: string }[]) =>
    Object.fromEntries(lista.map((o) => [o.valor, (es ? o.es : o.en).toLowerCase()]))
  return {
    paraQuien: Object.fromEntries(PARA_QUIEN.map((o) => [o.valor, es ? o.motivoEs : o.motivoEn])),
    gustos: minusculas(GUSTOS),
    jornadas: minusculas(JORNADAS),
    temporada: es ? 'en temporada' : 'in season',
  }
}

// La línea de por qué salió el tour. Solo nombra lo que de verdad coincide.
export function razonTour(t: TourPuntuable, r: Respuestas, mes: number, e: Etiquetas): string {
  const partes = [
    coincidePara(t, r) ? e.paraQuien[r.paraQuien as string] : null,
    e.gustos[r.gusto],
    coincideJornada(t, r) ? e.jornadas[r.jornada as string] : null,
    enTemporada(t.meses, mes) ? e.temporada : null,
  ].filter(Boolean).join(' · ')
  return partes.charAt(0).toUpperCase() + partes.slice(1)
}
```

En `src/dominio/temporada.ts`, reemplazar `DatosRegistro` y `registroTourConDatos`:

```ts
type DatosRegistro = {
  foto?: unknown; meses?: unknown[] | null; temporada?: string | null
  gustos?: unknown[] | null; paraQuien?: unknown[] | null; jornada?: string | null
}

// Un registro de «Fotos y temporadas de tours» tiene que aportar algo. Solo se rechaza al guardar en español: `temporada`
// está localizada y en inglés no se ve el valor en español. El perfil no está localizado y cuenta en cualquier idioma.
// Se evalúa sobre { ...originalDoc, ...data }.
export function registroTourConDatos(datos: DatosRegistro, locale: string | undefined): boolean {
  if (locale !== 'es') return true
  return Boolean(datos.foto) || (datos.meses?.length ?? 0) > 0 || Boolean(datos.temporada?.trim())
    || (datos.gustos?.length ?? 0) > 0 || (datos.paraQuien?.length ?? 0) > 0 || Boolean(datos.jornada)
}
```

- [ ] **Paso 4: correrlas y ver que pasan.** Mismo comando. Esperado: PASS.

- [ ] **Paso 5: commit** con mensaje `feat: reglas del perfil de tours y puntuación del quiz`.

### Tarea 2: campos del perfil y datos públicos

**Archivos:**
- Modificar: `src/collections/FotosTours.ts`, `src/migrations/*`, `src/payload-types.ts`, `src/sitio/datos/lecturas/catalogo.ts`, `src/sitio/datos/cacheadas.ts`
- Prueba: la prueba de integración de `fotos-tours` que dejó la tarea 5 del plan 1

**Interfaces:**
- Consume: `PARA_QUIEN`, `GUSTOS`, `JORNADAS`, `jornadaDe` (tarea 1).
- Produce: `FotoTour.paraQuien: string[]`, `.gustos: string[]`, `.jornada: string | null`; `TourConFoto` con esos tres campos.

- [ ] **Paso 1: escribir la prueba que falla.** Junto a la prueba `fotos-tours: registro vacío rechazado…` del plan 1, con su mismo `claves`:

```ts
  it('fotos-tours: un registro con solo perfil se guarda y un gusto fuera de la lista no', async () => {
    const claves = { sedeSlug: 'la-paz', tipo: 'servicio' as const, slug: 'solo-perfil' }
    const doc = await payload.create({ collection: 'fotos-tours', locale: 'es', data: { ...claves, gustos: ['aventura'], paraQuien: ['amigos'], jornada: 'dia-completo' }, overrideAccess: true })
    expect(doc.gustos).toEqual(['aventura'])
    await expect(payload.create({ collection: 'fotos-tours', locale: 'es', data: { ...claves, slug: 'gusto-malo', gustos: ['inventado'] } as never, overrideAccess: true })).rejects.toThrow()
  })
```

- [ ] **Paso 2: correrla y ver que falla.** `npm run test:int`. Esperado: FAIL (los campos no existen).

- [ ] **Paso 3: agregar los campos.** En `src/collections/FotosTours.ts`, importar las listas y agregar después de `temporada`:

```ts
import { GUSTOS, JORNADAS, PARA_QUIEN } from '../dominio/perfil-tour'
```

```ts
    {
      name: 'paraQuien', type: 'select', hasMany: true, label: 'Para quién',
      options: PARA_QUIEN.map((o) => ({ label: o.es, value: o.valor })),
      admin: { description: 'Opcional. Ajusta el resultado de «¿Qué tour es para mí?».' },
    },
    {
      name: 'gustos', type: 'select', hasMany: true, label: 'Gustos',
      options: GUSTOS.map((o) => ({ label: o.es, value: o.valor })),
      admin: { description: 'Sin al menos un gusto, el tour no entra en el quiz.' },
    },
    {
      name: 'jornada', type: 'select', label: 'Jornada',
      options: JORNADAS.map((o) => ({ label: o.es, value: o.valor })),
      admin: { description: 'Opcional. Un paquete sin jornada cuenta como varios días.' },
    },
```

- [ ] **Paso 4: regenerar.** `npm run generate:types`, `npm run generate:importmap`, `npm run migracion:regenerar -- --no-hay-deploy` (si ya hubo deploy a producción: `npm run payload migrate:create paquete-3`).

- [ ] **Paso 5: datos públicos.** En `src/sitio/datos/lecturas/catalogo.ts`, sumar a `FotoTour` `paraQuien: string[]; gustos: string[]; jornada: string | null` y, en el objeto que arma `fotosDeTours`:

```ts
    paraQuien: d.paraQuien ?? [], gustos: d.gustos ?? [], jornada: d.jornada ?? null,
```

En `src/sitio/datos/cacheadas.ts`, importar `jornadaDe` de `../../dominio/perfil-tour`, sumar `'paraQuien' | 'gustos' | 'jornada'` al `Pick` de `TourConFoto` y, en el `map` de `toursDeSede`:

```ts
      return {
        ...t, foto: f?.foto ?? null, meses, temporada: f?.temporada ?? mesesATexto(meses, lang), enTemporada: enTemporada(meses, mes),
        paraQuien: f?.paraQuien ?? [], gustos: f?.gustos ?? [], jornada: jornadaDe(t.tipo, f?.jornada),
      }
```

- [ ] **Paso 6: fixtures.** `npm run typecheck`. Por cada error en `tests/` de un objeto `TourConFoto` o `FotoTour`, agregar `paraQuien: [], gustos: [], jornada: null`.

- [ ] **Paso 7: correr.** `npm run test:unit` y `npm run test:int`. Esperado: PASS.

- [ ] **Paso 8: commit** con mensaje `feat: perfil de los tours en Fotos y temporadas`.

### Tarea 3: medición del quiz

**Archivos:**
- Modificar: `src/sitio/analitica/track.ts`, `src/sitio/analitica/adaptador.ts`
- Prueba: `tests/unit/track.test.ts`, `tests/unit/adaptador.test.ts` (nuevo)

**Interfaces:**
- Produce: evento `quiz_resultado` (`zona`, `gusto`); `CustomEvent('guia:evento', { detail: { evento, props } })`.

- [ ] **Paso 1: escribir las pruebas que fallan.** En `tests/unit/track.test.ts`, dentro del `describe` principal:

```ts
  it('quiz_resultado lleva zona y gusto', () => {
    expect(track('quiz_resultado', { zona: 'la-paz', gusto: 'aventura', extra: 'x' })).toBe(true)
    expect(enviarEvento).toHaveBeenCalledWith('quiz_resultado', { zona: 'la-paz', gusto: 'aventura' })
  })
```

```ts
// tests/unit/adaptador.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'

import { enviarEvento } from '../../src/sitio/analitica/adaptador'

describe('enviarEvento', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('emite guia:evento en la página', () => {
    const ventana = new EventTarget()
    vi.stubGlobal('window', ventana)
    const recibido: unknown[] = []
    ventana.addEventListener('guia:evento', (e) => recibido.push((e as CustomEvent).detail))
    enviarEvento('quiz_resultado', { zona: 'la-paz', gusto: 'aventura' })
    expect(recibido).toEqual([{ evento: 'quiz_resultado', props: { zona: 'la-paz', gusto: 'aventura' } }])
  })

  it('en el servidor no hace nada', () => {
    expect(() => enviarEvento('tour_clic', {})).not.toThrow()
  })
})
```

- [ ] **Paso 2: correrlas y ver que fallan.** `npx vitest run --project unit tests/unit/track.test.ts tests/unit/adaptador.test.ts`.

- [ ] **Paso 3: implementar.** En `EVENTOS` de `track.ts`:

```ts
  quiz_resultado: ['zona', 'gusto'],
```

Reemplazar la función de `adaptador.ts`:

```ts
// El evento local no sale de la página ni lleva datos personales: las E2E lo escuchan para comprobar qué se mide.
export function enviarEvento(evento: string, props: Record<string, string>): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('guia:evento', { detail: { evento, props } }))
}
```

- [ ] **Paso 4: correrlas y ver que pasan.** Mismo comando. Esperado: PASS.

- [ ] **Paso 5: commit** con mensaje `feat: evento quiz_resultado y aviso local de eventos`.

### Tarea 4: el quiz en la zona y en el tema

**Archivos:**
- Crear: `src/sitio/ui/quiz/QuizTours.tsx`, `src/sitio/ui/quiz/ActivadorQuiz.tsx`, `src/sitio/ui/quiz/activarQuiz.ts`
- Modificar: `src/sitio/ui/EnlaceWhatsapp.tsx`, `src/sitio/textos.ts`, `src/sitio/estilos/presencia.css`, `src/app/(sitio)/[lang]/guia/[zona]/page.tsx`, `src/app/(sitio)/[lang]/guia/temas/[slug]/page.tsx`, `scripts/catalogo-falso.mjs`, `tests/e2e/preparar.ts`
- Prueba: `tests/e2e/quiz.spec.ts`

**Interfaces:**
- Consume: `toursDelQuiz`, `puntuarTours`, `razonTour`, `etiquetasQuiz` (tarea 1); `toursDeSede` con perfil (tarea 2); `TarjetaTour`, `EnlaceWhatsapp`, `whatsappTours` (plan 1).
- Produce: `QuizTours({ lang, zona })`; `activarQuiz(raiz): Quiz`, con `Quiz = { ver(): void; limpiar(): void }`.

- [ ] **Paso 1: datos de prueba.** En `scripts/catalogo-falso.mjs`, agregar después de «Ballenas de prueba». Cuesta más que Ballenas para que la barra siga diciendo «desde $1,500»:

```js
  {
    // Tercer tour con perfil del quiz (spec del paquete 3 §3).
    id: 4, empresa_slug: 'empresa-prueba', nombre: 'Kayak de prueba', nombre_en: 'Test kayak', slug: 'kayak-prueba',
    estrategia_precio: 'por_persona', precio_base: '2000.00', tipo_cambio_usd: '17.5000', activo: true, duracion: '3 h', duracion_en: '3 hrs',
  },
```

En `tests/e2e/preparar.ts`, antes del `payload.delete` de solicitudes:

```ts
// Spec del paquete 3 §3: 3 tours de La Paz con perfil. Ballenas ya tiene registro del seed; los otros se crean sin foto.
const PERFILES = [
  { slug: 'ballenas-prueba', gustos: ['mar-y-animales'], paraQuien: ['familia'], jornada: 'medio-dia' },
  { slug: 'pesca-prueba', gustos: ['aventura'], paraQuien: ['amigos'], jornada: 'dia-completo' },
  { slug: 'kayak-prueba', gustos: ['playa-y-descanso'], paraQuien: ['pareja'], jornada: 'medio-dia' },
]
for (const { slug, ...perfil } of PERFILES) {
  const claves = { sedeSlug: 'la-paz', tipo: 'servicio' as const, slug }
  const opciones = { overrideAccess: true, locale: 'es' as const, context: { disableRevalidate: true } }
  const previo = await payload.find({
    collection: 'fotos-tours', overrideAccess: true, limit: 1,
    where: { and: [{ sedeSlug: { equals: claves.sedeSlug } }, { tipo: { equals: claves.tipo } }, { slug: { equals: slug } }] },
  })
  if (previo.docs[0]) await payload.update({ collection: 'fotos-tours', id: previo.docs[0].id, data: perfil as never, ...opciones })
  else await payload.create({ collection: 'fotos-tours', data: { ...claves, ...perfil } as never, ...opciones })
}
```

- [ ] **Paso 2: escribir la E2E que falla**

```ts
// tests/e2e/quiz.spec.ts
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
```

- [ ] **Paso 3: implementar el componente del servidor**

```tsx
// src/sitio/ui/quiz/QuizTours.tsx
import type { Locale } from '../../../dominio/idioma'
import { etiquetasQuiz, GUSTOS, JORNADAS, PARA_QUIEN, toursDelQuiz } from '../../../dominio/perfil-tour'
import { atribucion, rutasReservas } from '../../../dominio/rutas'
import { toursDeSede } from '../../datos/cacheadas'
import type { ZonaPublica } from '../../datos/tipos'
import { whatsappTours } from '../../datos/whatsapp'
import { sitioUrl } from '../../entorno'
import { textos } from '../../textos'
import { EnlaceWhatsapp } from '../EnlaceWhatsapp'
import { TarjetaTour } from '../TarjetaTour'
import { ActivadorQuiz } from './ActivadorQuiz'

function Pregunta({ lang, nombre, leyenda, opciones }: { lang: Locale; nombre: string; leyenda: string; opciones: readonly { valor: string; es: string; en: string }[] }) {
  return (
    <fieldset className="quiz__pregunta">
      <legend>{leyenda}</legend>
      {opciones.map((o) => (
        <label key={o.valor} className="quiz__opcion">
          <input type="radio" name={nombre} value={o.valor} />
          <span>{o[lang]}</span>
        </label>
      ))}
    </fieldset>
  )
}

// Spec del paquete 3 §2.2. Sin <form>: con radios y sin botón de envío, Enter mandaría la página a sí misma.
// El botón es un link: sin JavaScript, o si el módulo no llega, lleva a la sede. No lleva data-evento (lo explica el spec).
export async function QuizTours({ lang, zona }: { lang: Locale; zona: ZonaPublica }) {
  if (!zona.sedeSlug) return null
  const [tours, digitos] = await Promise.all([toursDeSede(zona.sedeSlug, lang), whatsappTours(lang)])
  const seleccion = toursDelQuiz(tours)
  if (!seleccion) return null
  const t = textos(lang).quiz
  const pieza = `quiz-${zona.slug}`
  return (
    <section
      className="seccion quiz" id="quiz-tours" aria-labelledby="t-quiz"
      data-zona={zona.slug} data-titulo-resultado={t.resultado} data-sin-coincidencias={t.sinCoincidencias(zona.nombre)} data-etiquetas={JSON.stringify(etiquetasQuiz(lang))}
    >
      <div className="seccion__cabeza"><h2 id="t-quiz" className="t-seccion">{t.titulo}</h2></div>
      <div className="quiz__preguntas" data-quiz-preguntas>
        <Pregunta lang={lang} nombre="para-quien" leyenda={t.conQuien} opciones={PARA_QUIEN} />
        <Pregunta lang={lang} nombre="gusto" leyenda={t.gusto} opciones={GUSTOS} />
        <Pregunta lang={lang} nombre="jornada" leyenda={t.tiempo} opciones={JORNADAS} />
        <a className="boton presionable" data-quiz-ver data-texto={t.verMisTours} href={`${sitioUrl()}${rutasReservas.sede(lang, zona.sedeSlug)}?${atribucion(`${pieza}-sin-js`)}`}>
          {t.verTodos(zona.nombre)}
        </a>
      </div>
      <div className="quiz__resultado" data-quiz-resultado hidden>
        <h3 className="titular" data-quiz-titulo tabIndex={-1} />
        <div className="quiz__lista" data-quiz-lista>
          {seleccion.tarjetas.map((tour) => (
            <div
              key={tour.clave} className="quiz__tour" hidden data-quiz-tour data-clave={tour.clave}
              data-gustos={tour.gustos.join(' ')} data-para-quien={tour.paraQuien.join(' ')} data-jornada={tour.jornada ?? ''} data-meses={tour.meses.join(' ')}
              data-respaldo={seleccion.respaldo.includes(tour.clave) ? '' : undefined}
            >
              <p className="meta" data-quiz-razon />
              <TarjetaTour lang={lang} tour={tour} enlace={{ href: `${sitioUrl()}${tour.ruta}?${atribucion(pieza)}`, 'data-evento': 'tour_clic', 'data-zona': zona.slug, 'data-origen': 'quiz' }} />
            </div>
          ))}
        </div>
        <button type="button" className="boton boton--secundario presionable" data-quiz-reiniciar>{t.reiniciar}</button>
        {digitos && <EnlaceWhatsapp lang={lang} digitos={digitos} nombre={zona.nombre} zona={zona.slug} origen="quiz" />}
      </div>
      <p className="quiz__vivo" aria-live="polite" data-quiz-vivo />
      <ActivadorQuiz />
    </section>
  )
}
```

En `src/sitio/ui/EnlaceWhatsapp.tsx`, sumar `'quiz'` a `OrigenWhatsapp`.

- [ ] **Paso 4: implementar el activador**

```tsx
// src/sitio/ui/quiz/ActivadorQuiz.tsx
'use client'

import { useEffect } from 'react'

import { track } from '../../analitica/track'
import type { Quiz } from './activarQuiz'

const ESPERA_MS = 3000
const TOQUES = ['pointerdown', 'focusin', 'keydown'] as const

// Spec del paquete 3 §2.2: lo único del quiz en el JavaScript inicial. Baja el módulo al primer toque y, si «Ver mis
// tours» llega antes que él, lo espera hasta 3 s. Si falla o tarda más, sigue el link y solo entonces cuenta el clic.
export function ActivadorQuiz() {
  useEffect(() => {
    const raiz = document.getElementById('quiz-tours')
    const boton = raiz?.querySelector<HTMLAnchorElement>('[data-quiz-ver]')
    if (!raiz || !boton) return

    let quiz: Promise<Quiz> | null = null
    let esperando = false
    const activar = () => (quiz ??= import('./activarQuiz').then((m) => m.activarQuiz(raiz)))
    const alTocar = () => {
      TOQUES.forEach((tipo) => raiz.removeEventListener(tipo, alTocar))
      activar().catch(() => undefined)
    }
    const sincronizar = () => boton.setAttribute('aria-disabled', raiz.querySelector('input[name="gusto"]:checked') ? 'false' : 'true')
    const seguir = () => {
      track('tour_clic', { zona: raiz.dataset.zona, origen: 'quiz' })
      window.location.assign(boton.href)
    }
    const alClic = (e: MouseEvent) => {
      e.preventDefault()
      if (esperando || boton.getAttribute('aria-disabled') === 'true') return
      esperando = true
      let tiempo = 0
      const limite = new Promise<null>((listo) => { tiempo = window.setTimeout(() => listo(null), ESPERA_MS) })
      Promise.race([activar(), limite]).then((q) => {
        window.clearTimeout(tiempo)
        if (!q) return seguir()
        esperando = false
        q.ver()
      }).catch(seguir)
    }

    const textoOriginal = boton.textContent
    boton.textContent = boton.dataset.texto ?? textoOriginal
    sincronizar()
    TOQUES.forEach((tipo) => raiz.addEventListener(tipo, alTocar))
    raiz.addEventListener('change', sincronizar)
    boton.addEventListener('click', alClic)
    return () => {
      TOQUES.forEach((tipo) => raiz.removeEventListener(tipo, alTocar))
      raiz.removeEventListener('change', sincronizar)
      boton.removeEventListener('click', alClic)
      boton.textContent = textoOriginal
      boton.removeAttribute('aria-disabled')
      void quiz?.then((q) => q.limpiar()).catch(() => undefined)
    }
  }, [])
  return null
}
```

- [ ] **Paso 5: implementar el módulo diferido**

```ts
// src/sitio/ui/quiz/activarQuiz.ts
import { puntuarTours, razonTour, type Etiquetas, type Respuestas } from '../../../dominio/perfil-tour'
import { mesEnBCS } from '../../../dominio/temporada'
import { track } from '../../analitica/track'

export type Quiz = { ver(): void; limpiar(): void }

const lista = (v: string | undefined) => (v ? v.split(' ') : [])

// Módulo diferido del quiz (spec del paquete 3 §2.2). Solo lee lo que el servidor dejó en la página: no pide nada.
export function activarQuiz(raiz: HTMLElement): Quiz {
  const uno = <T extends HTMLElement>(selector: string) => raiz.querySelector<T>(selector) as T
  const preguntas = uno('[data-quiz-preguntas]')
  const resultado = uno('[data-quiz-resultado]')
  const contenedor = uno('[data-quiz-lista]')
  const titulo = uno('[data-quiz-titulo]')
  const vivo = uno('[data-quiz-vivo]')
  const boton = uno('[data-quiz-ver]')
  const reiniciar = uno('[data-quiz-reiniciar]')
  const etiquetas = JSON.parse(raiz.dataset.etiquetas ?? '{}') as Etiquetas
  const radios = [...raiz.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
  const marcado = (nombre: string) => radios.find((r) => r.name === nombre && r.checked)?.value ?? null

  const tours = [...raiz.querySelectorAll<HTMLElement>('[data-quiz-tour]')].map((el) => ({
    el,
    clave: el.dataset.clave ?? '',
    gustos: lista(el.dataset.gustos),
    paraQuien: lista(el.dataset.paraQuien),
    jornada: el.dataset.jornada || null,
    meses: lista(el.dataset.meses).map(Number),
  }))

  const ver = () => {
    const gusto = marcado('gusto')
    if (!gusto) return
    const r: Respuestas = { gusto, paraQuien: marcado('para-quien'), jornada: marcado('jornada') }
    const mes = mesEnBCS(new Date())
    const ganadores = puntuarTours(tours, r, mes)
    tours.forEach((t) => { t.el.hidden = true })
    for (const t of ganadores ?? tours.filter((x) => x.el.hasAttribute('data-respaldo'))) {
      const razon = t.el.querySelector<HTMLElement>('[data-quiz-razon]') as HTMLElement
      razon.textContent = ganadores ? razonTour(t, r, mes, etiquetas) : ''
      razon.hidden = !ganadores
      contenedor.append(t.el) // El orden en pantalla es el de los puntos.
      t.el.hidden = false
    }
    titulo.textContent = (ganadores ? raiz.dataset.tituloResultado : raiz.dataset.sinCoincidencias) ?? ''
    preguntas.hidden = true
    resultado.hidden = false
    vivo.textContent = titulo.textContent
    titulo.focus()
    track('quiz_resultado', { zona: raiz.dataset.zona, gusto })
  }

  const alReiniciar = () => {
    radios.forEach((r) => { r.checked = false })
    boton.setAttribute('aria-disabled', 'true')
    resultado.hidden = true
    preguntas.hidden = false
    vivo.textContent = ''
    radios[0]?.focus()
  }

  reiniciar.addEventListener('click', alReiniciar)
  return { ver, limpiar: () => reiniciar.removeEventListener('click', alReiniciar) }
}
```

- [ ] **Paso 6: textos y estilos.** En `src/sitio/textos.ts`, antes de `banda:` del bloque en español:

```ts
  quiz: {
    titulo: '¿Qué tour es para mí?',
    conQuien: '¿Con quién viajas?',
    gusto: '¿Qué te gusta más?',
    tiempo: '¿Cuánto tiempo tienes?',
    verMisTours: 'Ver mis tours',
    verTodos: (z: string) => `Ver todos los tours en ${z}`,
    resultado: 'Estos tours van contigo',
    sinCoincidencias: (z: string) => `No encontramos uno exacto; mira estos tours en ${z}`,
    reiniciar: 'Volver a empezar',
  },
```

Antes de `banda:` del bloque en inglés:

```ts
  quiz: {
    titulo: 'Which tour is right for me?',
    conQuien: 'Who are you traveling with?',
    gusto: 'What do you enjoy most?',
    tiempo: 'How much time do you have?',
    verMisTours: 'See my tours',
    verTodos: (z: string) => `See all tours in ${z}`,
    resultado: 'These tours suit you',
    sinCoincidencias: (z: string) => `We didn't find an exact match; take a look at these tours in ${z}`,
    reiniciar: 'Start over',
  },
```

Al final de `src/sitio/estilos/presencia.css`:

```css
/* «¿Qué tour es para mí?» (paquete 3). `hidden` gana a cualquier display de estas clases. */
.quiz [hidden] { display: none; }
.quiz__preguntas { display: grid; gap: 20px; justify-items: start; }
.quiz__pregunta { border: 0; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 20px; }
.quiz__pregunta legend { font-weight: 600; padding: 0; margin-bottom: 8px; }
.quiz__opcion { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; cursor: pointer; }
.quiz__preguntas [aria-disabled="true"] { opacity: .55; cursor: not-allowed; }
.quiz__lista { display: grid; gap: 20px; margin: 16px 0; }
@media (min-width: 720px) { .quiz__lista { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.quiz__resultado h3:focus { outline: none; }
.quiz__vivo { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
```

- [ ] **Paso 7: agregarlo a las páginas.** En `src/app/(sitio)/[lang]/guia/[zona]/page.tsx`, importar `QuizTours` de `../../../../../sitio/ui/quiz/QuizTours` y agregar justo después de `<ToursEnZona … origen="zona" formato="riel" />`:

```tsx
      <QuizTours lang={lang} zona={zona} />
```

En `src/app/(sitio)/[lang]/guia/temas/[slug]/page.tsx`, importar con la misma profundidad que sus otros `sitio/ui/` y agregar justo después de la línea del `ToursEnZona`:

```tsx
        {zona && <QuizTours lang={lang} zona={zona} />}
```

- [ ] **Paso 8: correr la E2E.** Detener cualquier `next dev`. `E2E_SOLO=indexable npm run test:e2e`. Esperado: PASS, incluidas las E2E anteriores.

- [ ] **Paso 9: commit** con mensaje `feat: quiz «¿Qué tour es para mí?» en zona y tema`.

### Tarea 5: `maplibre-gl` 6.4.1 y fallos del mapa

**Archivos:**
- Crear: `src/dominio/mapa.ts`, `scripts/copiar-worker-maplibre.mjs`, `tests/e2e/fixtures/estilo-mapa.json`
- Modificar: `package.json`, `package-lock.json`, `scripts/build-vercel.mjs`, `.gitignore`, `eslint.config.*`, `playwright.config.ts`, `src/sitio/ui/Mapa.tsx`, `src/sitio/estilos/base.css`
- Prueba: `tests/unit/mapa.test.ts`, `tests/unit/copiar-worker.test.ts`, `tests/e2e/mapa.spec.ts`

**Interfaces:**
- Produce: `clasificarErrorMapa(evento: { sourceId?: unknown; tile?: unknown }, estiloCargado: boolean): 'duro' | 'leve'`; `copiarWorker(raiz?: string): string`; `data-mapa-listo="1"` y `.mapa__respaldo` en `Mapa`.

- [ ] **Paso 1: escribir las pruebas que fallan**

```ts
// tests/unit/mapa.test.ts
import { describe, expect, it } from 'vitest'

import { clasificarErrorMapa } from '../../src/dominio/mapa'

describe('clasificarErrorMapa', () => {
  it('el estilo que falla antes de style.load es duro', () => expect(clasificarErrorMapa({}, false)).toBe('duro'))
  it('con sourceId es leve', () => expect(clasificarErrorMapa({ sourceId: 'teselas' }, false)).toBe('leve'))
  it('con tile es leve', () => expect(clasificarErrorMapa({ tile: {} }, false)).toBe('leve'))
  it('después de style.load es leve', () => expect(clasificarErrorMapa({}, true)).toBe('leve'))
})
```

```ts
// tests/unit/copiar-worker.test.ts
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { copiarWorker } from '../../scripts/copiar-worker-maplibre.mjs'

describe('copiarWorker', () => {
  let raiz: string
  const dist = () => path.join(raiz, 'node_modules/maplibre-gl/dist')

  beforeEach(() => {
    raiz = mkdtempSync(path.join(tmpdir(), 'worker-'))
    mkdirSync(dist(), { recursive: true })
    writeFileSync(path.join(raiz, 'node_modules/maplibre-gl/package.json'), JSON.stringify({ version: '9.9.9' }))
    writeFileSync(path.join(dist(), 'maplibre-gl-worker.mjs'), 'w')
  })
  afterEach(() => rmSync(raiz, { recursive: true, force: true }))

  it('falla si falta un archivo', () => {
    expect(() => copiarWorker(raiz)).toThrow(/maplibre-gl-shared\.mjs/)
  })

  it('copia los dos en una carpeta con la versión', () => {
    writeFileSync(path.join(dist(), 'maplibre-gl-shared.mjs'), 's')
    const destino = copiarWorker(raiz)
    expect(destino).toBe(path.join(raiz, 'public/guia-assets/maplibre/9.9.9'))
    expect(existsSync(path.join(destino, 'maplibre-gl-worker.mjs'))).toBe(true)
    expect(existsSync(path.join(destino, 'maplibre-gl-shared.mjs'))).toBe(true)
  })
})
```

- [ ] **Paso 2: correrlas y ver que fallan.** `npx vitest run --project unit tests/unit/mapa.test.ts tests/unit/copiar-worker.test.ts`.

- [ ] **Paso 3: implementar la regla y el script**

```ts
// src/dominio/mapa.ts
// Spec del paquete 3 §2.4: solo el fallo del estilo es fatal. Una tesela, un sprite o un glifo no lo son.
export function clasificarErrorMapa(evento: { sourceId?: unknown; tile?: unknown }, estiloCargado: boolean): 'duro' | 'leve' {
  return !estiloCargado && evento.sourceId === undefined && evento.tile === undefined ? 'duro' : 'leve'
}
```

```js
// scripts/copiar-worker-maplibre.mjs
// Copia el worker de MapLibre a public/ (spec del paquete 3 §2.4). Turbopack no lo emite. La ruta lleva la versión para
// que el CDN nunca junte un worker viejo con un paquete principal nuevo. Lo llaman prebuild, predev y build-vercel.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// El worker importa el segundo archivo: sin él al lado no arranca y el error es asíncrono.
const ARCHIVOS = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']

export function copiarWorker(raiz = process.cwd()) {
  const paquete = path.join(raiz, 'node_modules/maplibre-gl')
  const { version } = JSON.parse(readFileSync(path.join(paquete, 'package.json'), 'utf8'))
  const destino = path.join(raiz, 'public/guia-assets/maplibre', version)
  mkdirSync(destino, { recursive: true })
  for (const archivo of ARCHIVOS) {
    const origen = path.join(paquete, 'dist', archivo)
    if (!existsSync(origen)) throw new Error(`Falta ${origen}`)
    copyFileSync(origen, path.join(destino, archivo))
  }
  return destino
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(`Worker de MapLibre en ${copiarWorker()}`)
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  }
}
```

- [ ] **Paso 4: correrlas y ver que pasan.** Mismo comando. Esperado: PASS.

- [ ] **Paso 5: actualizar y conectar.** `npm install --save-exact maplibre-gl@6.4.1`. En `package.json`, dentro de `scripts`:

```json
    "predev": "node scripts/copiar-worker-maplibre.mjs",
    "prebuild": "node scripts/copiar-worker-maplibre.mjs",
```

En `scripts/build-vercel.mjs`, antes del `correr('npx', ['next', 'build'], …)`:

```js
correr('node', ['scripts/copiar-worker-maplibre.mjs'], {}) // Vercel no corre prebuild.
```

En `.gitignore`, agregar `/public/guia-assets/maplibre/`. En `eslint.config.mjs`, agregar `'public/guia-assets/maplibre/',` a `ignores`.

- [ ] **Paso 6: escribir la E2E que falla.** En `playwright.config.ts`, reemplazar `projects`:

```ts
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /mapa\.spec\.ts/ },
    {
      // WebGL por software: el CI no tiene GPU (spec del paquete 3 §2.4).
      name: 'mapa',
      testMatch: /mapa\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
    },
  ],
```

```json
{
  "version": 8,
  "sources": {
    "puntos": { "type": "geojson", "data": { "type": "FeatureCollection", "features": [{ "type": "Feature", "properties": {}, "geometry": { "type": "Point", "coordinates": [-110.3226, 24.3216] } }] } },
    "teselas": { "type": "vector", "tiles": ["https://tiles.openfreemap.org/prueba/{z}/{x}/{y}.pbf"], "minzoom": 0, "maxzoom": 14 }
  },
  "layers": [
    { "id": "fondo", "type": "background", "paint": { "background-color": "#cfe3ec" } },
    { "id": "circulo", "type": "circle", "source": "puntos" },
    { "id": "lineas", "type": "line", "source": "teselas", "source-layer": "prueba" }
  ]
}
```

(Ese JSON va en `tests/e2e/fixtures/estilo-mapa.json`.)

```ts
// tests/e2e/mapa.spec.ts
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
})
```

- [ ] **Paso 7: migrar `Mapa.tsx`.** Reemplazar el archivo completo:

```tsx
'use client'

import 'maplibre-gl/dist/maplibre-gl.css'

import { useEffect, useRef, useState } from 'react'

import type { Locale } from '../../dominio/idioma'
import { clasificarErrorMapa } from '../../dominio/mapa'
import { textos } from '../textos'

type Punto = { lng: number; lat: number; nombre: string; ruta?: string }
type Respaldo = 'ninguno' | 'debajo' | 'solo'

const ESTILO = 'https://tiles.openfreemap.org/styles/liberty' // OpenFreeMap: sin llave (índice de F3)
const ESPERA_MS = 10_000

// Decisión 20: MapLibre + OpenFreeMap. La librería solo se descarga cuando el mapa entra en pantalla; antes se ve
// la dirección; mientras bajan la librería y el estilo, un esqueleto. Los popups se arman con nodos de texto, nunca con
// HTML del admin.
export function Mapa({ lang, titulo, puntos, direccion }: { lang: Locale; titulo: string; puntos: Punto[]; direccion?: string | null }) {
  const caja = useRef<HTMLDivElement>(null)
  const [activo, setActivo] = useState(false)
  const [listo, setListo] = useState(false)
  const [cargado, setCargado] = useState(false)
  const [respaldo, setRespaldo] = useState<Respaldo>('ninguno')

  useEffect(() => {
    const el = caja.current
    if (!el) return
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setActivo(true)
        o.disconnect()
      }
    }, { rootMargin: '200px' })
    o.observe(el)
    return () => o.disconnect()
  }, [])

  useEffect(() => {
    if (!activo || !caja.current || !puntos.length) return
    let vivo = true
    let mapa: { remove(): void } | null = null
    let espera: number | undefined
    // Spec del paquete 3 §2.4: sin esqueleto ni lienzo, y vuelve el texto de antes de activar el mapa.
    const falloDuro = (motivo: string) => {
      if (!vivo) return
      window.clearTimeout(espera)
      console.error(`Mapa: ${motivo}`)
      mapa?.remove()
      mapa = null
      setListo(true)
      setRespaldo('solo')
    }
    import('maplibre-gl').then((m) => {
      if (!vivo || !caja.current) return
      setListo(false)
      setCargado(false)
      setRespaldo('ninguno')
      // getVersion() viene en la librería: la ruta siempre coincide con el paquete cargado.
      m.setWorkerUrl(`/guia-assets/maplibre/${m.getVersion()}/maplibre-gl-worker.mjs`)
      let nuevo: InstanceType<typeof m.Map>
      try {
        nuevo = new m.Map({ container: caja.current, style: ESTILO, center: [puntos[0].lng, puntos[0].lat], zoom: 13, attributionControl: { compact: true } })
      } catch {
        falloDuro('no se pudo crear')
        return
      }
      // Sin WebGL, la 6.4.1 no lanza: dispara `error` dentro del constructor y deja `painter` sin crear, y remove() fallaría.
      if (!nuevo.painter) {
        falloDuro('sin WebGL')
        return
      }
      mapa = nuevo
      let estiloCargado = false
      nuevo.once('style.load', () => { estiloCargado = true })
      nuevo.on('error', (e) => {
        if (clasificarErrorMapa(e as { sourceId?: unknown; tile?: unknown }, estiloCargado) === 'duro') falloDuro('no se pudo cargar el estilo')
        else console.warn('Mapa: un recurso no cargó')
      })
      // A los 10 s no se sabe si el worker está roto o la red es lenta: el mapa se queda y el texto va debajo.
      espera = window.setTimeout(() => {
        console.warn('mapa sin cargar a los 10 s')
        setListo(true)
        setRespaldo('debajo')
      }, ESPERA_MS)
      nuevo.once('load', () => {
        window.clearTimeout(espera)
        setListo(true)
        setCargado(true)
        setRespaldo('ninguno')
      })
      nuevo.addControl(new m.NavigationControl({ showCompass: false }))
      for (const p of puntos) {
        const contenido = document.createElement(p.ruta ? 'a' : 'span')
        contenido.textContent = p.nombre
        if (p.ruta && contenido instanceof HTMLAnchorElement) contenido.href = p.ruta
        new m.Marker({ color: '#1B607F' }).setLngLat([p.lng, p.lat]).setPopup(new m.Popup({ offset: 24 }).setDOMContent(contenido)).addTo(nuevo)
      }
      if (puntos.length > 1) {
        const limites = new m.LngLatBounds()
        puntos.forEach((p) => limites.extend([p.lng, p.lat]))
        nuevo.fitBounds(limites, { padding: 48, maxZoom: 14 })
      }
    }).catch(() => falloDuro('no se pudo descargar la librería'))
    return () => {
      vivo = false
      window.clearTimeout(espera)
      mapa?.remove()
    }
  }, [activo, puntos])

  const texto = direccion ?? textos(lang).ficha.verMapa
  return (
    <div className="mapa" role="region" aria-label={titulo} data-mapa-listo={cargado ? '1' : undefined}>
      <div ref={caja} className="mapa__caja" hidden={respaldo === 'solo'}>
        {!activo && <p className="meta" style={{ padding: 16 }}>{texto}</p>}
      </div>
      {respaldo !== 'ninguno' && <p className="meta mapa__respaldo">{texto}</p>}
      {activo && puntos.length > 0 && <div className={`mapa__carga esq${listo ? ' lista' : ''}`} aria-hidden="true" />}
    </div>
  )
}
```

En `src/sitio/estilos/base.css`, reemplazar la línea `.mapa { position: relative; }`:

```css
/* En columna: el texto de respaldo y la leyenda van debajo sin que .mapa-cat, con overflow hidden, los recorte. */
.mapa { position: relative; display: flex; flex-direction: column; }
.mapa__caja { width: 100%; flex: 1 1 auto; min-height: 280px; }
.mapa__caja[hidden] { display: none; }
.mapa__respaldo { padding: 12px 16px; margin: 0; }
/* La caja 16:9 con overflow hidden de la ficha y del evento recortaría el texto en móvil. */
.pagina-ficha .mapa:has(.mapa__respaldo), .pagina-evento .mapa:has(.mapa__respaldo) { aspect-ratio: auto; }
```

- [ ] **Paso 8: correr todo.** `npm run typecheck`. Si un tipo de la 6 no coincide con la llamada, corregirlo contra `node_modules/maplibre-gl/dist/maplibre-gl.d.ts`. Detener cualquier `next dev`. `E2E_SOLO=indexable npm run test:e2e`. Esperado: PASS.

- [ ] **Paso 9: confirmar el aviso.** `npm audit --omit=dev`. Esperado: ya no aparece GHSA-jrc7-96c5-q579 de `maplibre-gl`.

- [ ] **Paso 10: commit** con mensaje `fix: maplibre-gl 6.4.1 (GHSA-jrc7-96c5-q579) y fallos del mapa visibles`.

### Tarea 6: tours en el mapa

**Archivos:**
- Crear: `src/dominio/enlaces.ts`, `src/sitio/datos/mapa-tours.ts`
- Modificar: `src/dominio/mapa.ts`, `src/sitio/ui/CuerpoRico.tsx`, `src/sitio/ui/Mapa.tsx`, `src/sitio/paginas/CategoriaEnZona.tsx`, `src/app/(sitio)/[lang]/guia/temas/[slug]/page.tsx`, `src/sitio/textos.ts`, `src/sitio/estilos/base.css`
- Prueba: `tests/unit/enlaces.test.ts`, `tests/unit/mapa-tours.test.ts`, `tests/e2e/mapa.spec.ts`

**Interfaces:**
- Consume: `relacionadosVisibles(tours, claves)`, `atribucion(pieza)`, `precioEnTexto(lang, tour)`.
- Produce: `esEnlaceSeguro(url): boolean`; `TourDePunto`, `PuntoMapa`; `puntosConTours(lugares, tours, { lang, pieza, sitio, precioDe }): PuntoMapa[]`.

- [ ] **Paso 1: escribir las pruebas que fallan**

```ts
// tests/unit/enlaces.test.ts
import { describe, expect, it } from 'vitest'

import { esEnlaceSeguro } from '../../src/dominio/enlaces'

describe('esEnlaceSeguro', () => {
  it('acepta esquemas seguros, rutas propias y anclas', () => {
    for (const u of ['https://x.mx', 'http://x.mx', 'mailto:a@b.mx', 'tel:+52', '/es/guia', '#a']) expect(esEnlaceSeguro(u), u).toBe(true)
  })
  it('rechaza scripts, protocolo relativo y caracteres de control', () => {
    for (const u of ['javascript:alert(1)', '//x.mx', '/\\x.mx', '/\t/x.mx', 'www.x.mx']) expect(esEnlaceSeguro(u), u).toBe(false)
  })
})
```

```ts
// tests/unit/mapa-tours.test.ts
import { describe, expect, it } from 'vitest'

import { puntosConTours } from '../../src/sitio/datos/mapa-tours'

const tour = (slug: string) => ({ clave: `servicio:${slug}`, nombre: slug.toUpperCase(), ruta: `/es/servicio/e/${slug}` })
const lugar = (extra: object = {}) => ({ slug: 'playa', nombre: 'Playa', zonaSlug: 'la-paz', coordenadas: [-110, 24] as [number, number], toursRelacionados: [] as string[], ...extra })
const opciones = { lang: 'es' as const, pieza: 'mapa-la-paz-playas', sitio: 'https://s.mx', precioDe: () => '$1,500' }

describe('puntosConTours', () => {
  it('arma el punto con nombre, precio, href con atribución y zona', () => {
    const [p] = puntosConTours([lugar({ toursRelacionados: ['servicio:a'] })], [tour('a')], opciones)
    expect(p).toMatchObject({ lng: -110, lat: 24, nombre: 'Playa', ruta: '/es/guia/lugares/playa' })
    expect(p.tours).toEqual([{ nombre: 'A', precio: '$1,500', href: 'https://s.mx/es/servicio/e/a?desde=guia&pieza=mapa-la-paz-playas', zona: 'la-paz' }])
  })
  it('a lo más 2 tours', () => {
    const claves = ['servicio:a', 'servicio:b', 'servicio:c']
    const [p] = puntosConTours([lugar({ toursRelacionados: claves })], [tour('a'), tour('b'), tour('c')], opciones)
    expect(p.tours).toHaveLength(2)
  })
  it('un tour que ya no está en el catálogo no sale', () => {
    const [p] = puntosConTours([lugar({ toursRelacionados: ['servicio:viejo'] })], [tour('a')], opciones)
    expect(p.tours).toEqual([])
  })
  it('catálogo caído: puntos sin tours', () => {
    const [p] = puntosConTours([lugar({ toursRelacionados: ['servicio:a'] })], [], opciones)
    expect(p.tours).toEqual([])
  })
  it('un lugar sin coordenadas no da punto', () => {
    expect(puntosConTours([lugar({ coordenadas: null })], [], opciones)).toEqual([])
  })
})
```

Agregar a `tests/e2e/mapa.spec.ts`, dentro del `describe`:

```ts
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
```

- [ ] **Paso 2: correr las unitarias y ver que fallan.** `npx vitest run --project unit tests/unit/enlaces.test.ts tests/unit/mapa-tours.test.ts`.

- [ ] **Paso 3: extraer `esEnlaceSeguro`**

```ts
// src/dominio/enlaces.ts
const ESQUEMAS_SEGUROS = /^(https?|mailto|tel):/i
// Rutas del propio sitio (`/x`) y anclas (`#x`). `//x` y `/\x` los navegadores los leen como protocolo relativo (otro
// sitio), y los saltos o tabulaciones se descartan al interpretar la URL (`/<tab>/x` pasa a `//x`): fuera todos.
const CONTROL = /[\u0000-\u001f\u007f]/
const RUTA_PROPIA = /^(\/(?![/\\])|#)/
// `www.x` sin esquema sigue fuera: no hay una normalización clara (http o https) y el editor puede escribir https://.
export const esEnlaceSeguro = (url: string): boolean => !CONTROL.test(url) && (ESQUEMAS_SEGUROS.test(url) || RUTA_PROPIA.test(url))
```

En `src/sitio/ui/CuerpoRico.tsx`, borrar las constantes `ESQUEMAS_SEGUROS`, `CONTROL`, `RUTA_PROPIA` y `esEnlaceSeguro` con sus comentarios, y agregar `import { esEnlaceSeguro } from '../../dominio/enlaces'`.

- [ ] **Paso 4: armar los puntos.** Agregar a `src/dominio/mapa.ts`:

```ts
export type TourDePunto = { nombre: string; precio: string | null; href: string; zona: string }
export type PuntoMapa = { lng: number; lat: number; nombre: string; ruta?: string; tours?: TourDePunto[] }
```

```ts
// src/sitio/datos/mapa-tours.ts
import type { Locale } from '../../dominio/idioma'
import type { PuntoMapa } from '../../dominio/mapa'
import { relacionadosVisibles } from '../../dominio/presencia'
import { atribucion, rutas } from '../../dominio/rutas'
import type { TarjetaLugar } from './tipos'

type Lugar = Pick<TarjetaLugar, 'slug' | 'nombre' | 'zonaSlug' | 'coordenadas' | 'toursRelacionados'>
type Opciones<T> = { lang: Locale; pieza: string; sitio: string; precioDe: (tour: T) => string | null }

// Puntos del mapa con sus tours ya armados en el servidor (spec del paquete 3 §2.3): `Mapa` no lee tours.
export function puntosConTours<T extends { clave: string; nombre: string; ruta: string }>(lugares: readonly Lugar[], tours: T[], { lang, pieza, sitio, precioDe }: Opciones<T>): PuntoMapa[] {
  const consulta = atribucion(pieza)
  return lugares.flatMap((l) => (!l.coordenadas ? [] : [{
    lng: l.coordenadas[0],
    lat: l.coordenadas[1],
    nombre: l.nombre,
    ruta: rutas.lugar(lang, l.slug),
    tours: relacionadosVisibles(tours, l.toursRelacionados).slice(0, 2).map((t) => ({
      nombre: t.nombre, precio: precioDe(t), href: `${sitio}${t.ruta}?${consulta}`, zona: l.zonaSlug,
    })),
  }]))
}
```

- [ ] **Paso 5: correr las unitarias y ver que pasan.** Mismo comando del paso 2 más `tests/unit/cuerpo-rico*`, si existe. Esperado: PASS.

- [ ] **Paso 6: marcador, popup y leyenda.** En `src/sitio/ui/Mapa.tsx`:

Cambiar los imports y borrar `type Punto`:

```tsx
import { esEnlaceSeguro } from '../../dominio/enlaces'
import type { Locale } from '../../dominio/idioma'
import { clasificarErrorMapa, type PuntoMapa } from '../../dominio/mapa'
```

Agregar antes de `export function Mapa`:

```tsx
const COLOR = '#1B607F'
const SVG = 'http://www.w3.org/2000/svg'

type TextosMapa = ReturnType<typeof textos>

// Pin propio con la insignia en texto: la diferencia no depende solo del color (spec del paquete 3 §2.3).
function marcadorConTour(nombre: string, t: TextosMapa): HTMLElement {
  const el = document.createElement('div')
  el.className = 'mapa-marcador'
  // MapLibre solo les pone rol a sus marcadores por defecto.
  el.setAttribute('role', 'button')
  el.setAttribute('aria-label', t.mapa.conTourDe(nombre))
  const insignia = document.createElement('span')
  insignia.className = 'mapa-insignia mapa-insignia--flotante'
  insignia.textContent = t.mapa.insignia
  const svg = document.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', '0 0 27 41')
  svg.setAttribute('width', '27')
  svg.setAttribute('height', '41')
  const pin = document.createElementNS(SVG, 'path')
  pin.setAttribute('d', 'M13.5 0C6 0 0 6 0 13.5 0 23.6 13.5 41 13.5 41S27 23.6 27 13.5C27 6 21 0 13.5 0z')
  pin.setAttribute('fill', COLOR)
  const punto = document.createElementNS(SVG, 'circle')
  punto.setAttribute('cx', '13.5')
  punto.setAttribute('cy', '13.5')
  punto.setAttribute('r', '5.5')
  punto.setAttribute('fill', '#fff')
  svg.append(pin, punto)
  el.append(insignia, svg)
  return el
}

// Solo nodos y `href` validado: el texto viene del admin y del catálogo.
function contenidoPopup(p: PuntoMapa, t: TextosMapa): HTMLElement {
  const caja = document.createElement('div')
  const lugar = document.createElement(p.ruta ? 'a' : 'span')
  lugar.textContent = p.nombre
  if (p.ruta && lugar instanceof HTMLAnchorElement) lugar.href = p.ruta
  caja.append(lugar)
  const tours = (p.tours ?? []).filter((x) => esEnlaceSeguro(x.href))
  if (!tours.length) return caja
  const titulo = document.createElement('p')
  titulo.className = 'mapa-popup__tours'
  titulo.textContent = t.mapa.tours
  caja.append(titulo)
  for (const x of tours) {
    const a = document.createElement('a')
    a.href = x.href
    a.textContent = x.precio ? `${x.nombre}, ${t.tours.desde} ${x.precio}` : x.nombre
    a.dataset.evento = 'tour_clic'
    a.dataset.zona = x.zona
    a.dataset.origen = 'mapa'
    a.style.display = 'block'
    caja.append(a)
  }
  return caja
}
```

Cambiar la firma de `Mapa` a `puntos: PuntoMapa[]` y reemplazar el `for (const p of puntos)` completo:

```tsx
      for (const p of puntos) {
        const conTours = (p.tours?.length ?? 0) > 0
        const marcador = conTours ? new m.Marker({ element: marcadorConTour(p.nombre, t), anchor: 'bottom' }) : new m.Marker({ color: COLOR })
        // Con tours el popup sube más: el pin mide 41 px y la insignia va encima.
        marcador.setLngLat([p.lng, p.lat]).setPopup(new m.Popup({ offset: conTours ? 60 : 24 }).setDOMContent(contenidoPopup(p, t))).addTo(nuevo)
      }
```

Agregar `const t = textos(lang)` como primera línea de `Mapa`, sumar `lang` a las dependencias del efecto (`[activo, lang, puntos]`) y cambiar `const texto` por `const texto = direccion ?? t.ficha.verMapa`. Antes del cierre del `<div className="mapa">`, después del respaldo:

```tsx
      {puntos.some((p) => p.tours?.length) && (
        <p className="meta mapa-leyenda"><span className="mapa-insignia" aria-hidden="true">{t.mapa.insignia}</span> {t.mapa.conTour}</p>
      )}
```

En `src/sitio/textos.ts`, antes de `banda:` en español y en inglés:

```ts
  mapa: { insignia: 'Tour', conTour: 'Con tour disponible', conTourDe: (n: string) => `${n}, con tour disponible`, tours: 'Tours' },
```

```ts
  mapa: { insignia: 'Tour', conTour: 'Tour available', conTourDe: (n: string) => `${n}, tour available`, tours: 'Tours' },
```

En `src/sitio/estilos/base.css`, después de `.mapa__respaldo`:

```css
/* Blanco sobre el azul del pin (6.9:1, AA). MapLibre ya posiciona .maplibregl-marker: no darle position a .mapa-marcador. */
.mapa-marcador { cursor: pointer; }
.mapa-marcador svg { display: block; }
.mapa-insignia { display: inline-block; padding: 1px 6px; border-radius: 999px; background: #1B607F; color: var(--blanco); font-size: 11px; font-weight: 700; line-height: 1.4; }
.mapa-insignia--flotante { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); box-shadow: 0 0 0 1px var(--blanco); }
.mapa-leyenda { padding: 8px 12px; margin: 0; }
.mapa-popup__tours { font-weight: 700; margin: 8px 0 2px; }
```

- [ ] **Paso 7: usarlo en las páginas.** En `src/sitio/paginas/CategoriaEnZona.tsx`, importar `toursDeSede` junto a las demás de `../datos/cacheadas`, `puntosConTours` de `../datos/mapa-tours` y `precioEnTexto` de `../ui/PrecioTour`. Reemplazar el `Promise.all` que dejó el plan 2:

```tsx
  const [texto, articulos, temas, toursSede] = await Promise.all([
    textoCacheado(zona.id, cat.id, lang), articulosCacheados(lang), temasCacheados(lang), zona.sedeSlug ? toursDeSede(zona.sedeSlug, lang) : Promise.resolve([]),
  ])
```

y la prop `puntos`:

```tsx
                  puntos={puntosConTours(conCoordenadas, toursSede, { lang, pieza: `mapa-${zona.slug}-${cat.slug}`, sitio: sitioUrl(), precioDe: (x) => precioEnTexto(lang, x) })}
```

En `src/app/(sitio)/[lang]/guia/temas/[slug]/page.tsx`, que ya importa `toursDeSede` y `sitioUrl`, importar solo `puntosConTours` (`sitio/datos/mapa-tours`), `precioEnTexto` (`sitio/ui/PrecioTour`) y `Mapa` (`sitio/ui/Mapa`), con las rutas relativas de esa carpeta. Agregar antes del `const ruta = rutas.tema(…)`:

```tsx
  // Solo con zona: sin ella mezclaría lugares lejanos y leería varias sedes por punto (spec del paquete 3 §2.3).
  const toursZona = zona?.sedeSlug ? await toursDeSede(zona.sedeSlug, lang) : []
  const puntos = zona ? puntosConTours(lista, toursZona, { lang, pieza: `mapa-tema-${tema.slug}`, sitio: sitioUrl(), precioDe: (x) => precioEnTexto(lang, x) }) : []
```

y después de la `<section className="bloque">` de la lista de lugares:

```tsx
        {puntos.length > 0 && <section className="bloque"><Mapa lang={lang} titulo={t.ficha.mapa(tema.titulo)} puntos={puntos} /></section>}
```

- [ ] **Paso 8: correr.** `npm run typecheck`, `npm run test:unit`. Detener cualquier `next dev`. `E2E_SOLO=indexable npm run test:e2e`. Esperado: PASS.

- [ ] **Paso 9: commit** con mensaje `feat: tours en el mapa de categoría y de tema`.

### Tarea 7: documentación y cierre

**Archivos:**
- Modificar: `docs/specs/2026-10-30-guia-baja-design.md`, `docs/editores/escribir-para-buscadores.md`

- [ ] **Paso 1: documentar.**
  - Spec principal §13: el evento `quiz_resultado` (`zona`, `gusto`), los orígenes `quiz` y `mapa` de `tour_clic` y el origen `quiz` de `whatsapp_clic`.
  - `docs/editores/escribir-para-buscadores.md`: en «Fotos y temporadas de tours», qué significa cada campo del perfil, que un tour sin gusto no entra en el quiz y que una sede necesita 3 tours con perfil para mostrarlo.

- [ ] **Paso 2: verificación final.** `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:int`, `npm run test:e2e`. Esperado: todo en verde en los dos modos.

- [ ] **Paso 3: medir.** Con el banco del plan 4, comparar la página de zona antes y después de este paquete. Criterio del spec de presencia §5: el LCP no sube más de 100 ms ni el TBT más de 50 ms. Si se pasa, no cerrar el paquete: anotar la cifra y avisar al dueño.

- [ ] **Paso 4: commit y push** con mensaje `docs: quiz, mapa con tours y perfil de los tours`.
