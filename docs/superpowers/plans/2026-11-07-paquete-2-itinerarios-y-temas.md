# Paquete 2: itinerarios y páginas temáticas. Plan de implementación

> **Para agentes:** sub-skill requerida: usar superpowers:subagent-driven-development (recomendada) o
> superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** dos colecciones nuevas con página pública indexable, Itinerarios (planes de 1 a 7 días) y Temas (una
página por intención), enlazadas desde zona, portada, ficha, búsqueda y sitemap.

**Arquitectura:**
- **Mismo patrón que Artículos:** colección Payload con borradores, hooks de redirección, revalidación e índice;
  lectura pública y mapeo en `src/sitio/datos/`; página ISR con `NoEncontradoEnSuspense`.
- **Reglas puras en `src/dominio/`:** la lista de lugares de un tema y el resumen de tours de un itinerario.
- **Este plan se ejecuta después del plan 1.** Usa de él `TarjetaTour`, `toursLd`, `enlazarMenciones`, las preguntas
  frecuentes, `rutaZona` y `TarjetaLugar.servicios`.

**Stack:** Next.js 16.4.3 (App Router, ISR), Payload 3.92.1 (Postgres, Lexical), Vitest, Playwright.

**Spec:** `docs/specs/2026-11-07-paquete-2-itinerarios-y-temas-design.md` (aprobado).

## Restricciones globales

- **Las del plan 1**, en `docs/superpowers/plans/2026-11-07-paquete-1-fichas-y-articulos.md`: versiones, imports
  relativos, URLs solo desde `rutas.ts`, sin `push` de esquema, acceso negado por defecto, sin datos reales, ISR, máximo
  2 propiedades por evento, commits en español y push directo a `main`.
- **Contrato `v1`:** no cambia. El endpoint 8.2 sigue con artículos y eventos.
- **Colecciones y `sitio/`:** ninguna colección importa `src/sitio/datos/cacheadas`. El hook de `lugaresQueCoinciden` usa
  los lectores sin caché con `req.payload`.
- **Regla de idioma:** los textos de los días no deciden si el documento existe en un idioma.

---

## Mapa de archivos

### Reglas puras (`src/dominio/`)

| Archivo | Qué hace |
|---|---|
| `src/dominio/rutas.ts` (modificar) | `SEGMENTOS` suma `itinerarios`/`itineraries` y `temas`/`topics`. `rutas.itinerario` y `rutas.tema`. `TipoOg` suma `itinerario` y `tema`. |
| `src/dominio/slugs.ts` (modificar) | `SLUGS_RESERVADOS_ZONA` suma las cuatro palabras. |
| `src/dominio/idioma.ts` (modificar) | `CAMPOS_IDIOMA` y `CAMPOS_LOCALIZADOS` suman `itinerarios` (`titulo`, `slug`, `resumen`, `cuerpo`) y `temas` (`titulo`, `slug`, `resumen`, `introduccion`). |
| `src/dominio/temas.ts` (nuevo) | Tipo `CriteriosTema` (`zonaId`, `categoriaIds`, `caracteristicas`, `servicios`, `lugaresFijosIds`). `lugaresDeTema(criterios, { lugares, zonasActivasIds }, ahora)`: fijos, criterios con «y», sin repetir, máximo 24, orden de los listados (`ordenarListado`). `temaIndexable(n)` usa `UMBRAL_INDEXABLE`. **Única entrada:** `TarjetaTema` lleva `criterios: CriteriosTema`, y `hooks/temas.ts` normaliza el documento crudo a ese mismo tipo. |
| `src/dominio/etiquetas.ts` (modificar) | `etiqueta.itinerario` y `etiqueta.tema`; dos miembros de `ColeccionRevalidable`; dos casos en `etiquetasDeCambio`, que ya compara con `previousDoc` para los lugares citados. |
| `src/dominio/itinerarios.ts` (nuevo) | `clavesDeItinerario(dias)` (distintas, en orden), `lugaresDeParadas(dias)`, `paradaVisible(parada, hayLugar, hayTour)`. |
| `src/dominio/busqueda.ts` (modificar) | `TIPOS_BUSQUEDA` suma `itinerario` y `tema`; el grupo «Planes». |
| `src/dominio/presencia.ts` (modificar) | `tipoDePagina` sigue dando `otra`. Se agrega `clavesDePlan` si hace falta para `PresenciaTours`. |

### Esquema (Payload)

| Archivo | Cambio |
|---|---|
| `src/collections/Itinerarios.ts` (nuevo) | Campos de §2.2 más `autorNombre`, hooks como Artículos: `copiarNombreAutor`, `fechasDePublicacion`, `llenarLugaresCitados` adaptado, `hooksDeRedireccion`, `hooksDeRevalidacion('itinerarios')` y `hooksDeIndice('itinerario')`. Validación de parada solo con `req.locale === 'es'`. |
| `src/collections/Temas.ts` (nuevo) | Campos de §2.3 más `autorNombre`, las mismas familias de hooks. Campo virtual `lugaresQueCoinciden`. |
| `src/hooks/temas.ts` (nuevo) | El `afterRead` de `lugaresQueCoinciden`: sale de inmediato sin personal, normaliza a `CriteriosTema`, usa `lugaresPublicados(req.payload, l)` y `zonasActivas(req.payload, l)`, y memoriza en `req.context` la **Promesa** por idioma, porque Payload corre `afterRead` de todas las filas en paralelo. Validaciones de `tours`. |
| `src/hooks/articulos.ts` (modificar) | `llenarLugaresCitados` acepta un extractor, para reusarlo con las paradas. `copiarNombreAutor` se mueve aquí desde `Articulos.ts` y se exporta. |
| `src/redirecciones/plugin.ts`, `hooks.ts` | Suman las dos colecciones y sus destinos al retirar (zona, o portada sin zona). |
| `src/busqueda/filas.ts`, `indexar.ts`, `hooks.ts`, `reindexar.ts` | Filas de los dos tipos: título, resumen, títulos de día y notas. `tipo` desconocido deja de caer en categoría. |
| `src/payload.config.ts` | Registra las dos colecciones. |
| `src/migrations/*`, `src/payload-types.ts`, `importMap.js` | Regenerados. Se revisa `scripts/migraciones/busqueda.ts.txt`. |

### Datos públicos (`src/sitio/datos/`)

| Archivo | Cambio |
|---|---|
| `tipos.ts` | `TarjetaItinerario`, `FichaItinerario`, `TarjetaTema` y `FichaTema`; las tarjetas llevan `clavesTours`. |
| `mapeo.ts` | `itinerarioDe`, `fichaItinerarioDe`, `temaDe` y `fichaTemaDe`. |
| `lecturas/itinerarios.ts`, `lecturas/temas.ts` (nuevos) | Lecturas públicas con `opcionesPublicas`. |
| `llaves.ts`, `cacheadas.ts` | Llaves y lecturas cacheadas: `itinerariosCacheados`, `temasCacheados`, `fichaItinerarioCacheada` y `fichaTemaCacheada`. |
| `consultas.ts` | `planesDeZona(itinerarios, temas, zonaId, listas)`, `planesQueCitan(lugarId, ...)` y `temaParaFiltro(...)`. `ItemDestacado` y `destacados()` suman los dos tipos. `resolutorDeCuerpo` recibe también las listas de itinerarios y temas, para que un enlace interno a ellos no quede como texto. |

### Páginas y UI

| Archivo | Qué hace |
|---|---|
| `src/app/(sitio)/[lang]/guia/itinerarios/[slug]/page.tsx` (nuevo) | La página del itinerario, ISR. Resuelve los tours **una sola vez** y emite un solo `toursLd`. A `CuerpoRico` le pasa `piezaTours="itinerario-{slug}"` y `origenTours="itinerario"`. |
| `src/app/(sitio)/[lang]/guia/temas/[slug]/page.tsx` (nuevo) | La página del tema, ISR. A `CuerpoRico` le pasa `piezaTours="tema-{slug}"` y `origenTours="tema"`. |
| `src/sitio/ui/itinerario/DiaItinerario.tsx` (nuevo) | Un día con sus paradas. Recibe los tours ya resueltos y pinta `TarjetaTour` directo; `BloqueTour` solo se reusa a través de `CuerpoRico`. |
| `src/sitio/ui/itinerario/ToursDelPlan.tsx` (nuevo) | Recibe los tours ya resueltos por la página y pinta `TarjetaTour` y el **único** `toursLd` de la página. Lo usan el itinerario («Reserva los tours de este plan») y el tema («Tours para este plan»). |
| `src/sitio/ui/tarjetas/TarjetaPlan.tsx` (nuevo) | La tarjeta de itinerario o tema. |
| `src/sitio/ui/SeccionPlanes.tsx` (nuevo) | «Planes en {zona}» y «Planes en la Baja». |
| `src/sitio/contexto.ts` | Resuelve los dos tipos: documento en el otro idioma y zona. |
| `src/sitio/ui/presencia/PresenciaTours.tsx` | Pone primero las claves del plan. |
| `src/sitio/seo/jsonld.ts` | `itinerarioLd` (`TouristTrip` con `itinerary`). |
| `src/sitio/seo/sitemap.ts`, `src/app/(sitio)/guia-sitemap.xml/route.ts` | Entradas indexables de los dos tipos. `DatosIdioma` suma las dos listas. La indexabilidad del tema sale de `lugaresDeTema`, no de `!noIndexar` solo. |
| `src/sitio/seo/og.ts`, ruta OG bajo `src/app/(sitio)/` (`datosOg`) | `SEGMENTOS_OG` y los datos de `itinerario` y `tema`. |
| `src/sitio/ui/navegacion/destino.ts` | Los dos tipos usan el esqueleto `'articulo'`, en vez de caer en `'categoriaEnZona'`. |
| `[zona]/page.tsx`, `guia/page.tsx`, `lugares/[slug]/page.tsx` | Sección de planes, «Planes en la Baja», y «Aparece en» con planes. `Destacada` y `aDiapositiva` aceptan los dos tipos; un itinerario toma su `categoriaIds` vacío y usa el color por defecto. |
| `src/sitio/paginas/CategoriaEnZona.tsx` (variante con filtros) | Aviso «Hay una guía sobre esto». |
| `buscar/page.tsx`, `buscar/sugerencias/route.ts` | Tipos nuevos en `visibles` y en el armado de URLs. |
| `src/sitio/ui/ToursEnZona.tsx`, `src/sitio/analitica` | Orígenes `itinerario` y `tema`. |
| `src/sitio/textos.ts`, `src/sitio/estilos/*.css` | Textos es/en y estilos. |

### Seed, pruebas y documentación

| Archivo | Cambio |
|---|---|
| `src/seed/datos.ts`, `index.ts`, `vaciar.ts` | Un itinerario de 2 días, un tema indexable y un tema sin zona con menos de 3 lugares. |
| `tests/unit/temas.test.ts`, `itinerarios.test.ts`, `etiquetas.test.ts` (nuevos o ampliados); `contexto.test.ts`, `sitemap`, `rutas-publicas`, `filas-busqueda`, `esqueletos.test.ts` y `ficha-lugar.test.ts` (modificar; `ficha-lugar` suma `itinerariosCacheados` y `temasCacheados` a su mock) | Lo de §5 del spec. |
| `tests/int/paquete-2.int.test.ts` (nuevo) | Validaciones, hooks, acceso, indexado, sugerencias, redirecciones, campos localizados en listas y restaurar versiones. |
| `tests/e2e/paquete-2.spec.ts` (nuevo) | Lo de §5 del spec, en los dos modos. |
| `docs/specs/2026-10-30-guia-baja-design.md`, `docs/editores/escribir-para-buscadores.md` | Secciones 6, 7, 9, 10 y 13, y la guía de editores. |

### Dependencias

- `dominio/*` no importa `sitio/` ni `collections/`.
- `collections/*` y `hooks/*` importan de `dominio/` y de `sitio/datos/lecturas/*`. Solo `hooks/temas.ts` usa esas
  lecturas, que reciben `payload` por argumento y no importan `payload.config`. Nunca importan `cacheadas`.

<!-- arch-critic: APPROVED -->

---

<!-- plan-critic: APPROVED -->

## Tareas

Antes de empezar: el plan 1 tiene que estar implementado. Este plan usa `TarjetaTour`, `toursLd`, `enlazarMenciones`, `candidatosMencion`, `PreguntasFrecuentes`, `rutaZona` del selector, `origenTours` de `CuerpoRico` y `TarjetaLugar.servicios`.

Commits en español, terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, con push directo a `main`.

### Tarea 1: rutas, slugs, idioma y etiquetas

**Archivos:**
- Modificar: `src/dominio/rutas.ts`, `src/dominio/slugs.ts`, `src/dominio/idioma.ts`, `src/dominio/etiquetas.ts`, `src/sitio/seo/og.ts`
- Prueba: `tests/unit/rutas-publicas.test.ts`, `tests/unit/etiquetas.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan.** En `tests/unit/rutas-publicas.test.ts` (o el archivo que ya pruebe `resolverRutaPublica`):

```ts
it('traduce los segmentos nuevos del inglés al árbol en español', () => {
  expect(resolverRutaPublica('/en/guide/itineraries/x', new URLSearchParams())).toEqual({ tipo: 'reescribir', destino: '/en/guia/itinerarios/x' })
  expect(resolverRutaPublica('/en/guide/topics/x', new URLSearchParams())).toEqual({ tipo: 'reescribir', destino: '/en/guia/temas/x' })
})
it('el segmento del otro idioma da 404', () => {
  expect(resolverRutaPublica('/es/guia/itineraries/x', new URLSearchParams())).toEqual({ tipo: 'noEncontrado', lang: 'es' })
})
```

En `tests/unit/etiquetas.test.ts`:

```ts
it('itinerarios: su etiqueta, listados, zona y lugares citados de antes y de ahora', () => {
  const t = etiquetasDeCambio('itinerarios', { id: 1, zona: 2, lugaresCitados: [3] }, { id: 1, zona: 2, lugaresCitados: [4] })
  expect(t).toEqual(expect.arrayContaining(['itinerario:1', 'listados', 'zona:2', 'lugar:3', 'lugar:4']))
})
it('temas: su etiqueta, listados, zona y lugares fijos', () => {
  const t = etiquetasDeCambio('temas', { id: 1, zona: 2, lugaresFijos: [3] }, null)
  expect(t).toEqual(expect.arrayContaining(['tema:1', 'listados', 'zona:2', 'lugar:3']))
})
```

- [ ] **Paso 2: correrlas y ver que fallan.**

- [ ] **Paso 3: implementar.**

`src/dominio/rutas.ts`: agregar a `SEGMENTOS.es` `itinerarios: 'itinerarios', temas: 'temas'`; a `SEGMENTOS.en` `itinerarios: 'itineraries', temas: 'topics'`; a `TipoOg` `'itinerario' | 'tema'`; a `rutas`:

```ts
  itinerario: (l: Locale, slug: string) => `${base(l)}/${SEGMENTOS[l].itinerarios}/${slug}`,
  tema: (l: Locale, slug: string) => `${base(l)}/${SEGMENTOS[l].temas}/${slug}`,
```

`src/dominio/slugs.ts`: agregar `'itinerarios', 'itineraries', 'temas', 'topics'` a `SLUGS_RESERVADOS_ZONA`.

`src/dominio/idioma.ts`: a `CAMPOS_IDIOMA`, `itinerarios: ['titulo', 'slug', 'resumen', 'cuerpo']` y `temas: ['titulo', 'slug', 'resumen', 'introduccion']`; a `CAMPOS_LOCALIZADOS`, las mismas listas.

`src/dominio/etiquetas.ts`: a `etiqueta`, `itinerario: (id: Id) => \`itinerario:${id}\`` y `tema: (id: Id) => \`tema:${id}\``; a `ColeccionRevalidable`, `'itinerarios' | 'temas'`; al `switch`:

```ts
    case 'itinerarios':
      agregar('id', etiqueta.itinerario)
      t.add(etiqueta.listados)
      agregar('zona', etiqueta.zona)
      agregar('lugaresCitados', etiqueta.lugar)
      break
    case 'temas':
      agregar('id', etiqueta.tema)
      t.add(etiqueta.listados)
      agregar('zona', etiqueta.zona)
      agregar('lugaresFijos', etiqueta.lugar)
      break
```

`src/sitio/seo/og.ts`: a `SEGMENTOS_OG`, `itinerario: 1, tema: 1`.

- [ ] **Paso 4: correrlas y ver que pasan.**

- [ ] **Paso 5: commit** con mensaje `feat: rutas y etiquetas de itinerarios y temas`.

### Tarea 2: reglas puras

**Archivos:**
- Crear: `src/dominio/temas.ts`, `src/dominio/itinerarios.ts`
- Prueba: `tests/unit/temas.test.ts`, `tests/unit/itinerarios.test.ts`

**Interfaces:**
- Produce:
  - `type CriteriosTema = { zonaId: number | null; categoriaIds: number[]; caracteristicas: string[]; servicios: string[]; lugaresFijosIds: number[] }`
  - `lugaresDeTema(criterios: CriteriosTema, listas: { lugares: TarjetaLugar[]; zonasActivasIds: readonly number[] }, ahora: Date): TarjetaLugar[]`
  - `temaIndexable(n: number): boolean`
  - `MAX_LUGARES_TEMA = 24`
  - `type Parada = { hora: string | null; lugarId: number | null; tour: string | null; nota: string | null }`, `type Dia = { titulo: string | null; paradas: Parada[] }`
  - `clavesDeItinerario(dias: Dia[]): string[]`, `lugaresDeParadas(dias: Dia[]): number[]`, `paradaVisible(p: { nota: string | null }, hayLugar: boolean, hayTour: boolean): boolean`, `paradasValidas(dias: unknown, locale: string | undefined): true | string`.

- [ ] **Paso 1: escribir las pruebas que fallan**

```ts
// tests/unit/temas.test.ts
import { describe, expect, it } from 'vitest'

import type { TarjetaLugar } from '../../src/sitio/datos/tipos'
import { lugaresDeTema, temaIndexable, type CriteriosTema } from '../../src/dominio/temas'

const sinP = { activo: false, desde: null, hasta: null }
const l = (id: number, extra: Partial<TarjetaLugar> = {}) => ({
  id, nombre: `L${id}`, zonaId: 1, categoriaIds: [1], caracteristicas: [], servicios: [], patrocinio: sinP, orden: 100, ...extra,
}) as TarjetaLugar
const c = (extra: Partial<CriteriosTema> = {}): CriteriosTema => ({ zonaId: 1, categoriaIds: [], caracteristicas: [], servicios: [], lugaresFijosIds: [], ...extra })
const ahora = new Date('2026-11-08T12:00:00Z')
const lista = (lugares: TarjetaLugar[], crit: CriteriosTema) => lugaresDeTema(crit, { lugares, zonasActivasIds: [1, 2] }, ahora).map((x) => x.id)

describe('lugaresDeTema', () => {
  it('los fijos van primero y en su orden', () => {
    expect(lista([l(1), l(2), l(3)], c({ lugaresFijosIds: [3, 1] }))).toEqual([3, 1])
  })
  it('sin criterios: solo los fijos', () => expect(lista([l(1), l(2)], c())).toEqual([]))
  it('categorías con «o» y características con «y», combinadas', () => {
    const ls = [l(1, { categoriaIds: [1], caracteristicas: ['para-ninos'] }), l(2, { categoriaIds: [2], caracteristicas: ['para-ninos', 'con-comida'] }), l(3, { categoriaIds: [3], caracteristicas: ['para-ninos'] })]
    expect(lista(ls, c({ categoriaIds: [1, 2], caracteristicas: ['para-ninos'] }))).toEqual([1, 2])
    expect(lista(ls, c({ categoriaIds: [1, 2], caracteristicas: ['para-ninos', 'con-comida'] }))).toEqual([2])
  })
  it('servicios con «y»', () => {
    expect(lista([l(1, { servicios: ['sombra'] }), l(2, { servicios: ['sombra', 'banos'] })], c({ servicios: ['sombra', 'banos'] }))).toEqual([2])
  })
  it('no repite un fijo que también cumple los criterios', () => {
    expect(lista([l(1, { categoriaIds: [1] }), l(2, { categoriaIds: [1] })], c({ lugaresFijosIds: [2], categoriaIds: [1] }))).toEqual([2, 1])
  })
  it('respeta la zona', () => {
    expect(lista([l(1, { categoriaIds: [1] }), l(2, { categoriaIds: [1], zonaId: 2 })], c({ categoriaIds: [1] }))).toEqual([1])
  })
  it('sin zona: todas las activas', () => {
    expect(lista([l(1, { categoriaIds: [1] }), l(2, { categoriaIds: [1], zonaId: 2 }), l(3, { categoriaIds: [1], zonaId: 9 })], c({ zonaId: null, categoriaIds: [1] }))).toEqual([1, 2])
  })
  it('máximo 24', () => {
    const ls = Array.from({ length: 30 }, (_, i) => l(i + 1, { categoriaIds: [1] }))
    expect(lista(ls, c({ categoriaIds: [1] }))).toHaveLength(24)
  })
  it('el patrocinio vigente sube, como en los listados', () => {
    const vigente = { activo: true, desde: '2026-01-01', hasta: '2027-01-01' }
    expect(lista([l(1, { categoriaIds: [1] }), l(2, { categoriaIds: [1], patrocinio: vigente })], c({ categoriaIds: [1] }))[0]).toBe(2)
  })
  it('un fijo que no existe en el idioma se omite', () => expect(lista([l(1)], c({ lugaresFijosIds: [9, 1] }))).toEqual([1]))
})

describe('temaIndexable', () => {
  it('desde 3', () => {
    expect(temaIndexable(2)).toBe(false)
    expect(temaIndexable(3)).toBe(true)
  })
})
```

```ts
// tests/unit/itinerarios.test.ts
import { describe, expect, it } from 'vitest'

import { clavesDeItinerario, lugaresDeParadas, paradasValidas, paradaVisible, type Dia } from '../../src/dominio/itinerarios'

const p = (extra: Partial<Dia['paradas'][number]> = {}) => ({ hora: null, lugarId: null, tour: null, nota: null, ...extra })
const dias: Dia[] = [
  { titulo: 'Uno', paradas: [p({ tour: 'servicio:a', lugarId: 1 }), p({ tour: 'servicio:b' })] },
  { titulo: null, paradas: [p({ tour: 'servicio:a', lugarId: 2 }), p({ lugarId: 1 })] },
]

describe('itinerarios', () => {
  it('claves distintas en orden', () => expect(clavesDeItinerario(dias)).toEqual(['servicio:a', 'servicio:b']))
  it('lugares distintos en orden', () => expect(lugaresDeParadas(dias)).toEqual([1, 2]))
  it('parada visible', () => {
    expect(paradaVisible({ nota: null }, false, false)).toBe(false)
    expect(paradaVisible({ nota: 'x' }, false, false)).toBe(true)
    expect(paradaVisible({ nota: null }, true, false)).toBe(true)
    expect(paradaVisible({ nota: null }, false, true)).toBe(true)
  })
})

describe('paradasValidas', () => {
  const vacia = [{ paradas: [{ hora: null, lugar: null, tour: null, nota: null }] }]
  it('parada vacía en es: rechazada', () => expect(paradasValidas(vacia, 'es')).not.toBe(true))
  it('en en pasa: la nota está localizada', () => expect(paradasValidas(vacia, 'en')).toBe(true))
  it('con lugar, tour o nota en es: válida', () => {
    expect(paradasValidas([{ paradas: [{ lugar: 1 }] }], 'es')).toBe(true)
    expect(paradasValidas([{ paradas: [{ tour: 'servicio:a' }] }], 'es')).toBe(true)
    expect(paradasValidas([{ paradas: [{ nota: 'x' }] }], 'es')).toBe(true)
  })
})
```

- [ ] **Paso 2: correrlas y ver que fallan.**

- [ ] **Paso 3: implementar**

```ts
// src/dominio/temas.ts
import type { TarjetaLugar } from '../sitio/datos/tipos'
import { ordenarListado } from './orden'
import { UMBRAL_INDEXABLE } from './umbrales'

export const MAX_LUGARES_TEMA = 24

// Única entrada de la lista de un tema (spec del paquete 2 §2.3): la usan la página, el sitemap, «Aparece en» y el admin.
export type CriteriosTema = { zonaId: number | null; categoriaIds: number[]; caracteristicas: string[]; servicios: string[]; lugaresFijosIds: number[] }

const hayCriterios = (c: CriteriosTema) => c.categoriaIds.length > 0 || c.caracteristicas.length > 0 || c.servicios.length > 0

export function lugaresDeTema(c: CriteriosTema, listas: { lugares: TarjetaLugar[]; zonasActivasIds: readonly number[] }, ahora: Date): TarjetaLugar[] {
  const porId = new Map(listas.lugares.map((l) => [l.id, l]))
  const fijos = c.lugaresFijosIds.map((id) => porId.get(id)).filter((l): l is TarjetaLugar => Boolean(l))
  if (!hayCriterios(c)) return fijos.slice(0, MAX_LUGARES_TEMA)
  const yaFijos = new Set(fijos.map((l) => l.id))
  const cumplen = listas.lugares.filter((l) => {
    if (yaFijos.has(l.id)) return false
    if (c.zonaId !== null ? l.zonaId !== c.zonaId : !listas.zonasActivasIds.includes(l.zonaId)) return false
    if (c.categoriaIds.length && !c.categoriaIds.some((id) => l.categoriaIds.includes(id))) return false
    if (!c.caracteristicas.every((x) => l.caracteristicas.includes(x))) return false
    return c.servicios.every((x) => l.servicios.includes(x))
  })
  return [...fijos, ...ordenarListado(cumplen, ahora)].slice(0, MAX_LUGARES_TEMA)
}

export const temaIndexable = (n: number): boolean => n >= UMBRAL_INDEXABLE
```

`temas.ts` importa el tipo `TarjetaLugar` con `import type`, que se borra al compilar: `dominio/` no depende en ejecución de `sitio/`. Verificar en `src/dominio/orden.ts` la firma real de `ordenarListado` y ajustar la llamada si difiere.

```ts
// src/dominio/itinerarios.ts
export type Parada = { hora: string | null; lugarId: number | null; tour: string | null; nota: string | null }
export type Dia = { titulo: string | null; paradas: Parada[] }

export function clavesDeItinerario(dias: Dia[]): string[] {
  return [...new Set(dias.flatMap((d) => d.paradas.flatMap((p) => (p.tour ? [p.tour] : []))))]
}

export function lugaresDeParadas(dias: Dia[]): number[] {
  return [...new Set(dias.flatMap((d) => d.paradas.flatMap((p) => (p.lugarId !== null ? [p.lugarId] : []))))]
}

export const paradaVisible = (p: { nota: string | null }, hayLugar: boolean, hayTour: boolean): boolean => hayLugar || hayTour || Boolean(p.nota)

// Spec del paquete 2 §2.2: solo se valida al guardar en español. En inglés una parada con nota sin traducir pasa: la
// página la oculta, y una corrección en otro campo no debe quedar bloqueada.
export function paradasValidas(dias: unknown, locale: string | undefined): true | string {
  if (locale !== 'es' || !Array.isArray(dias)) return true
  for (const d of dias as { paradas?: { lugar?: unknown; tour?: unknown; nota?: unknown }[] }[]) {
    for (const p of d.paradas ?? []) {
      if (!p.lugar && !p.tour && !p.nota) return 'Cada parada necesita un lugar, un tour o una nota.'
    }
  }
  return true
}
```

- [ ] **Paso 4: correrlas y ver que pasan.**

- [ ] **Paso 5: commit** con mensaje `feat: reglas puras de itinerarios y temas`.

### Tarea 3: colecciones

**Archivos:**
- Crear: `src/collections/Itinerarios.ts`, `src/collections/Temas.ts`, `src/hooks/temas.ts`
- Modificar: `src/hooks/articulos.ts`, `src/collections/Articulos.ts`, `src/redirecciones/hooks.ts`, `src/redirecciones/plugin.ts`, `src/payload.config.ts`, `src/seed/vaciar.ts`, `tests/int/utils.ts`, `src/dominio/busqueda.ts`, `src/busqueda/indexar.ts`, `src/sitio/textos.ts`, `src/app/(sitio)/[lang]/guia/buscar/page.tsx`, `src/app/(sitio)/[lang]/guia/buscar/sugerencias/route.ts`
- Regenerar: `src/migrations/*`, `src/payload-types.ts`, `src/app/(payload)/admin/importMap.js`
- Prueba: `tests/int/paquete-2.int.test.ts`

- [ ] **Paso 1: escribir la prueba de integración que falla**

```ts
// tests/int/paquete-2.int.test.ts
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { lugaresDeTema } from '../../src/dominio/temas'
import { lugaresPublicados } from '../../src/sitio/datos/lecturas/lugares'
import { zonasActivas } from '../../src/sitio/datos/lecturas/zonas'
import { crearCategoria, crearImagen, crearLugar, crearUsuario, crearZona, lexical, limpiar, obtenerPayload } from './utils'

// Registra las etiquetas que revalidan los hooks (fuera de Next, revalidateTag lanza).
const revalidadas = vi.hoisted(() => [] as string[])
vi.mock('next/cache', async (original) => ({
  ...(await original<typeof import('next/cache')>()),
  revalidateTag: (etiqueta: string) => { revalidadas.push(etiqueta) },
}))

let payload: Payload

async function base() {
  const zona = await crearZona(payload, { activa: true, sedeSlug: 'la-paz' })
  const categoria = await crearCategoria(payload)
  const foto = await crearImagen(payload)
  const autor = await crearUsuario(payload, 'editor')
  const lugar = await crearLugar(payload, { zona: zona.id, categorias: [categoria.id], foto: foto.id, slugEs: 'playa' })
  return { zona, categoria, foto, autor, lugar }
}

const datosItinerario = (b: Awaited<ReturnType<typeof base>>, dias: unknown[]) => ({
  titulo: 'Plan', resumen: 'R', cuerpo: lexical('Intro'), zona: b.zona.id, autor: b.autor.id, dias, _status: 'published' as const,
})

describe('itinerarios', () => {
  beforeAll(async () => { payload = await obtenerPayload() })
  beforeEach(async () => { await limpiar(payload) })

  it('parada vacía: rechazada al guardar en es', async () => {
    const b = await base()
    await expect(payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: datosItinerario(b, [{ titulo: 'D', paradas: [{ hora: '08:00' }] }]) as never })).rejects.toThrow()
  })

  it('parada con nota solo en español: el guardado en en pasa', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: datosItinerario(b, [{ titulo: 'D', paradas: [{ nota: 'Solo en español' }] }]) as never })
    await expect(payload.update({ collection: 'itinerarios', id: doc.id, locale: 'en', overrideAccess: true, data: { titulo: 'Plan', resumen: 'S', cuerpo: lexical('Intro'), _status: 'published' } as never })).resolves.toBeTruthy()
  })

  it('hora inválida: rechazada', async () => {
    const b = await base()
    await expect(payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: datosItinerario(b, [{ paradas: [{ hora: '25:99', nota: 'x' }] }]) as never })).rejects.toThrow()
  })

  it('lugaresCitados sale de las paradas y copia el autor', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, depth: 0, data: datosItinerario(b, [{ paradas: [{ lugar: b.lugar.id }] }]) as never })
    expect(doc.lugaresCitados).toEqual([b.lugar.id])
    expect(doc.autorNombre).toBeTruthy()
  })

  it('campos localizados dentro de listas: sobreviven a editar y reordenar', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, depth: 0, data: datosItinerario(b, [{ titulo: 'Uno', paradas: [{ nota: 'nota uno' }] }, { titulo: 'Dos', paradas: [{ nota: 'nota dos' }] }]) as never })
    const leerEs = () => payload.findByID({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, depth: 0 })
    const es = await leerEs()
    await payload.update({
      collection: 'itinerarios', id: doc.id, locale: 'en', overrideAccess: true, depth: 0,
      data: { titulo: 'Plan', resumen: 'S', cuerpo: lexical('Intro'), _status: 'published', dias: es.dias!.map((d, i) => ({ id: d.id, titulo: `Day ${i + 1}`, paradas: d.paradas!.map((p) => ({ id: p.id, nota: `note ${i + 1}` })) })) } as never,
    })
    const invertidos = [...es.dias!].reverse()
    await payload.update({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, depth: 0, data: { dias: [...invertidos, { titulo: 'Tres', paradas: [{ nota: 'nota tres' }] }], _status: 'published' } as never })
    const final = await leerEs()
    expect(final.dias!.map((d) => d.titulo)).toEqual(['Dos', 'Uno', 'Tres'])
    const en = await payload.findByID({ collection: 'itinerarios', id: doc.id, locale: 'en', overrideAccess: true, depth: 0, fallbackLocale: false })
    expect(en.dias!.slice(0, 2).map((d) => d.titulo)).toEqual(['Day 2', 'Day 1'])
    expect(en.dias![0].paradas![0].nota).toBe('note 2')
  })

  it('restaurar una versión conserva los dos idiomas', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, depth: 0, data: datosItinerario(b, [{ titulo: 'Uno', paradas: [{ nota: 'n' }] }]) as never })
    const es = await payload.findByID({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, depth: 0 })
    await payload.update({ collection: 'itinerarios', id: doc.id, locale: 'en', overrideAccess: true, depth: 0, data: { titulo: 'Plan', resumen: 'S', cuerpo: lexical('I'), _status: 'published', dias: es.dias!.map((d) => ({ id: d.id, titulo: 'Day', paradas: d.paradas })) } as never })
    const { docs: versiones } = await payload.findVersions({ collection: 'itinerarios', where: { parent: { equals: doc.id } }, overrideAccess: true, sort: '-updatedAt', limit: 1 })
    await payload.update({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, data: { titulo: 'Cambiado', _status: 'published' } as never })
    await payload.restoreVersion({ collection: 'itinerarios', id: versiones[0].id, overrideAccess: true })
    const en = await payload.findByID({ collection: 'itinerarios', id: doc.id, locale: 'en', overrideAccess: true, depth: 0, fallbackLocale: false })
    expect(en.dias![0].titulo).toBe('Day')
    const esRestaurado = await payload.findByID({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, depth: 0, fallbackLocale: false })
    expect(esRestaurado.titulo).toBe('Plan')
    expect(esRestaurado.dias![0].titulo).toBe('Uno')
  })

  it('límites: hasta 7 días y 8 paradas por día', async () => {
    const b = await base()
    const parada = { nota: 'x' }
    await expect(payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: datosItinerario(b, Array.from({ length: 8 }, () => ({ paradas: [parada] }))) as never })).rejects.toThrow()
    await expect(payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: datosItinerario(b, [{ paradas: Array.from({ length: 9 }, () => parada) }]) as never })).rejects.toThrow()
    await expect(payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: datosItinerario(b, Array.from({ length: 7 }, () => ({ paradas: Array.from({ length: 8 }, () => parada) }))) as never })).resolves.toBeTruthy()
  })

  it('lugaresCitados conserva lo citado en el otro idioma', async () => {
    const b = await base()
    const cuerpo = lexical('Intro')
    cuerpo.root.children.push({ type: 'block', version: 2, format: '', fields: { id: 'b1', blockName: '', blockType: 'tarjetaLugar', lugar: b.lugar.id } } as never)
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, depth: 0, data: { ...datosItinerario(b, [{ paradas: [{ nota: 'x' }] }]), cuerpo } as never })
    const en = await payload.update({ collection: 'itinerarios', id: doc.id, locale: 'en', overrideAccess: true, depth: 0, data: { titulo: 'Plan', resumen: 'S', cuerpo: lexical('Intro'), _status: 'published' } as never })
    expect(en.lugaresCitados).toEqual([b.lugar.id])
  })

  it('quitar un lugar de una parada revalida su ficha', async () => {
    const b = await base()
    const otro = await crearLugar(payload, { zona: b.zona.id, categorias: [b.categoria.id], foto: b.foto.id, slugEs: 'otra' })
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, depth: 0, data: datosItinerario(b, [{ paradas: [{ lugar: b.lugar.id }] }]) as never })
    revalidadas.length = 0
    await payload.update({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, depth: 0, data: { dias: [{ paradas: [{ lugar: otro.id }] }], _status: 'published' } as never })
    expect(revalidadas).toContain(`lugar:${b.lugar.id}`)
    expect(revalidadas).toContain(`lugar:${otro.id}`)
  })

  it('el público no lee borradores', async () => {
    const b = await base()
    await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, draft: true, data: { ...datosItinerario(b, [{ paradas: [{ nota: 'x' }] }]), _status: 'draft' } as never })
    const { docs } = await payload.find({ collection: 'itinerarios', overrideAccess: false })
    expect(docs).toHaveLength(0)
  })

  it('cambiar el slug crea la redirección', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: { ...datosItinerario(b, [{ paradas: [{ nota: 'x' }] }]), slug: 'viejo' } as never })
    await payload.update({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, data: { slug: 'nuevo' } as never })
    const { docs } = await payload.find({ collection: 'redirects', where: { from: { equals: '/es/guia/itinerarios/viejo' } }, overrideAccess: true })
    expect(docs).toHaveLength(1)
  })
})

describe('temas', () => {
  beforeAll(async () => { payload = await obtenerPayload() })
  beforeEach(async () => { await limpiar(payload) })

  const datosTema = (b: Awaited<ReturnType<typeof base>>, extra: Record<string, unknown> = {}) => ({
    titulo: 'Tema', resumen: 'R', introduccion: lexical('Intro'), autor: b.autor.id, zona: b.zona.id, _status: 'published' as const, ...extra,
  })

  it('tour en zona sin sede: rechazado', async () => {
    const b = await base()
    const sinSede = await crearZona(payload, { activa: true })
    await expect(payload.create({ collection: 'temas', locale: 'es', overrideAccess: true, data: datosTema(b, { tours: [{ zona: sinSede.id, tour: 'servicio:a' }] }) as never })).rejects.toThrow()
    await expect(payload.create({ collection: 'temas', locale: 'es', overrideAccess: true, data: datosTema(b, { tours: [{ zona: b.zona.id, tour: 'servicio:a' }] }) as never })).resolves.toBeTruthy()
  })

  it('lugaresQueCoinciden: no llega al público y sí al personal', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'temas', locale: 'es', overrideAccess: true, data: datosTema(b, { lugaresFijos: [b.lugar.id] }) as never })
    const publico = await payload.findByID({ collection: 'temas', id: doc.id, overrideAccess: false })
    expect(publico.lugaresQueCoinciden).toBeUndefined()
    const usuario = await crearUsuario(payload, 'admin')
    const personal = await payload.findByID({ collection: 'temas', id: doc.id, overrideAccess: false, user: usuario, locale: 'es' })
    expect(personal.lugaresQueCoinciden).toContain('es: 1')
  })

  it('lugaresQueCoinciden: sin personal no lee ningún lugar', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'temas', locale: 'es', overrideAccess: true, data: datosTema(b, { lugaresFijos: [b.lugar.id] }) as never })
    const espia = vi.spyOn(payload, 'find')
    await payload.findByID({ collection: 'temas', id: doc.id, overrideAccess: false })
    expect(espia.mock.calls.filter(([a]) => a.collection === 'lugares')).toHaveLength(0)
    espia.mockRestore()
  })

  it('lugaresQueCoinciden cuenta lo mismo que la lista pública que usa el sitemap', async () => {
    const b = await base()
    const otros = await Promise.all(['dos', 'tres'].map((slugEs) => crearLugar(payload, { zona: b.zona.id, categorias: [b.categoria.id], foto: b.foto.id, slugEs })))
    const fijos = [b.lugar.id, ...otros.map((l) => l.id)]
    const doc = await payload.create({ collection: 'temas', locale: 'es', overrideAccess: true, data: datosTema(b, { lugaresFijos: fijos }) as never })
    const usuario = await crearUsuario(payload, 'admin')
    const personal = await payload.findByID({ collection: 'temas', id: doc.id, overrideAccess: false, user: usuario, locale: 'es' })
    expect(personal.lugaresQueCoinciden).toContain('es: 3, se indexa')
    const [lugares, zonas] = await Promise.all([lugaresPublicados(payload, 'es'), zonasActivas(payload, 'es')])
    const criterios = { zonaId: b.zona.id, categoriaIds: [], caracteristicas: [], servicios: [], lugaresFijosIds: fijos }
    expect(lugaresDeTema(criterios, { lugares, zonasActivasIds: zonas.map((z) => z.id) }, new Date())).toHaveLength(3)
  })

  it('límite: hasta 6 tours', async () => {
    const b = await base()
    const tours = Array.from({ length: 7 }, (_, i) => ({ zona: b.zona.id, tour: `servicio:a${i}` }))
    await expect(payload.create({ collection: 'temas', locale: 'es', overrideAccess: true, data: datosTema(b, { tours }) as never })).rejects.toThrow()
  })
})
```

Si `crearZona` de `tests/int/utils.ts` exige `sedeSlug` o el `crearUsuario` usa otro argumento, adaptar la llamada a lo que el helper acepte.

- [ ] **Paso 2: correrla y ver que falla.** `npm run test:int -- paquete-2`.

- [ ] **Paso 3: hooks compartidos.** En `src/hooks/articulos.ts`:

Mover `copiarNombreAutor` desde `src/collections/Articulos.ts` (exportada) e importarla en `Articulos.ts`.

Convertir `llenarLugaresCitados` en una fábrica sin cambiar el comportamiento de artículos:

```ts
type OpcionesCitados = {
  coleccion: 'articulos' | 'itinerarios'
  // Ids que no vienen del cuerpo y no están localizados (las paradas de un itinerario).
  extra?: (datos: Record<string, unknown>) => number[]
}

export function crearLlenarLugaresCitados({ coleccion, extra }: OpcionesCitados): CollectionBeforeChangeHook {
  return async ({ collection, data, originalDoc, req }) => {
    // … el cuerpo actual de llenarLugaresCitados, con dos cambios:
    // 1. `query: { collection: coleccion, locale: 'all', … }` en lugar de 'articulos'.
    // 2. antes de «Un bloque Lexical no limpia su referencia», agregar:
    //    extra?.({ ...originalDoc, ...data }).forEach((id) => ids.add(id))
  }
}

export const llenarLugaresCitados = crearLlenarLugaresCitados({ coleccion: 'articulos' })
```

- [ ] **Paso 4: Itinerarios**

```ts
// src/collections/Itinerarios.ts
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { ValidationError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { lecturaPublicaPublicada, soloPersonal } from '../acceso/reglas'
import { bloquesArticulo } from '../bloques/articulo'
import { hooksDeIndice } from '../busqueda/hooks'
import { camposDestacado } from '../campos/destacado'
import { camposSeo } from '../campos/seo'
import { campoSlug } from '../campos/slug'
import { CAMPOS_IDIOMA, CAMPOS_LOCALIZADOS } from '../dominio/idioma'
import { idDe } from '../dominio/lexical'
import { paradasValidas } from '../dominio/itinerarios'
import { esClaveDeTour } from '../dominio/presencia'
import { rutas } from '../dominio/rutas'
import { copiarNombreAutor, crearLlenarLugaresCitados, fechasDePublicacion } from '../hooks/articulos'
import { destinoAlRetirarPlan, hooksDeRedireccion } from '../redirecciones/hooks'
import { hooksDeRevalidacion } from '../revalidacion/hooks'

const revalidacion = hooksDeRevalidacion('itinerarios')
const indice = hooksDeIndice('itinerario')
const redireccion = hooksDeRedireccion({
  coleccion: 'itinerarios',
  camposIdioma: CAMPOS_IDIOMA.itinerarios,
  camposLocalizados: CAMPOS_LOCALIZADOS.itinerarios,
  rutaDe: rutas.itinerario,
  destinoAlRetirar: destinoAlRetirarPlan,
})

const llenarCitados = crearLlenarLugaresCitados({
  coleccion: 'itinerarios',
  extra: (d) => ((d.dias ?? []) as { paradas?: { lugar?: unknown }[] }[])
    .flatMap((x) => x.paradas ?? [])
    .map((p) => idDe(p.lugar))
    .filter((x): x is number => x !== null),
})

const validarParadas: CollectionBeforeValidateHook = ({ data, req }) => {
  const r = paradasValidas(data?.dias, req.locale)
  if (r !== true) throw new ValidationError({ collection: 'itinerarios', errors: [{ path: 'dias', message: r }] })
  return data
}

export const Itinerarios: CollectionConfig = {
  slug: 'itinerarios',
  labels: { singular: 'Itinerario', plural: 'Itinerarios' },
  admin: { useAsTitle: 'titulo', defaultColumns: ['titulo', 'zona', '_status', 'publicadoEl'] },
  versions: { drafts: { schedulePublish: true }, maxPerDoc: 50 },
  access: { read: lecturaPublicaPublicada, readVersions: soloPersonal, create: soloPersonal, update: soloPersonal, delete: soloPersonal },
  hooks: {
    beforeValidate: [validarParadas],
    beforeChange: [copiarNombreAutor, fechasDePublicacion, llenarCitados, redireccion.beforeChange],
    afterChange: [redireccion.afterChange, revalidacion.afterChange, indice.afterChange],
    beforeDelete: [redireccion.beforeDelete],
    afterDelete: [redireccion.afterDelete, revalidacion.afterDelete, indice.afterDelete],
  },
  defaultSort: '-publicadoEl',
  fields: [
    { name: 'titulo', type: 'text', localized: true, required: true },
    campoSlug({ desde: 'titulo', localizado: true }),
    { name: 'zona', type: 'relationship', relationTo: 'zonas', required: true, index: true },
    { name: 'resumen', type: 'textarea', localized: true, maxLength: 160 },
    { name: 'portada', type: 'upload', relationTo: 'media' },
    { name: 'autor', type: 'relationship', relationTo: 'users', required: true, defaultValue: ({ user }: { user?: { id: number } | null }) => user?.id },
    { name: 'autorNombre', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'publicadoEl', type: 'date', admin: { position: 'sidebar' } },
    { name: 'actualizadoEl', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'cuerpo', type: 'richText', localized: true,
      editor: lexicalEditor({ features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: bloquesArticulo })] }),
    },
    {
      name: 'dias', type: 'array', minRows: 1, maxRows: 7, required: true, labels: { singular: 'Día', plural: 'Días' },
      fields: [
        { name: 'titulo', type: 'text', localized: true },
        {
          name: 'paradas', type: 'array', minRows: 1, maxRows: 8, required: true, labels: { singular: 'Parada', plural: 'Paradas' },
          fields: [
            { name: 'hora', type: 'text', validate: (v: unknown) => (!v || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v)) ? true : 'Usa el formato HH:MM.') },
            { name: 'lugar', type: 'relationship', relationTo: 'lugares' },
            {
              name: 'tour', type: 'text',
              validate: (v: unknown) => (!v || (typeof v === 'string' && esClaveDeTour(v)) ? true : 'Elige un tour del catálogo.'),
              admin: { components: { Field: { path: '/admin/ToursRelacionados#ToursRelacionados', clientProps: { modo: 'uno', rutaZona: 'zona' } } } },
            },
            { name: 'nota', type: 'textarea', localized: true, maxLength: 400 },
          ],
        },
      ],
    },
    { name: 'lugaresCitados', type: 'relationship', relationTo: 'lugares', hasMany: true, admin: { hidden: true } },
    {
      name: 'preguntas', type: 'array', localized: true, maxRows: 8,
      fields: [
        { name: 'pregunta', type: 'text', required: true, maxLength: 120 },
        { name: 'respuesta', type: 'textarea', required: true, maxLength: 600 },
      ],
    },
    ...camposDestacado(),
    camposSeo(),
  ],
}
```

Comprobar en `npm run dev` que el selector de `tour` en una parada ve la zona con `rutaZona: 'zona'`. Si no la ve, quitar `admin.components` del campo y dejar una descripción con el formato de la clave, como manda la salida de emergencia del paquete 1.

- [ ] **Paso 5: `src/hooks/temas.ts`**

```ts
// src/hooks/temas.ts
import { ValidationError, type CollectionBeforeValidateHook, type FieldHook, type PayloadRequest } from 'payload'

import { esPersonal } from '../acceso/roles'
import { LOCALES, type Locale } from '../dominio/idioma'
import { idDe } from '../dominio/lexical'
import { lugaresDeTema, temaIndexable, type CriteriosTema } from '../dominio/temas'
import { lugaresPublicados } from '../sitio/datos/lecturas/lugares'
import { zonasActivas } from '../sitio/datos/lecturas/zonas'
import type { TarjetaLugar } from '../sitio/datos/tipos'

const ids = (v: unknown): number[] => (Array.isArray(v) ? v : []).map(idDe).filter((x): x is number => x !== null)

export function criteriosDeDoc(doc: Record<string, unknown>): CriteriosTema {
  return {
    zonaId: idDe(doc.zona),
    categoriaIds: ids(doc.categorias),
    caracteristicas: (doc.caracteristicas as string[] | null | undefined) ?? [],
    servicios: (doc.servicios as string[] | null | undefined) ?? [],
    lugaresFijosIds: ids(doc.lugaresFijos),
  }
}

type Listas = { lugares: TarjetaLugar[]; zonasActivasIds: number[] }

// Payload corre afterRead de todas las filas en paralelo: se guarda la Promesa, no el resultado.
function listasDe(req: PayloadRequest, lang: Locale): Promise<Listas> {
  const memo = ((req.context.listasTema ??= {}) as Record<string, Promise<Listas>>)
  memo[lang] ??= (async () => {
    const [lugares, zonas] = await Promise.all([lugaresPublicados(req.payload, lang), zonasActivas(req.payload, lang)])
    return { lugares, zonasActivasIds: zonas.map((z) => z.id) }
  })()
  return memo[lang]
}

// Los hooks de campo corren antes de revisar el acceso de lectura: sin personal se sale de inmediato.
export const calcularLugaresQueCoinciden: FieldHook = async ({ data, req }) => {
  if (!esPersonal(req.user) || !data) return undefined
  const criterios = criteriosDeDoc(data)
  const partes = await Promise.all(LOCALES.map(async (l) => {
    const n = lugaresDeTema(criterios, await listasDe(req, l), new Date()).length
    return `${l}: ${n}, ${temaIndexable(n) ? 'se indexa' : 'no se indexa'}`
  }))
  return partes.join(' · ')
}

export const validarToursDeTema: CollectionBeforeValidateHook = async ({ data, req }) => {
  for (const fila of (data?.tours ?? []) as { zona?: unknown }[]) {
    const id = idDe(fila.zona)
    if (id === null) continue
    const zona = await req.payload.db.findOne<{ sedeSlug?: string | null }>({ collection: 'zonas', where: { id: { equals: id } }, req })
    if (!zona?.sedeSlug) throw new ValidationError({ collection: 'temas', errors: [{ path: 'tours', message: 'Esa zona no tiene sede en el sitio de reservas.' }] })
  }
  return data
}
```

- [ ] **Paso 6: Temas**

```ts
// src/collections/Temas.ts
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { campoSoloPersonal, lecturaPublicaPublicada, soloPersonal } from '../acceso/reglas'
import { bloquesArticulo } from '../bloques/articulo'
import { hooksDeIndice } from '../busqueda/hooks'
import { camposDestacado } from '../campos/destacado'
import { camposSeo } from '../campos/seo'
import { campoSlug } from '../campos/slug'
import { CARACTERISTICAS } from '../dominio/caracteristicas'
import { CAMPOS_IDIOMA, CAMPOS_LOCALIZADOS } from '../dominio/idioma'
import { esClaveDeTour } from '../dominio/presencia'
import { rutas } from '../dominio/rutas'
import { SERVICIOS_VISITA } from '../dominio/visita'
import { copiarNombreAutor, fechasDePublicacion } from '../hooks/articulos'
import { calcularLugaresQueCoinciden, validarToursDeTema } from '../hooks/temas'
import { destinoAlRetirarPlan, hooksDeRedireccion } from '../redirecciones/hooks'
import { hooksDeRevalidacion } from '../revalidacion/hooks'

const revalidacion = hooksDeRevalidacion('temas')
const indice = hooksDeIndice('tema')
const redireccion = hooksDeRedireccion({
  coleccion: 'temas',
  camposIdioma: CAMPOS_IDIOMA.temas,
  camposLocalizados: CAMPOS_LOCALIZADOS.temas,
  rutaDe: rutas.tema,
  destinoAlRetirar: destinoAlRetirarPlan,
})

export const Temas: CollectionConfig = {
  slug: 'temas',
  labels: { singular: 'Tema', plural: 'Temas' },
  admin: { useAsTitle: 'titulo', defaultColumns: ['titulo', 'zona', '_status', 'publicadoEl'] },
  versions: { drafts: { schedulePublish: true }, maxPerDoc: 50 },
  access: { read: lecturaPublicaPublicada, readVersions: soloPersonal, create: soloPersonal, update: soloPersonal, delete: soloPersonal },
  hooks: {
    beforeValidate: [validarToursDeTema],
    beforeChange: [copiarNombreAutor, fechasDePublicacion, redireccion.beforeChange],
    afterChange: [redireccion.afterChange, revalidacion.afterChange, indice.afterChange],
    beforeDelete: [redireccion.beforeDelete],
    afterDelete: [redireccion.afterDelete, revalidacion.afterDelete, indice.afterDelete],
  },
  defaultSort: '-publicadoEl',
  fields: [
    { name: 'titulo', type: 'text', localized: true, required: true },
    campoSlug({ desde: 'titulo', localizado: true }),
    { name: 'zona', type: 'relationship', relationTo: 'zonas', index: true, admin: { description: 'Sin zona, el tema es de toda la Baja.' } },
    { name: 'resumen', type: 'textarea', localized: true, maxLength: 160 },
    { name: 'portada', type: 'upload', relationTo: 'media' },
    { name: 'autor', type: 'relationship', relationTo: 'users', required: true, defaultValue: ({ user }: { user?: { id: number } | null }) => user?.id },
    { name: 'autorNombre', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'publicadoEl', type: 'date', admin: { position: 'sidebar' } },
    { name: 'actualizadoEl', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'introduccion', type: 'richText', localized: true,
      editor: lexicalEditor({ features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: bloquesArticulo })] }),
    },
    { name: 'categorias', type: 'relationship', relationTo: 'categorias', hasMany: true, admin: { description: 'Cualquiera de estas.' } },
    { name: 'caracteristicas', type: 'select', hasMany: true, options: CARACTERISTICAS.map((c) => ({ label: { es: c.es, en: c.en }, value: c.valor })), admin: { description: 'Todas a la vez.' } },
    { name: 'servicios', type: 'select', hasMany: true, options: SERVICIOS_VISITA.map((s) => ({ label: { es: s.es, en: s.en }, value: s.valor })), admin: { description: 'Todos a la vez.' } },
    { name: 'lugaresFijos', type: 'relationship', relationTo: 'lugares', hasMany: true, maxRows: 12, admin: { description: 'Los que van sí o sí, primero y en este orden.' } },
    {
      name: 'tours', type: 'array', maxRows: 6, labels: { singular: 'Tour', plural: 'Tours' },
      fields: [
        { name: 'zona', type: 'relationship', relationTo: 'zonas', required: true },
        {
          name: 'tour', type: 'text', required: true,
          validate: (v: unknown) => (typeof v === 'string' && esClaveDeTour(v) ? true : 'Elige un tour del catálogo.'),
          admin: { components: { Field: { path: '/admin/ToursRelacionados#ToursRelacionados', clientProps: { modo: 'uno' } } } },
        },
      ],
    },
    {
      name: 'preguntas', type: 'array', localized: true, maxRows: 8,
      fields: [
        { name: 'pregunta', type: 'text', required: true, maxLength: 120 },
        { name: 'respuesta', type: 'textarea', required: true, maxLength: 600 },
      ],
    },
    {
      name: 'lugaresQueCoinciden', type: 'text', virtual: true, access: { read: campoSoloPersonal },
      admin: { readOnly: true, position: 'sidebar', description: 'Se actualiza al guardar.' },
      hooks: { afterRead: [calcularLugaresQueCoinciden] },
    },
    ...camposDestacado(),
    camposSeo(),
  ],
}
```

- [ ] **Paso 7: conectar.**
  - `src/redirecciones/hooks.ts`:

    ```ts
    export async function destinoAlRetirarPlan(req: PayloadRequest, antes: Doc, locale: Locale): Promise<string> {
      const zona = await zonaActiva(req, antes.zona)
      return zona ? rutas.zona(locale, zona.slug) : rutas.portada(locale)
    }
    ```

    Sumar `'itinerarios' | 'temas'` al tipo de `coleccion` de `hooksDeRedireccion` si es un union.
  - `src/redirecciones/plugin.ts`: `collections: ['lugares', 'eventos', 'articulos', 'itinerarios', 'temas']`.
  - `src/payload.config.ts`: importar y agregar `Itinerarios` y `Temas` a `collections`, después de `Articulos`.
  - `src/seed/vaciar.ts`: agregar `'itinerarios'` y `'temas'` a la lista, antes de `'articulos'`, para respetar las claves foráneas.
  - `tests/int/utils.ts`, en `limpiar`: agregar las dos colecciones a lo que se borra, si `limpiar` usa una lista.
  - **Tipos de búsqueda, antes de regenerar:** `IndiceBusqueda` arma su enum desde `TIPOS_BUSQUEDA`, así que este cambio va en la misma migración, y `hooksDeIndice('itinerario')` lo necesita para compilar.
    - `src/dominio/busqueda.ts`: `TIPOS_BUSQUEDA = ['lugar', 'evento', 'articulo', 'itinerario', 'tema', 'zona', 'categoria'] as const`. `FILTRABLES` no cambia.
    - `src/busqueda/indexar.ts`:

      ```ts
      const COLECCION: Record<TipoBusqueda, 'lugares' | 'eventos' | 'articulos' | 'itinerarios' | 'temas' | 'zonas' | 'categorias'> = {
        lugar: 'lugares', evento: 'eventos', articulo: 'articulos', itinerario: 'itinerarios', tema: 'temas', zona: 'zonas', categoria: 'categorias',
      }
      ```
    - `src/sitio/textos.ts`, en `busqueda.tipos`: `itinerario: 'Planes', tema: 'Planes'` en español y `itinerario: 'Plans', tema: 'Plans'` en inglés. `CabeceraCliente` y la página de búsqueda indexan `tipos` por tipo.
    - `buscar/page.tsx`, en el `switch` de `rutaDe`:

      ```ts
      case 'itinerario': return rutas.itinerario(lang, f.slug)
      case 'tema': return rutas.tema(lang, f.slug)
      ```
    - `buscar/page.tsx` y `sugerencias/route.ts`: cambiar el filtro a `visibles[f.tipo]?.has(f.docId)` hasta la tarea 5, que agrega las listas de visibilidad de los tipos nuevos.

- [ ] **Paso 8: regenerar.** `npm run generate:types`, `npm run generate:importmap`, `npm run migracion:regenerar -- --no-hay-deploy` (si ya hubo deploy: `npm run payload migrate:create paquete-2`). Revisar `scripts/migraciones/busqueda.ts.txt`: si su SQL lista los tipos a mano, agregar los dos nuevos.

- [ ] **Paso 9: correr la prueba y ver que pasa.** `npm run test:int -- paquete-2`, `npm run test:int -- articulos`.

- [ ] **Paso 10: commit** con mensaje `feat: colecciones de itinerarios y temas`.

### Tarea 4: búsqueda

**Archivos:**
- Modificar: `src/busqueda/filas.ts`
- Prueba: `tests/unit/filas-busqueda.test.ts`, `tests/int/paquete-2.int.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan.** En `tests/unit/filas-busqueda.test.ts`:

```ts
it('itinerario: título, resumen, títulos de día y notas', () => {
  const doc = {
    id: 1, _status: 'published', zona: 2, slug: { es: 'plan', en: null }, titulo: { es: 'Plan', en: null }, resumen: { es: 'Resumen', en: null },
    cuerpo: { es: lexicalPrueba('Intro'), en: null },
    dias: [{ titulo: { es: 'Balandra' }, paradas: [{ nota: { es: 'Llega temprano' } }] }],
  }
  const [f] = filasDe('itinerario', doc)
  expect(f).toMatchObject({ tipo: 'itinerario', slug: 'plan', titulo: 'Plan', zonaIds: [2], locale: 'es' })
  expect(f.texto).toContain('Balandra')
  expect(f.texto).toContain('Llega temprano')
})

it('tema: usa la introducción', () => {
  const doc = { id: 2, _status: 'published', zona: null, slug: { es: 'tema', en: null }, titulo: { es: 'Tema', en: null }, resumen: { es: 'R', en: null }, introduccion: { es: lexicalPrueba('Intro del tema'), en: null } }
  const [f] = filasDe('tema', doc)
  expect(f).toMatchObject({ tipo: 'tema', slug: 'tema', titulo: 'Tema' })
  expect(f.texto).toContain('Intro del tema')
})

it('borrador no entra', () => expect(filasDe('tema', { id: 3, _status: 'draft' })).toEqual([]))
```

(`lexicalPrueba` es el constructor de cuerpo que ya use ese archivo; si no hay, usar `{ root: { children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] } }`.)

En `tests/int/paquete-2.int.test.ts`, agregar un caso que publique un itinerario con título «Plan Sugerible» y compruebe que hay una fila en `indice-busqueda`:

```ts
it('el itinerario entra al índice', async () => {
  const b = await base()
  await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: { ...datosItinerario(b, [{ paradas: [{ nota: 'x' }] }]), titulo: 'Plan Sugerible' } as never })
  const { docs } = await payload.find({ collection: 'indice-busqueda', where: { tipo: { equals: 'itinerario' } }, overrideAccess: true })
  expect(docs[0].titulo).toBe('Plan Sugerible')
})

it('la consulta de búsqueda y sugerencias encuentra el itinerario', async () => {
  const b = await base()
  await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: { ...datosItinerario(b, [{ paradas: [{ nota: 'x' }] }]), titulo: 'Plan Sugerible' } as never })
  const filas = await coincidencias(payload, { q: 'Sugerible', lang: 'es', tipo: null as never, zonaId: null })
  expect(filas.map((f) => f.tipo)).toContain('itinerario')
})
```

con `import { coincidencias } from '../../src/busqueda/consulta'` arriba del archivo.

- [ ] **Paso 2: correrlas y ver que fallan.**

- [ ] **Paso 3: implementar.**

`src/busqueda/filas.ts`, antes del `if (tipo === 'zona')`:

```ts
    if (tipo === 'itinerario' || tipo === 'tema') {
      if (doc._status !== 'published') return []
      const col = tipo === 'itinerario' ? 'itinerarios' : 'temas'
      const plano = aplanarIdioma(doc, l, CAMPOS_LOCALIZADOS[col])
      if (!existeEnIdioma(plano, CAMPOS_IDIOMA[col])) continue
      const cuerpo = tipo === 'itinerario' ? plano.cuerpo : plano.introduccion
      const dias = tipo === 'itinerario' ? textoDeDias(doc.dias, l) : ''
      const titulo = str(plano.titulo)
      salida.push(base(tipo, doc, l, str(plano.slug), titulo, `${titulo} ${str(plano.resumen)} ${textoDeLexical(cuerpo)} ${dias}`))
      continue
    }
```

Agregar arriba de `filasDe`:

```ts
function textoDeDias(dias: unknown, l: Locale): string {
  const localizado = (v: unknown) => (v && typeof v === 'object' ? str((v as Record<string, unknown>)[l]) : str(v))
  return ((dias ?? []) as { titulo?: unknown; paradas?: { nota?: unknown }[] }[])
    .flatMap((d) => [localizado(d.titulo), ...(d.paradas ?? []).map((p) => localizado(p.nota))])
    .filter(Boolean)
    .join(' ')
}
```

En el `else` final de `filasDe` (categorías), convertirlo en `else if (tipo === 'categoria')`, para que ningún tipo caiga ahí por omisión.

- [ ] **Paso 4: correrlas y ver que pasan.** `npx vitest run tests/unit/filas-busqueda.test.ts`, `npm run test:int -- paquete-2`, `npm run typecheck`.

- [ ] **Paso 5: commit** con mensaje `feat: itinerarios y temas en el índice de búsqueda`.

### Tarea 5: datos públicos

**Archivos:**
- Crear: `src/sitio/datos/lecturas/itinerarios.ts`, `src/sitio/datos/lecturas/temas.ts`
- Modificar: `src/sitio/datos/tipos.ts`, `src/sitio/datos/mapeo.ts`, `src/sitio/datos/llaves.ts`, `src/sitio/datos/cacheadas.ts`, `src/sitio/datos/consultas.ts`, `buscar/page.tsx`, `buscar/sugerencias/route.ts`
- Prueba: `tests/unit/mapeo-documentos.test.ts`, `tests/unit/consultas.test.ts`, `tests/unit/llaves.test.ts`

**Interfaces:**
- Produce:
  - `TarjetaItinerario = { id; slug; titulo; resumen; zonaId: number; portada: Imagen | null; autorNombre: string; publicadoEl; actualizadoEl; lugaresCitados: number[]; numeroDias: number; clavesTours: string[]; categoriaIds: number[]; destacado: Destacado; noIndexar: boolean }`
  - `FichaItinerario = TarjetaItinerario & { cuerpo: unknown; dias: Dia[]; preguntas: {pregunta; respuesta}[]; metaTitulo; metaDescripcion; media }`
  - `TarjetaTema = { id; slug; titulo; resumen; zonaId: number | null; portada; publicadoEl; actualizadoEl; criterios: CriteriosTema; tours: { zonaId: number; clave: string }[]; categoriaIds: number[]; destacado; noIndexar }`
  - `FichaTema = TarjetaTema & { introduccion: unknown; autorNombre: string; preguntas; metaTitulo; metaDescripcion; media }`
  - `itinerariosCacheados(lang)`, `temasCacheados(lang)`, `fichaItinerarioCacheada(id, lang)`, `fichaTemaCacheada(id, lang)`
  - `planesDeZona(...)`, `planesSinZona(...)`, `planesQueCitan(...)`, `temaParaFiltro(...)`, `type Plan = { tipo: 'itinerario'; item: TarjetaItinerario } | { tipo: 'tema'; item: TarjetaTema }`

- [ ] **Paso 1: escribir las pruebas que fallan.** En `tests/unit/consultas.test.ts`:

```ts
describe('planes', () => {
  const sinP = { activo: false, desde: null, hasta: null }
  const lugar = (id: number, zonaId: number) => ({ id, zonaId, categoriaIds: [1], caracteristicas: [], servicios: [], patrocinio: sinP, orden: 100, nombre: `L${id}` }) as TarjetaLugar
  const crit = (extra = {}) => ({ zonaId: null, categoriaIds: [1], caracteristicas: [], servicios: [], lugaresFijosIds: [], ...extra })
  const tema = (id: number, extra = {}) => ({ id, zonaId: null, criterios: crit(), actualizadoEl: '2026-01-01T00:00:00Z', destacado: { activo: false, orden: 100 }, titulo: `T${id}`, noIndexar: false, ...extra }) as TarjetaTema
  const itin = (id: number, extra = {}) => ({ id, zonaId: 1, actualizadoEl: '2026-02-01T00:00:00Z', destacado: { activo: false, orden: 100 }, titulo: `I${id}`, lugaresCitados: [], noIndexar: false, ...extra }) as TarjetaItinerario
  const listas = { lugares: [lugar(1, 1), lugar(2, 2)], zonasActivasIds: [1, 2] }
  const ahora = new Date('2026-11-08T12:00:00Z')

  it('zona: destacados primero, luego por actualización; los sin zona con lugares ahí van después', () => {
    const itins = [itin(1), itin(2, { destacado: { activo: true, orden: 1 } })]
    const temas = [tema(5, { zonaId: 1, criterios: crit({ zonaId: 1 }), actualizadoEl: '2026-03-01T00:00:00Z' }), tema(6)]
    const r = planesDeZona(itins, temas, 1, listas, ahora).map((p) => `${p.tipo}${p.item.id}`)
    expect(r).toEqual(['itinerario2', 'tema5', 'itinerario1', 'tema6'])
  })
  it('máximo 6', () => {
    expect(planesDeZona(Array.from({ length: 9 }, (_, i) => itin(i + 1)), [], 1, listas, ahora)).toHaveLength(6)
  })
  it('sin zona: solo los temas indexables sin zona', () => {
    const crit3 = crit({ lugaresFijosIds: [1, 2] })
    const r = planesSinZona([tema(7, { criterios: crit3 }), tema(8, { criterios: crit({ categoriaIds: [99] }) })], { ...listas, lugares: [...listas.lugares, lugar(3, 1)] }, ahora)
    expect(r.map((p) => p.item.id)).toEqual([7])
  })
  it('planesQueCitan: lugaresCitados y lista del tema', () => {
    const r = planesQueCitan(1, [itin(1, { lugaresCitados: [1] }), itin(2)], [tema(5)], listas, ahora)
    expect(r.map((p) => `${p.tipo}${p.item.id}`)).toEqual(['itinerario1', 'tema5'])
  })
  it('temaParaFiltro: misma zona, exactamente esa categoría y esa característica, y sin servicios', () => {
    const t = tema(9, { zonaId: 1, criterios: crit({ zonaId: 1, categoriaIds: [1], caracteristicas: ['para-ninos'] }) })
    expect(temaParaFiltro([t], { zonaId: 1, categoriaId: 1, caracteristica: 'para-ninos' })?.id).toBe(9)
    expect(temaParaFiltro([t], { zonaId: 1, categoriaId: 1, caracteristica: 'con-comida' })).toBeUndefined()
    expect(temaParaFiltro([tema(10, { zonaId: 1, criterios: crit({ zonaId: 1, categoriaIds: [1], caracteristicas: ['para-ninos'], servicios: ['sombra'] }) })], { zonaId: 1, categoriaId: 1, caracteristica: 'para-ninos' })).toBeUndefined()
  })
})
```

En `tests/unit/llaves.test.ts`, agregar que `LLAVES.itinerarios('es').etiquetas` y `LLAVES.temas('es').etiquetas` contienen `listados` y `zonas`.

En `tests/unit/mapeo-documentos.test.ts`:

```ts
it('itinerario: existe sin títulos de día y normaliza las paradas', () => {
  const doc = { id: 1, slug: 'plan', titulo: 'Plan', resumen: 'R', cuerpo: lexical, zona: { id: 2, slug: 'la-paz' }, dias: [{ titulo: null, paradas: [{ hora: '08:00', lugar: { id: 3 }, tour: 'servicio:a', nota: null }] }], lugaresCitados: [3] }
  const t = itinerarioDe(doc as never, 'es')!
  expect(t.numeroDias).toBe(1)
  expect(t.clavesTours).toEqual(['servicio:a'])
  const f = fichaItinerarioDe(doc as never, 'es', {})!
  expect(f.dias[0].paradas[0]).toEqual({ hora: '08:00', lugarId: 3, tour: 'servicio:a', nota: null })
})
it('tema: criterios y tours', () => {
  const doc = { id: 1, slug: 't', titulo: 'T', resumen: 'R', introduccion: lexical, zona: null, categorias: [1], caracteristicas: ['para-ninos'], servicios: [], lugaresFijos: [{ id: 7 }], tours: [{ zona: 2, tour: 'servicio:a' }] }
  const t = temaDe(doc as never, 'es')!
  expect(t.criterios).toEqual({ zonaId: null, categoriaIds: [1], caracteristicas: ['para-ninos'], servicios: [], lugaresFijosIds: [7] })
  expect(t.tours).toEqual([{ zonaId: 2, clave: 'servicio:a' }])
})
```

- [ ] **Paso 2: correrlas y ver que fallan.**

- [ ] **Paso 3: tipos y mapeo.** En `tipos.ts`, agregar los cuatro tipos de arriba (importando `Dia` de `dominio/itinerarios` y `CriteriosTema` de `dominio/temas`, con `import type`).

En `mapeo.ts`:

```ts
function diasDe(doc: Itinerario): Dia[] {
  return (doc.dias ?? []).map((d) => ({
    titulo: d.titulo ?? null,
    paradas: (d.paradas ?? []).map((p) => ({ hora: p.hora ?? null, lugarId: idDe(p.lugar), tour: p.tour ?? null, nota: p.nota ?? null })),
  }))
}

export function itinerarioDe(doc: Itinerario, lang: Locale): TarjetaItinerario | null {
  if (!existeEnIdioma(doc as never, CAMPOS_IDIOMA.itinerarios) || !doc.slug) return null
  const zonaId = idDe(doc.zona)
  // Una zona inactiva no se puebla (acceso público): sin slug la página no existe, como un lugar.
  if (zonaId === null || !slugDe(doc.zona)) return null
  const dias = diasDe(doc)
  return {
    id: doc.id, slug: doc.slug, titulo: doc.titulo, resumen: doc.resumen ?? '', zonaId,
    portada: imagenDe(doc.portada, lang), autorNombre: doc.autorNombre ?? '',
    publicadoEl: iso(doc.publicadoEl), actualizadoEl: iso(doc.actualizadoEl),
    lugaresCitados: ids(doc.lugaresCitados), numeroDias: dias.length, clavesTours: clavesDeItinerario(dias),
    categoriaIds: [], destacado: destacadoDe(doc), noIndexar: Boolean(doc.seo?.noIndexar),
  }
}

export function fichaItinerarioDe(doc: Itinerario, lang: Locale, media: Record<string, Imagen>): FichaItinerario | null {
  const t = itinerarioDe(doc, lang)
  if (!t) return null
  return {
    ...t,
    portada: media[String(idDe(doc.portada))] ?? t.portada,
    cuerpo: doc.cuerpo ?? null,
    dias: diasDe(doc),
    preguntas: (doc.preguntas ?? []).map((p) => ({ pregunta: p.pregunta, respuesta: p.respuesta })),
    metaTitulo: doc.seo?.metaTitulo ?? null, metaDescripcion: doc.seo?.metaDescripcion ?? null, media,
  }
}

export function temaDe(doc: Tema, lang: Locale): TarjetaTema | null {
  if (!existeEnIdioma(doc as never, CAMPOS_IDIOMA.temas) || !doc.slug) return null
  const zonaId = idDe(doc.zona)
  return {
    id: doc.id, slug: doc.slug, titulo: doc.titulo, resumen: doc.resumen ?? '', zonaId,
    portada: imagenDe(doc.portada, lang), publicadoEl: iso(doc.publicadoEl), actualizadoEl: iso(doc.actualizadoEl),
    criterios: { zonaId, categoriaIds: ids(doc.categorias), caracteristicas: doc.caracteristicas ?? [], servicios: doc.servicios ?? [], lugaresFijosIds: ids(doc.lugaresFijos) },
    tours: (doc.tours ?? []).flatMap((f) => {
      const z = idDe(f.zona)
      return z !== null && esClaveDeTour(f.tour) ? [{ zonaId: z, clave: f.tour }] : []
    }),
    categoriaIds: ids(doc.categorias), destacado: destacadoDe(doc), noIndexar: Boolean(doc.seo?.noIndexar),
  }
}

export function fichaTemaDe(doc: Tema, lang: Locale, media: Record<string, Imagen>): FichaTema | null {
  const t = temaDe(doc, lang)
  if (!t) return null
  return {
    ...t,
    portada: media[String(idDe(doc.portada))] ?? t.portada,
    introduccion: doc.introduccion ?? null, autorNombre: doc.autorNombre ?? '',
    preguntas: (doc.preguntas ?? []).map((p) => ({ pregunta: p.pregunta, respuesta: p.respuesta })),
    metaTitulo: doc.seo?.metaTitulo ?? null, metaDescripcion: doc.seo?.metaDescripcion ?? null, media,
  }
}
```

Importar `Itinerario` y `Tema` de `payload-types`. En `itinerarioDe`, un tema con zona inactiva: `temaDe` no se descarta por `slugDe`, porque `zona` es opcional. **La zona desactivada se filtra en `temasPublicados`** (paso 4), para que el tema de una zona inactiva dé 404.

- [ ] **Paso 4: lecturas**

```ts
// src/sitio/datos/lecturas/itinerarios.ts
import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import { idDe, idsEnCuerpo } from '../../../dominio/lexical'
import { fichaItinerarioDe, itinerarioDe } from '../mapeo'
import type { FichaItinerario, TarjetaItinerario } from '../tipos'
import { mediaPorIds } from './media'
import { opcionesPublicas } from './publico'

export async function itinerariosPublicados(payload: Payload, lang: Locale): Promise<TarjetaItinerario[]> {
  const { docs } = await payload.find({ collection: 'itinerarios', ...opcionesPublicas(lang), depth: 1, sort: '-publicadoEl', pagination: false })
  return docs.map((d) => itinerarioDe(d, lang)).filter((x): x is TarjetaItinerario => x !== null)
}

export async function fichaItinerario(payload: Payload, id: number, lang: Locale): Promise<FichaItinerario | null> {
  const { docs } = await payload.find({ collection: 'itinerarios', ...opcionesPublicas(lang), where: { id: { equals: id } }, depth: 1, limit: 1 })
  const doc = docs[0]
  if (!doc) return null
  const portada = idDe(doc.portada)
  const media = await mediaPorIds(payload, [...(portada === null ? [] : [portada]), ...idsEnCuerpo(doc.cuerpo).media], lang)
  return fichaItinerarioDe(doc, lang, media)
}
```

```ts
// src/sitio/datos/lecturas/temas.ts
import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import { idDe, idsEnCuerpo } from '../../../dominio/lexical'
import { fichaTemaDe, temaDe } from '../mapeo'
import type { FichaTema, TarjetaTema } from '../tipos'
import { mediaPorIds } from './media'
import { opcionesPublicas } from './publico'

// Una zona inactiva no se puebla para el público: el tema que apunta a ella no existe. Con depth 1, sin zona, es null.
const zonaActivaOAusente = (zona: unknown) => zona === null || zona === undefined || (typeof zona === 'object' && 'slug' in (zona as object))

export async function temasPublicados(payload: Payload, lang: Locale): Promise<TarjetaTema[]> {
  const { docs } = await payload.find({ collection: 'temas', ...opcionesPublicas(lang), depth: 1, sort: '-publicadoEl', pagination: false })
  return docs.filter((d) => zonaActivaOAusente(d.zona)).map((d) => temaDe(d, lang)).filter((x): x is TarjetaTema => x !== null)
}

export async function fichaTema(payload: Payload, id: number, lang: Locale): Promise<FichaTema | null> {
  const { docs } = await payload.find({ collection: 'temas', ...opcionesPublicas(lang), where: { id: { equals: id } }, depth: 1, limit: 1 })
  const doc = docs[0]
  if (!doc || !zonaActivaOAusente(doc.zona)) return null
  const portada = idDe(doc.portada)
  const media = await mediaPorIds(payload, [...(portada === null ? [] : [portada]), ...idsEnCuerpo(doc.introduccion).media], lang)
  return fichaTemaDe(doc, lang, media)
}
```

En `llaves.ts`:

```ts
  itinerarios: (lang: Locale): Llave => ({ llave: ['itinerarios', lang], etiquetas: [etiqueta.listados, etiqueta.media, etiqueta.zonas] }),
  temas: (lang: Locale): Llave => ({ llave: ['temas', lang], etiquetas: [etiqueta.listados, etiqueta.media, etiqueta.zonas] }),
  fichaItinerario: (id: number, lang: Locale): Llave => ({ llave: ['fichaItinerario', String(id), lang], etiquetas: [etiqueta.itinerario(id), etiqueta.media, etiqueta.zonas] }),
  fichaTema: (id: number, lang: Locale): Llave => ({ llave: ['fichaTema', String(id), lang], etiquetas: [etiqueta.tema(id), etiqueta.media, etiqueta.zonas] }),
```

En `cacheadas.ts`:

```ts
export const itinerariosCacheados = cachear(itinerariosPublicados, LLAVES.itinerarios)
export const temasCacheados = cachear(temasPublicados, LLAVES.temas)
export const fichaItinerarioCacheada = cachear(fichaItinerario, LLAVES.fichaItinerario)
export const fichaTemaCacheada = cachear(fichaTema, LLAVES.fichaTema)
```

- [ ] **Paso 5: consultas.** En `consultas.ts`:

```ts
export type Plan = { tipo: 'itinerario'; item: TarjetaItinerario } | { tipo: 'tema'; item: TarjetaTema }
type ListasTema = { lugares: TarjetaLugar[]; zonasActivasIds: readonly number[] }
const MAX_PLANES = 6

const ordenPlan = (a: Plan, b: Plan) =>
  Number(b.item.destacado.activo) - Number(a.item.destacado.activo)
  || (a.item.destacado.activo ? a.item.destacado.orden - b.item.destacado.orden : 0)
  || (b.item.actualizadoEl ?? '').localeCompare(a.item.actualizadoEl ?? '')

export function planesDeZona(itinerarios: TarjetaItinerario[], temas: TarjetaTema[], zonaId: number, listas: ListasTema, ahora: Date): Plan[] {
  const deLaZona: Plan[] = [
    ...itinerarios.filter((x) => x.zonaId === zonaId).map((item) => ({ tipo: 'itinerario' as const, item })),
    ...temas.filter((x) => x.zonaId === zonaId).map((item) => ({ tipo: 'tema' as const, item })),
  ].sort(ordenPlan)
  const sinZona: Plan[] = temas
    .filter((x) => x.zonaId === null && lugaresDeTema(x.criterios, listas, ahora).some((l) => l.zonaId === zonaId))
    .map((item) => ({ tipo: 'tema' as const, item }))
  return [...deLaZona, ...sinZona.sort(ordenPlan)].slice(0, MAX_PLANES)
}

export function planesSinZona(temas: TarjetaTema[], listas: ListasTema, ahora: Date): Plan[] {
  return temas
    .filter((x) => x.zonaId === null && !x.noIndexar && temaIndexable(lugaresDeTema(x.criterios, listas, ahora).length))
    .map((item) => ({ tipo: 'tema' as const, item }))
    .sort(ordenPlan)
    .slice(0, MAX_PLANES)
}

export function planesQueCitan(lugarId: number, itinerarios: TarjetaItinerario[], temas: TarjetaTema[], listas: ListasTema, ahora: Date): Plan[] {
  return [
    ...itinerarios.filter((x) => x.lugaresCitados.includes(lugarId)).map((item) => ({ tipo: 'itinerario' as const, item })),
    ...temas.filter((x) => lugaresDeTema(x.criterios, listas, ahora).some((l) => l.id === lugarId)).map((item) => ({ tipo: 'tema' as const, item })),
  ]
}

export function temaParaFiltro(temas: TarjetaTema[], f: { zonaId: number; categoriaId: number; caracteristica: string }): TarjetaTema | undefined {
  return temas.find((t) =>
    t.zonaId === f.zonaId
    && t.criterios.categoriaIds.length === 1 && t.criterios.categoriaIds[0] === f.categoriaId
    && t.criterios.caracteristicas.length === 1 && t.criterios.caracteristicas[0] === f.caracteristica
    && t.criterios.servicios.length === 0)
}
```

En `resolutorDeCuerpo`, sumar a su parámetro `itinerarios?: { id: number; slug: string }[]; temas?: { id: number; slug: string }[]`, y a `href`:

```ts
      if (relationTo === 'itinerarios') {
        const x = porId(l.itinerarios ?? [], id)
        return x ? rutas.itinerario(lang, x.slug) : null
      }
      if (relationTo === 'temas') {
        const x = porId(l.temas ?? [], id)
        return x ? rutas.tema(lang, x.slug) : null
      }
```

- [ ] **Paso 6: búsqueda.** En `buscar/page.tsx` y `sugerencias/route.ts`: agregar `itinerariosCacheados(lang)` y `temasCacheados(lang)` al `Promise.all`, volver el filtro a `visibles[f.tipo].has(f.docId)` y sumar a `visibles`:

```ts
    itinerario: new Set(itinerarios.map((x) => x.id)),
    tema: new Set(temas.map((x) => x.id)),
```

En `sugerencias/route.ts`, `ruta`:

```ts
  const ruta = (t: string, slug: string) =>
    t === 'lugar' ? rutas.lugar(lang, slug)
      : t === 'evento' ? rutas.evento(lang, slug)
        : t === 'articulo' ? rutas.articulo(lang, slug)
          : t === 'itinerario' ? rutas.itinerario(lang, slug)
            : t === 'tema' ? rutas.tema(lang, slug)
              : t === 'zona' ? rutas.zona(lang, slug)
                : rutas.categoria(lang, slug)
```

En `buscar/page.tsx`, importar `type TipoBusqueda` de `dominio/busqueda` y reemplazar la línea de `grupos`. Itinerarios y temas se muestran juntos en «Planes», después de «Artículos» (spec §2.6), ordenados como cualquier otro grupo:

```ts
  type Grupo = { id: string; tipo: TipoBusqueda; titulo: string; filas: FilaResultado[] }
  const grupo = (tipo: TipoBusqueda): Grupo => ({ id: tipo, tipo, titulo: t.busqueda.tipos[tipo], filas: ordenarGrupo(vigentes.filter((f) => f.tipo === tipo), ahora) })
  const planes: Grupo = { id: 'planes', tipo: 'itinerario', titulo: t.busqueda.tipos.itinerario, filas: ordenarGrupo(vigentes.filter((f) => f.tipo === 'itinerario' || f.tipo === 'tema'), ahora) }
  const grupos = TIPOS_BUSQUEDA.flatMap((tipo) => (tipo === 'tema' ? [] : [tipo === 'itinerario' ? planes : grupo(tipo)])).filter((g) => g.filas.length)
```

y, en el `grupos.map`, usar `g.id` y `g.titulo`:

```tsx
              <section key={g.id} className="grupo" aria-labelledby={`g-${g.id}`}>
                <h2 id={`g-${g.id}`}>{g.titulo} <small>{g.filas.length}</small></h2>
```

- [ ] **Paso 7: correrlas y ver que pasan.** `npm run test:unit`, `npm run typecheck`. Agregar los exports nuevos a los `vi.mock` de `cacheadas` que fallen (`tests/unit/ficha-lugar.test.ts`, `ficha-evento.test.ts` y otros), con `async () => []`.

- [ ] **Paso 8: commit** con mensaje `feat: lectura pública de itinerarios y temas`.

### Tarea 6: página del itinerario

**Archivos:**
- Crear: `src/app/(sitio)/[lang]/guia/itinerarios/[slug]/page.tsx`, `src/sitio/ui/itinerario/DiaItinerario.tsx`, `src/sitio/ui/itinerario/ToursDelPlan.tsx`
- Modificar: `src/sitio/seo/jsonld.ts`, `src/sitio/textos.ts`, `src/sitio/ui/ToursEnZona.tsx`, `src/sitio/analitica/track.ts` (no cambia: `tour_clic` admite cualquier origen), `src/sitio/estilos/articulo.css`
- Prueba: `tests/unit/jsonld-tours.test.ts`

- [ ] **Paso 1: escribir la prueba que falla.** En `tests/unit/jsonld-tours.test.ts`:

```ts
describe('itinerarioLd', () => {
  it('TouristTrip con itinerary de lugares en orden', () => {
    const r = itinerarioLd(
      { titulo: 'Plan', resumen: 'R' } as never,
      { url: '/es/guia/itinerarios/plan', base, lugares: [{ nombre: 'A', ruta: '/es/guia/lugares/a' }, { nombre: 'B', ruta: '/es/guia/lugares/b' }] },
    )
    expect(r).toMatchObject({
      '@type': 'TouristTrip', name: 'Plan', description: 'R', url: `${base}/es/guia/itinerarios/plan`,
      itinerary: { '@type': 'ItemList', itemListElement: [
        { '@type': 'ListItem', position: 1, item: { '@type': 'TouristAttraction', name: 'A', url: `${base}/es/guia/lugares/a` } },
        { '@type': 'ListItem', position: 2, item: { '@type': 'TouristAttraction', name: 'B', url: `${base}/es/guia/lugares/b` } },
      ] },
    })
  })
})
```

- [ ] **Paso 2: correrla y ver que falla.**

- [ ] **Paso 3: implementar.** En `jsonld.ts`:

```ts
export function itinerarioLd(i: { titulo: string; resumen: string }, c: { url: string; base: string; lugares: { nombre: string; ruta: string }[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: i.titulo,
    description: i.resumen,
    url: absoluta(c.url, c.base),
    itinerary: {
      '@type': 'ItemList',
      itemListElement: c.lugares.map((l, n) => ({
        '@type': 'ListItem', position: n + 1,
        item: { '@type': 'TouristAttraction', name: l.nombre, url: absoluta(l.ruta, c.base) },
      })),
    },
  }
}
```

En `ToursEnZona.tsx`, agregar `'itinerario' | 'tema'` al tipo `Origen`.

En `textos.ts`, agregar una sección `plan`:

```ts
  plan: {
    dias: (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`,
    diasEn: (n: number, z: string) => `${n} ${n === 1 ? 'día' : 'días'} en ${z}`,
    dia: (n: number, t: string | null) => (t ? `Día ${n}: ${t}` : `Día ${n}`),
    reservaTours: 'Reserva los tours de este plan',
    toursParaPlan: 'Tours para este plan',
    planesEn: (z: string) => `Planes en ${z}`,
    planesBaja: 'Planes en la Baja',
    paraPlanear: 'Para planear',
    hayGuia: (t: string) => `Hay una guía sobre esto: ${t}`,
  },
```

y en inglés:

```ts
  plan: {
    dias: (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`,
    diasEn: (n: number, z: string) => `${n} ${n === 1 ? 'day' : 'days'} in ${z}`,
    dia: (n: number, t: string | null) => (t ? `Day ${n}: ${t}` : `Day ${n}`),
    reservaTours: 'Book the tours in this plan',
    toursParaPlan: 'Tours for this plan',
    planesEn: (z: string) => `Plans in ${z}`,
    planesBaja: 'Plans in Baja',
    paraPlanear: 'Plan your trip',
    hayGuia: (t: string) => `There is a guide about this: ${t}`,
  },
```

```tsx
// src/sitio/ui/itinerario/ToursDelPlan.tsx
import type { Locale } from '../../../dominio/idioma'
import { atribucion } from '../../../dominio/rutas'
import type { TourConFoto } from '../../datos/cacheadas'
import { sitioUrl } from '../../entorno'
import { toursLd } from '../../seo/jsonld'
import { JsonLd } from '../JsonLd'
import { TarjetaTour } from '../TarjetaTour'
import type { Origen } from '../ToursEnZona'

// Recibe los tours ya resueltos por la página y emite el único JSON-LD de tours de esa página.
export function ToursDelPlan({ lang, titulo, tours, pieza, origen, zonaDe }: {
  lang: Locale; titulo: string; tours: TourConFoto[]; pieza: string; origen: Origen; zonaDe: (t: TourConFoto) => string
}) {
  if (!tours.length) return null
  return (
    <section className="bloque" aria-labelledby="t-tours-plan">
      <h2 id="t-tours-plan" className="t-seccion">{titulo}</h2>
      {tours.map((t) => (
        <TarjetaTour key={t.clave} lang={lang} tour={t} enlace={{ href: `${sitioUrl()}${t.ruta}?${atribucion(pieza)}`, 'data-evento': 'tour_clic', 'data-zona': zonaDe(t), 'data-origen': origen }} />
      ))}
      <JsonLd datos={toursLd(tours, { lang, base: sitioUrl() })} />
    </section>
  )
}
```

```tsx
// src/sitio/ui/itinerario/DiaItinerario.tsx
import type { Locale } from '../../../dominio/idioma'
import { paradaVisible, type Dia } from '../../../dominio/itinerarios'
import { atribucion } from '../../../dominio/rutas'
import type { TourConFoto } from '../../datos/cacheadas'
import type { Resolutor } from '../../datos/consultas'
import type { CategoriaPublica, Imagen, TarjetaLugar } from '../../datos/tipos'
import { sitioUrl } from '../../entorno'
import { textos } from '../../textos'
import { CuerpoRico } from '../CuerpoRico'
import { TarjetaLugar as Tarjeta } from '../tarjetas/TarjetaLugar'
import { TarjetaTour } from '../TarjetaTour'

// `notas`: las notas ya enlazadas, con clave `{índice del día}-{índice de la parada}` contados sobre el documento.
export function DiaItinerario({ lang, n, dia, lugares, tours, categorias, zona, slug, notas, resolutor, media }: {
  lang: Locale; n: number; dia: Dia; lugares: Map<number, TarjetaLugar>; tours: Map<string, TourConFoto>
  categorias: CategoriaPublica[]; zona: { slug: string; nombre: string }; slug: string
  notas: Map<string, unknown>; resolutor: Resolutor; media: Record<string, Imagen>
}) {
  const visibles = dia.paradas.map((p, i) => ({ p, i })).filter(({ p }) => paradaVisible(p, p.lugarId !== null && lugares.has(p.lugarId), p.tour !== null && tours.has(p.tour)))
  if (!visibles.length) return null
  return (
    <section className="bloque dia-itinerario">
      <h2 className="t-seccion">{textos(lang).plan.dia(n, dia.titulo)}</h2>
      {visibles.map(({ p, i }) => {
        const lugar = p.lugarId !== null ? lugares.get(p.lugarId) : undefined
        const tour = p.tour ? tours.get(p.tour) : undefined
        return (
          <div key={i} className="parada">
            {p.hora && <p className="parada__hora">{p.hora}</p>}
            {lugar && <Tarjeta lang={lang} lugar={lugar} categoria={categorias.find((c) => c.id === lugar.categoriaIds[0])} zonaNombre={zona.nombre} />}
            {tour && <TarjetaTour lang={lang} tour={tour} enlace={{ href: `${sitioUrl()}${tour.ruta}?${atribucion(`itinerario-${slug}-dia${n}`)}`, 'data-evento': 'tour_clic', 'data-zona': zona.slug, 'data-origen': 'itinerario' }} />}
            {p.nota && <CuerpoRico lang={lang} cuerpo={notas.get(`${n - 1}-${i}`)} resolutor={resolutor} media={media} categorias={categorias} className="parada__nota" />}
          </div>
        )
      })}
    </section>
  )
}
```

La página, siguiendo el patrón de `articulos/[slug]/page.tsx` (ISR, `generateStaticParams = () => []`, `cargar`, `generateMetadata` con `rutasPorIdioma` y `versionesDe`, y `NoEncontradoEnSuspense` con segmentos `['itinerarios', slug]`):

```tsx
// src/app/(sitio)/[lang]/guia/itinerarios/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { fechaLarga } from '../../../../../../dominio/fechas-evento'
import { esLocale, type Locale } from '../../../../../../dominio/idioma'
import { clavesDeItinerario, lugaresDeParadas } from '../../../../../../dominio/itinerarios'
import { enlazarMenciones } from '../../../../../../dominio/menciones'
import { relacionadosVisibles } from '../../../../../../dominio/presencia'
import { rutas } from '../../../../../../dominio/rutas'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, fichaItinerarioCacheada, itinerariosCacheados, lugaresCacheados, temasCacheados, toursDeSede, zonasActivasCacheadas,
} from '../../../../../../sitio/datos/cacheadas'
import { documentoPorSlug, porId, resolutorDeCuerpo } from '../../../../../../sitio/datos/consultas'
import { candidatosMencion } from '../../../../../../sitio/datos/menciones'
import { guiaIndexable, sitioUrl } from '../../../../../../sitio/entorno'
import { rutasPorIdioma } from '../../../../../../sitio/paginas/comun'
import { faqLd, itinerarioLd, migasLd } from '../../../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../../../sitio/seo/metadatos'
import { versionesDe } from '../../../../../../sitio/seo/versiones'
import { textos } from '../../../../../../sitio/textos'
import { CuerpoRico } from '../../../../../../sitio/ui/CuerpoRico'
import { Imagen } from '../../../../../../sitio/ui/Imagen'
import { DiaItinerario } from '../../../../../../sitio/ui/itinerario/DiaItinerario'
import { ToursDelPlan } from '../../../../../../sitio/ui/itinerario/ToursDelPlan'
import { JsonLd } from '../../../../../../sitio/ui/JsonLd'
import { Migas } from '../../../../../../sitio/ui/Migas'
import { NoEncontradoEnSuspense } from '../../../../../../sitio/ui/NoEncontradoEnSuspense'
import { PreguntasFrecuentes } from '../../../../../../sitio/ui/PreguntasFrecuentes'

export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string; slug: string }> }

const cargar = (lang: Locale, slug: string) => documentoPorSlug(itinerariosCacheados(lang), (id) => fichaItinerarioCacheada(id, lang), slug)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  if (!esLocale(lang)) return {}
  const d = await cargar(lang, slug)
  if (!d) return {}
  const rutasIdioma = await rutasPorIdioma(async (l) => {
    const x = porId(await itinerariosCacheados(l), d.ficha.id)
    return x ? rutas.itinerario(l, x.slug) : undefined
  })
  const { propia, versiones } = versionesDe({ lang, guiaIndexable: guiaIndexable(), rutas: rutasIdioma, noIndexar: d.ficha.noIndexar })
  return metadatos({
    lang, titulo: d.ficha.metaTitulo ?? d.ficha.titulo, descripcion: d.ficha.metaDescripcion ?? d.ficha.resumen,
    ruta: propia.ruta, indexable: propia.indexable, versiones, imagenOg: rutas.og(lang, 'itinerario', [d.ficha.slug]),
  })
}

export default async function PaginaItinerario({ params }: Props) {
  const { lang, slug } = await params
  if (!esLocale(lang)) notFound()
  const d = await cargar(lang, slug)
  if (!d) return <NoEncontradoEnSuspense lang={lang} segmentos={['itinerarios', slug]} />
  const it = d.ficha
  const [zonas, cats, lugares, eventos, articulos, temas] = await Promise.all([
    zonasActivasCacheadas(lang), categoriasCacheadas(lang), lugaresCacheados(lang), eventosCacheados(lang), articulosCacheados(lang), temasCacheados(lang),
  ])
  const zona = porId(zonas, it.zonaId)
  if (!zona) notFound()
  const t = textos(lang)

  // Los tours se resuelven una sola vez: DiaItinerario pinta las tarjetas y ToursDelPlan emite el único JSON-LD.
  const todos = zona.sedeSlug ? await toursDeSede(zona.sedeSlug, lang) : []
  const visibles = relacionadosVisibles(todos, clavesDeItinerario(it.dias))
  const porClave = new Map(visibles.map((x) => [x.clave, x]))
  const lugaresPorId = new Map(lugares.map((l) => [l.id, l]))
  const idsParada = lugaresDeParadas(it.dias)

  // Enlaces automáticos: el cuerpo y las notas comparten un solo presupuesto (spec §2.2). Cada nota se envuelve en un
  // párrafo Lexical; los lugares que salen como tarjeta de parada no se enlazan.
  const nota = (texto: string) => ({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: texto, format: 0 }] }] } })
  const conNota = it.dias.flatMap((dia, d) => dia.paradas.flatMap((p, i) => (p.nota ? [{ clave: `${d}-${i}`, cuerpo: nota(p.nota) }] : [])))
  const [cuerpo, ...enlazadas] = enlazarMenciones([it.cuerpo, ...conNota.map((x) => x.cuerpo)], candidatosMencion(lugares), { excluir: idsParada })
  const notas = new Map<string, unknown>(conNota.map((x, i) => [x.clave, enlazadas[i]]))
  const resolutor = resolutorDeCuerpo({ lugares, eventos, articulos, itinerarios: d.lista, temas }, lang)

  const ruta = rutas.itinerario(lang, it.slug)
  const migas = [
    { nombre: t.migas.guia, ruta: rutas.portada(lang) },
    { nombre: zona.nombre, ruta: rutas.zona(lang, zona.slug) },
    { nombre: it.titulo, ruta },
  ]
  const lugaresLd = idsParada.flatMap((id) => {
    const l = lugaresPorId.get(id)
    return l ? [{ nombre: l.nombre, ruta: rutas.lugar(lang, l.slug) }] : []
  })

  return (
    <div className="ancho pagina-articulo">
      <Migas lang={lang} migas={migas} />
      <header className="art-cabeza">
        <h1>{it.titulo}</h1>
        <p className="resumen">{it.resumen}</p>
        <div className="firma">
          <span>{t.plan.diasEn(it.numeroDias, zona.nombre)}</span>
          {it.autorNombre && <span>{t.articulo.por} <strong>{it.autorNombre}</strong></span>}
          {it.actualizadoEl && <span>{t.articulo.actualizado(fechaLarga(it.actualizadoEl, lang))}</span>}
        </div>
      </header>
      {it.portada && <div className="art-portada"><Imagen imagen={it.portada} prioridad sizes="(min-width: 1120px) 1120px, 100vw" /></div>}
      <div className="art-cuerpo">
        <CuerpoRico lang={lang} cuerpo={cuerpo} resolutor={resolutor} media={it.media} categorias={cats} className="prosa" piezaTours={`itinerario-${it.slug}`} origenTours="itinerario" />
        {it.dias.map((dia, i) => <DiaItinerario key={i} lang={lang} n={i + 1} dia={dia} lugares={lugaresPorId} tours={porClave} categorias={cats} zona={zona} slug={it.slug} notas={notas} resolutor={resolutor} media={it.media} />)}
        <ToursDelPlan lang={lang} titulo={t.plan.reservaTours} tours={visibles} pieza={`itinerario-${it.slug}-resumen`} origen="itinerario" zonaDe={() => zona.slug} />
        {it.preguntas.length > 0 && (
          <section className="bloque" aria-labelledby="t-preguntas">
            <h2 id="t-preguntas" className="t-seccion">{t.ficha.preguntas}</h2>
            <PreguntasFrecuentes preguntas={it.preguntas} etiqueta={t.ficha.preguntas} />
          </section>
        )}
      </div>
      <JsonLd datos={migasLd(migas, sitioUrl())} />
      <JsonLd datos={itinerarioLd(it, { url: ruta, base: sitioUrl(), lugares: lugaresLd })} />
      {it.preguntas.length > 0 && <JsonLd datos={faqLd(it.preguntas)} />}
    </div>
  )
}
```

En `src/sitio/estilos/articulo.css`:

```css
.parada { margin-block: 16px; }
.parada__hora { font-weight: 700; color: var(--texto-suave, inherit); }
```

- [ ] **Paso 4: correr.** `npm run typecheck`, `npm run test:unit`.

- [ ] **Paso 5: commit** con mensaje `feat: página de itinerario`.

### Tarea 7: página del tema

**Archivos:**
- Crear: `src/app/(sitio)/[lang]/guia/temas/[slug]/page.tsx`

- [ ] **Paso 1: implementar** (la prueba de esta página es la E2E de la tarea 9). El `noIndexar` de los metadatos incluye el umbral de lugares.

```tsx
// src/app/(sitio)/[lang]/guia/temas/[slug]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { esLocale, type Locale } from '../../../../../../dominio/idioma'
import { enlazarMenciones } from '../../../../../../dominio/menciones'
import { relacionadosVisibles } from '../../../../../../dominio/presencia'
import { rutas } from '../../../../../../dominio/rutas'
import { lugaresDeTema, temaIndexable } from '../../../../../../dominio/temas'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, fichaTemaCacheada, itinerariosCacheados, lugaresCacheados, temasCacheados, toursDeSede, zonasActivasCacheadas,
} from '../../../../../../sitio/datos/cacheadas'
import { articulosDeZona, documentoPorSlug, porId, resolutorDeCuerpo } from '../../../../../../sitio/datos/consultas'
import { candidatosMencion } from '../../../../../../sitio/datos/menciones'
import { guiaIndexable, sitioUrl } from '../../../../../../sitio/entorno'
import { rutasPorIdioma } from '../../../../../../sitio/paginas/comun'
import { faqLd, listaLd, migasLd } from '../../../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../../../sitio/seo/metadatos'
import { versionesDe } from '../../../../../../sitio/seo/versiones'
import { textos } from '../../../../../../sitio/textos'
import { CuerpoRico } from '../../../../../../sitio/ui/CuerpoRico'
import { Imagen } from '../../../../../../sitio/ui/Imagen'
import { ToursDelPlan } from '../../../../../../sitio/ui/itinerario/ToursDelPlan'
import { JsonLd } from '../../../../../../sitio/ui/JsonLd'
import { Migas } from '../../../../../../sitio/ui/Migas'
import { NoEncontradoEnSuspense } from '../../../../../../sitio/ui/NoEncontradoEnSuspense'
import { PreguntasFrecuentes } from '../../../../../../sitio/ui/PreguntasFrecuentes'
import { TarjetaLugar } from '../../../../../../sitio/ui/tarjetas/TarjetaLugar'
import { ToursEnZona } from '../../../../../../sitio/ui/ToursEnZona'

export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string; slug: string }> }

const cargar = (lang: Locale, slug: string) => documentoPorSlug(temasCacheados(lang), (id) => fichaTemaCacheada(id, lang), slug)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  if (!esLocale(lang)) return {}
  const d = await cargar(lang, slug)
  if (!d) return {}
  const rutasIdioma = await rutasPorIdioma(async (l) => {
    const x = porId(await temasCacheados(l), d.ficha.id)
    return x ? rutas.tema(l, x.slug) : undefined
  })
  const [lugares, zonas] = await Promise.all([lugaresCacheados(lang), zonasActivasCacheadas(lang)])
  const n = lugaresDeTema(d.ficha.criterios, { lugares, zonasActivasIds: zonas.map((z) => z.id) }, new Date()).length
  const { propia, versiones } = versionesDe({ lang, guiaIndexable: guiaIndexable(), rutas: rutasIdioma, noIndexar: d.ficha.noIndexar || !temaIndexable(n) })
  return metadatos({
    lang, titulo: d.ficha.metaTitulo ?? d.ficha.titulo, descripcion: d.ficha.metaDescripcion ?? d.ficha.resumen,
    ruta: propia.ruta, indexable: propia.indexable, versiones, imagenOg: rutas.og(lang, 'tema', [d.ficha.slug]),
  })
}

export default async function PaginaTema({ params }: Props) {
  const { lang, slug } = await params
  if (!esLocale(lang)) notFound()
  const d = await cargar(lang, slug)
  if (!d) return <NoEncontradoEnSuspense lang={lang} segmentos={['temas', slug]} />
  const tema = d.ficha
  const [zonas, cats, lugares, eventos, articulos, itinerarios] = await Promise.all([
    zonasActivasCacheadas(lang), categoriasCacheadas(lang), lugaresCacheados(lang), eventosCacheados(lang), articulosCacheados(lang), itinerariosCacheados(lang),
  ])
  const t = textos(lang)
  const ahora = new Date()
  const zona = tema.zonaId !== null ? porId(zonas, tema.zonaId) ?? null : null
  const lista = lugaresDeTema(tema.criterios, { lugares, zonasActivasIds: zonas.map((z) => z.id) }, ahora)

  // Cada sede se lee una vez; una sede caída solo quita sus filas (toursDeSede atrapa el error).
  const sedes = new Map(zonas.filter((z) => z.sedeSlug).map((z) => [z.id, z]))
  const zonaIds = [...new Set(tema.tours.map((f) => f.zonaId))].filter((id) => sedes.has(id))
  const porZona = new Map(await Promise.all(zonaIds.map(async (id) => [id, await toursDeSede(sedes.get(id)!.sedeSlug!, lang)] as const)))
  const zonaDeClave = new Map<string, string>()
  const tours = tema.tours.flatMap((f) => {
    const [x] = relacionadosVisibles(porZona.get(f.zonaId) ?? [], [f.clave])
    if (!x || zonaDeClave.has(x.clave)) return []
    zonaDeClave.set(x.clave, sedes.get(f.zonaId)!.slug)
    return [x]
  })

  const [introduccion] = enlazarMenciones([tema.introduccion], candidatosMencion(lugares))
  const ruta = rutas.tema(lang, tema.slug)
  const migas = [
    { nombre: t.migas.guia, ruta: rutas.portada(lang) },
    ...(zona ? [{ nombre: zona.nombre, ruta: rutas.zona(lang, zona.slug) }] : []),
    { nombre: tema.titulo, ruta },
  ]
  const paraPlanear = zona
    ? [...itinerarios.filter((x) => x.zonaId === zona.id).map((x) => ({ titulo: x.titulo, ruta: rutas.itinerario(lang, x.slug) })),
       ...articulosDeZona(articulos, zona.id).map((x) => ({ titulo: x.titulo, ruta: rutas.articulo(lang, x.slug) }))].slice(0, 3)
    : []

  return (
    <div className="ancho pagina-articulo">
      <Migas lang={lang} migas={migas} />
      <header className="art-cabeza">
        <h1>{tema.titulo}</h1>
        <p className="resumen">{tema.resumen}</p>
      </header>
      {tema.portada && <div className="art-portada"><Imagen imagen={tema.portada} prioridad sizes="(min-width: 1120px) 1120px, 100vw" /></div>}
      <div className="art-cuerpo">
        <CuerpoRico lang={lang} cuerpo={introduccion} resolutor={resolutorDeCuerpo({ lugares, eventos, articulos, itinerarios, temas: d.lista }, lang)} media={tema.media} categorias={cats} className="prosa" piezaTours={`tema-${tema.slug}`} origenTours="tema" />
        <ToursDelPlan lang={lang} titulo={t.plan.toursParaPlan} tours={tours} pieza={`tema-${tema.slug}`} origen="tema" zonaDe={(x) => zonaDeClave.get(x.clave) ?? ''} />
        {!tema.tours.length && zona && <ToursEnZona lang={lang} zona={zona} pieza={`tema-${tema.slug}`} origen="tema" formato="riel" />}
        {lista.length > 0 && (
          <section className="bloque">
            {lista.map((l) => <TarjetaLugar key={l.id} lang={lang} lugar={l} categoria={porId(cats, l.categoriaIds[0])} zonaNombre={porId(zonas, l.zonaId)?.nombre ?? ''} />)}
          </section>
        )}
        {tema.preguntas.length > 0 && (
          <section className="bloque" aria-labelledby="t-preguntas">
            <h2 id="t-preguntas" className="t-seccion">{t.ficha.preguntas}</h2>
            <PreguntasFrecuentes preguntas={tema.preguntas} etiqueta={t.ficha.preguntas} />
          </section>
        )}
        {paraPlanear.length > 0 && (
          <section className="bloque" aria-labelledby="t-planear">
            <h2 id="t-planear" className="t-seccion">{t.plan.paraPlanear}</h2>
            <ul>{paraPlanear.map((x) => <li key={x.ruta}><Link href={x.ruta}>{x.titulo}</Link></li>)}</ul>
          </section>
        )}
      </div>
      <JsonLd datos={migasLd(migas, sitioUrl())} />
      <JsonLd datos={listaLd(lista.map((l) => ({ nombre: l.nombre, ruta: rutas.lugar(lang, l.slug) })), sitioUrl())} />
      {tema.preguntas.length > 0 && <JsonLd datos={faqLd(tema.preguntas)} />}
    </div>
  )
}
```

`lugaresDeTema` se calcula en `generateMetadata` y en la página: son listas ya en memoria, y Next las pide por caché.

- [ ] **Paso 2: correr.** `npm run typecheck`.

- [ ] **Paso 3: commit** con mensaje `feat: página de tema`.

### Tarea 8: enlaces, sitemap, contexto y presencia

**Archivos:**
- Crear: `src/sitio/ui/tarjetas/TarjetaPlan.tsx`, `src/sitio/ui/SeccionPlanes.tsx`
- Modificar: `src/sitio/datos/consultas.ts`, `src/sitio/contexto.ts`, `src/sitio/seo/sitemap.ts`, `src/app/(sitio)/guia-sitemap.xml/route.ts`, `src/app/(sitio)/guia-assets/og/[lang]/[tipo]/[[...ruta]]/route.tsx`, `src/sitio/ui/navegacion/destino.ts`, `src/sitio/ui/presencia/PresenciaTours.tsx`, `src/app/(sitio)/[lang]/guia/[zona]/page.tsx`, `src/app/(sitio)/[lang]/guia/page.tsx`, `src/app/(sitio)/[lang]/guia/lugares/[slug]/page.tsx`, `src/sitio/paginas/CategoriaEnZona.tsx`
- Prueba: `tests/unit/contexto.test.ts`, `tests/unit/esqueletos.test.ts`, `tests/unit/sitemap.test.ts` (o el archivo que pruebe `entradasSitemap`)

- [ ] **Paso 1: escribir las pruebas que fallan.**

`tests/unit/contexto.test.ts`: agregar al mock de `cacheadas`:

```ts
  itinerariosCacheados: async (lang: string) => [{ id: 1, slug: lang === 'es' ? 'plan' : 'plan-en', zonaId: 1 }],
  temasCacheados: async (lang: string) => [{ id: 2, slug: lang === 'es' ? 'tema-baja' : 'tema-baja-en', zonaId: null }],
```

y estos casos:

```ts
it('itinerario: alterno en el otro idioma y su zona', async () => {
  const c = await contextoDe('es', ['itinerarios', 'plan'])
  expect(c.alterno).toBe('/en/guide/itineraries/plan-en')
  expect(c.zona?.id).toBe(1)
})
it('tema sin zona: alterno en el otro idioma y zona nula', async () => {
  const c = await contextoDe('es', ['temas', 'tema-baja'])
  expect(c.alterno).toBe('/en/guide/topics/tema-baja-en')
  expect(c.zona).toBeNull()
})
```

`tests/unit/esqueletos.test.ts`:

```ts
it('itinerarios y temas usan el esqueleto de artículo', () => {
  expect(destinoDe('/es/guia/itinerarios/x', 'https://x.test/es/guia')).toBe('articulo')
  expect(destinoDe('/en/guide/topics/x', 'https://x.test/en/guide')).toBe('articulo')
})
```

En la prueba de `entradasSitemap`, con `DatosIdioma` ampliado (`itinerarios: []`, `temas: []` en los fixtures existentes):

```ts
it('itinerarios indexables y temas según su lista', () => {
  const entradas = entradasSitemap(datosCon({ itinerarios: [{ id: 1, slug: 'plan', noIndexar: false }], temas: [
    { id: 2, slug: 'con-tres', noIndexar: false, criterios: criteriosCon([1, 2, 3]) },
    { id: 3, slug: 'con-dos', noIndexar: false, criterios: criteriosCon([1, 2]) },
  ] }), true).map((e) => e.ruta)
  expect(entradas).toContain('/es/guia/itinerarios/plan')
  expect(entradas).toContain('/es/guia/temas/con-tres')
  expect(entradas).not.toContain('/es/guia/temas/con-dos')
})
```

(`datosCon` arma los `DatosIdioma` del archivo con 3 lugares de ids 1, 2 y 3; `criteriosCon(ids)` es `{ zonaId: null, categoriaIds: [], caracteristicas: [], servicios: [], lugaresFijosIds: ids }`.)

- [ ] **Paso 2: correrlas y ver que fallan.**

- [ ] **Paso 3: implementar.**

`src/sitio/contexto.ts`, en `DOCUMENTOS`:

```ts
  [SEGMENTOS.es.itinerarios]: resolutor(itinerariosCacheados, rutas.itinerario, (x) => x.zonaId),
  [SEGMENTOS.es.temas]: resolutor(temasCacheados, rutas.tema, (x) => x.zonaId ?? undefined),
```

`src/sitio/ui/navegacion/destino.ts`, junto a `articulos`:

```ts
  if (primero === s.articulos || primero === s.itinerarios || primero === s.temas) return 'articulo'
```

`src/sitio/seo/sitemap.ts`: sumar a `DatosIdioma` `itinerarios: TarjetaItinerario[]; temas: TarjetaTema[]`. Al final de `entradasSitemap`:

```ts
  docs((d) => d.itinerarios, rutas.itinerario)
  const temaIds = new Set(LOCALES.flatMap((l) => datos[l].temas.map((x) => x.id)))
  for (const id of temaIds) {
    agregar(s, porIdioma((l, d) => {
      const x = d.temas.find((y) => y.id === id)
      if (!x) return null
      const n = lugaresDeTema(x.criterios, { lugares: d.lugares, zonasActivasIds: d.zonas.map((z) => z.id) }, new Date()).length
      return { ruta: rutas.tema(l, x.slug), indexable: !x.noIndexar && temaIndexable(n) }
    }))
  }
```

`guia-sitemap.xml/route.ts`: agregar `itinerariosCacheados(l)` y `temasCacheados(l)` al `Promise.all`, y `itinerarios, temas` al objeto.

Ruta OG, en `datosOg`:

```ts
  if (tipo === 'itinerario') {
    const x = porSlug(await itinerariosCacheados(lang), a ?? '')
    return x ? { titulo: x.titulo, imagen: x.portada } : null
  }
  if (tipo === 'tema') {
    const x = porSlug(await temasCacheados(lang), a ?? '')
    return x ? { titulo: x.titulo, imagen: x.portada } : null
  }
```

`PresenciaTours.tsx`, cambiando el cálculo de `claves`:

```ts
    const claves = await clavesDeLaPagina(lang, tipo, segmentos, zona.id)
```

y agregando arriba del componente:

```ts
async function clavesDeLaPagina(lang: Locale, tipo: TipoPagina, segmentos: string[], zonaId: number): Promise<string[]> {
  if (tipo === 'ficha') return porSlug(await lugaresCacheados(lang), segmentos[1])?.toursRelacionados ?? []
  if (segmentos[0] === SEGMENTOS.es.itinerarios) return porSlug(await itinerariosCacheados(lang), segmentos[1])?.clavesTours ?? []
  if (segmentos[0] === SEGMENTOS.es.temas) {
    const tema = porSlug(await temasCacheados(lang), segmentos[1])
    return (tema?.tours ?? []).filter((f) => f.zonaId === zonaId).map((f) => f.clave)
  }
  return []
}
```

```tsx
// src/sitio/ui/tarjetas/TarjetaPlan.tsx
import Link from 'next/link'

import type { Locale } from '../../../dominio/idioma'
import { rutas } from '../../../dominio/rutas'
import type { Plan } from '../../datos/consultas'
import { textos } from '../../textos'
import { Imagen } from '../Imagen'

export function TarjetaPlan({ lang, plan }: { lang: Locale; plan: Plan }) {
  const ruta = plan.tipo === 'itinerario' ? rutas.itinerario(lang, plan.item.slug) : rutas.tema(lang, plan.item.slug)
  return (
    <Link className="nota tarjeta presionable" href={ruta}>
      <div className="media"><Imagen imagen={plan.item.portada} sizes="(min-width: 720px) 33vw, 100vw" alt="" /></div>
      <div className="nota__cuerpo">
        {plan.tipo === 'itinerario' && <span><span className="etiqueta">{textos(lang).plan.dias(plan.item.numeroDias)}</span></span>}
        <p className="titular">{plan.item.titulo}</p>
        <p className="bajada">{plan.item.resumen}</p>
      </div>
    </Link>
  )
}
```

```tsx
// src/sitio/ui/SeccionPlanes.tsx
import type { Locale } from '../../dominio/idioma'
import type { Plan } from '../datos/consultas'
import { TarjetaPlan } from './tarjetas/TarjetaPlan'

export function SeccionPlanes({ lang, titulo, planes, id }: { lang: Locale; titulo: string; planes: Plan[]; id: string }) {
  if (!planes.length) return null
  return (
    <section className="seccion" aria-labelledby={id}>
      <div className="seccion__cabeza"><h2 id={id} className="t-seccion">{titulo}</h2></div>
      <div className="mas-art">{planes.map((p) => <TarjetaPlan key={`${p.tipo}-${p.item.id}`} lang={lang} plan={p} />)}</div>
    </section>
  )
}
```

En `src/sitio/datos/consultas.ts`, ampliar `ItemDestacado`, `nombreDe` y `destacados` en este mismo commit, junto con sus dos consumidores de abajo:

```ts
export type ItemDestacado =
  | { tipo: 'lugar'; item: TarjetaLugar }
  | { tipo: 'evento'; item: TarjetaEvento }
  | { tipo: 'articulo'; item: TarjetaArticulo }
  | { tipo: 'itinerario'; item: TarjetaItinerario }
  | { tipo: 'tema'; item: TarjetaTema }

const nombreDe = (x: ItemDestacado) => ('titulo' in x.item ? x.item.titulo : x.item.nombre)
```

En `destacados`, sumar a su parámetro `itinerarios?: TarjetaItinerario[]; temas?: TarjetaTema[]`, y a `todos`:

```ts
    ...(l.itinerarios ?? []).filter((x) => x.destacado.activo).map((item) => ({ tipo: 'itinerario' as const, item })),
    ...(l.temas ?? []).filter((x) => x.destacado.activo).map((item) => ({ tipo: 'tema' as const, item })),
```

Página de zona (`[zona]/page.tsx`): sumar `itinerariosCacheados(lang)` y `temasCacheados(lang)` al `Promise.all`; sumar `zonas: ZonaPublica[]; itinerarios: TarjetaItinerario[]; temas: TarjetaTema[]` al tipo `Datos` y pasar los tres a `<Zona>`. Después del bloque `.fila-tres` de artículos y antes de `.filtros`:

```tsx
      <SeccionPlanes lang={lang} id="t-planes" titulo={t.plan.planesEn(zona.nombre)} planes={planesDeZona(itinerarios, temas, zona.id, { lugares, zonasActivasIds: zonas.map((z) => z.id) }, new Date())} />
```

Actualizar `destacados(...)`, con las listas de esta zona como las otras:

```ts
  const top = destacados({
    lugares: lugaresZona, eventos: proximos, articulos: artsZona,
    itinerarios: itinerarios.filter((x) => x.zonaId === zona.id), temas: temas.filter((x) => x.zonaId === zona.id),
  }, ahora)
```

y `aDiapositiva`, que ahora recibe dos tipos más:

```ts
  if (d.tipo === 'articulo' || d.tipo === 'itinerario' || d.tipo === 'tema') {
    const ruta = d.tipo === 'articulo' ? rutas.articulo(lang, d.item.slug) : d.tipo === 'itinerario' ? rutas.itinerario(lang, d.item.slug) : rutas.tema(lang, d.item.slug)
    return { ...comun, imagen: d.item.portada, patrocinado: false, titulo: d.item.titulo, ruta }
  }
```

Portada (`guia/page.tsx`): sumar `itinerariosCacheados(lang)` y `temasCacheados(lang)` al `Promise.all`, pasarlos enteros a `destacados(...)` y, en `Destacada`, distinguir los tipos en `ruta`, `imagen`, `titulo` y `declarado`:

```ts
  const ruta = d.tipo === 'lugar' ? rutas.lugar(lang, d.item.slug) : d.tipo === 'evento' ? rutas.evento(lang, d.item.slug) : d.tipo === 'articulo' ? rutas.articulo(lang, d.item.slug) : d.tipo === 'itinerario' ? rutas.itinerario(lang, d.item.slug) : rutas.tema(lang, d.item.slug)
  const imagen = 'portada' in d.item ? d.item.portada : d.item.foto
  const titulo = 'titulo' in d.item ? d.item.titulo : d.item.nombre
  const declarado = (d.tipo === 'lugar' || d.tipo === 'evento') && patrocinioDeclarado(d.item.patrocinio)
```

Después de la sección de zonas y de `TemporadaPortada`:

```tsx
<SeccionPlanes lang={lang} id="t-planes-baja" titulo={t.plan.planesBaja} planes={planesSinZona(temas, { lugares, zonasActivasIds: zonas.map((z) => z.id) }, new Date())} />
```

Ficha (`lugares/[slug]/page.tsx`): sumar `itinerariosCacheados(lang)` y `temasCacheados(lang)` al `Promise.all`, calcular:

```tsx
  const planes = planesQueCitan(l.id, itinerarios, temas, { lugares, zonasActivasIds: zonas.map((z) => z.id) }, new Date(ahora))
```

Cambiar la condición de la sección «Aparece en» a `citan.length + planes.length > 0`, y dentro, después de las tarjetas de artículo:

```tsx
{planes.map((p) => <TarjetaPlan key={`${p.tipo}-${p.item.id}`} lang={lang} plan={p} />)}
```

Variante con filtros, en `src/sitio/paginas/CategoriaEnZona.tsx`. Importar `temasCacheados` y `temaParaFiltro`. Reemplazar el `Promise.all` de `texto` y `articulos` y calcular el tema:

```tsx
  const [texto, articulos, temas] = await Promise.all([textoCacheado(zona.id, cat.id, lang), articulosCacheados(lang), temasCacheados(lang)])
  const caracteristica = variante.filtros?.caracteristica
  const temaFiltro = caracteristica && !variante.filtros?.precio && !variante.filtros?.abierto
    ? temaParaFiltro(temas, { zonaId: zona.id, categoriaId: cat.id, caracteristica })
    : undefined
```

Dentro de `TransicionFiltros`, antes de `<p className="contador-res">`:

```tsx
        {temaFiltro && <p className="hay-guia"><Link href={rutas.tema(lang, temaFiltro.slug)}>{t.plan.hayGuia(temaFiltro.titulo)}</Link></p>}
```

En la página base `variante.filtros` no existe, así que no se muestra, y `temasCacheados` es una lectura cacheada que no la vuelve dinámica.

- [ ] **Paso 4: correr.** `npm run test:unit`, `npm run typecheck`, `npm run lint`.

- [ ] **Paso 5: commit** con mensaje `feat: enlaces, sitemap y contexto de itinerarios y temas`.

### Tarea 9: seed, E2E y documentación

**Archivos:**
- Modificar: `src/seed/datos.ts`, `docs/specs/2026-10-30-guia-baja-design.md`, `docs/editores/escribir-para-buscadores.md`
- Prueba: `tests/e2e/paquete-2.spec.ts`

- [ ] **Paso 1: seed.** En `src/seed/datos.ts`, después de crear los artículos:

```ts
  const itinerario = await payload.create({
    collection: 'itinerarios', locale: 'es', overrideAccess: true, context: { disableRevalidate: true },
    data: {
      titulo: 'Dos días en La Paz (prueba)', slug: 'dos-dias-en-la-paz-prueba', zona: zonas[0].id, autor: admin.id, portada: fotos[1].id,
      resumen: 'Plan de prueba de dos días.', cuerpo: parrafo('Introducción del plan de prueba.'), _status: 'published',
      dias: [
        { titulo: 'La playa', paradas: [{ hora: '08:00', lugar: lugares[5].id, nota: 'Llega temprano.' }, { tour: 'servicio:ballenas-prueba' }] },
        { titulo: 'La ciudad', paradas: [{ lugar: lugares[0].id }, { nota: 'Atardecer en el malecón.' }] },
      ],
    },
  })
  const esItin = await payload.findByID({ collection: 'itinerarios', id: itinerario.id, locale: 'es', depth: 0, overrideAccess: true })
  await payload.update({
    collection: 'itinerarios', id: itinerario.id, locale: 'en', overrideAccess: true, context: { disableRevalidate: true },
    data: {
      titulo: 'Two days in La Paz (sample)', slug: 'two-days-in-la-paz-sample', resumen: 'Sample two-day plan.', cuerpo: parrafo('Sample plan intro.'), _status: 'published',
      dias: esItin.dias!.map((d, i) => ({ id: d.id, titulo: i === 0 ? 'The beach' : null, paradas: d.paradas!.map((p) => ({ id: p.id, nota: p.nota ? 'Sample note.' : null })) })),
    },
  })
  await payload.create({
    collection: 'temas', locale: 'es', overrideAccess: true, context: { disableRevalidate: true },
    data: {
      titulo: 'Con niños en La Paz (prueba)', slug: 'con-ninos-en-la-paz-prueba', zona: zonas[0].id, autor: admin.id, resumen: 'Tema de prueba.',
      introduccion: parrafo('Introducción del tema de prueba.'), _status: 'published',
      lugaresFijos: [lugares[0].id, lugares[1].id, lugares[5].id],
      tours: [{ zona: zonas[0].id, tour: 'servicio:ballenas-prueba' }],
    },
  })
  await payload.create({
    collection: 'temas', locale: 'es', overrideAccess: true, context: { disableRevalidate: true },
    data: {
      titulo: 'Planes en la Baja (prueba)', slug: 'planes-en-la-baja-prueba', autor: admin.id, resumen: 'Tema sin zona de prueba.',
      introduccion: parrafo('Tema sin zona.'), _status: 'published', lugaresFijos: [lugares[0].id],
    },
  })
```

`lugares[5]` es «Playa Arena Fina». `admin` y `fotos` ya existen en ese punto de `datos.ts`.

- [ ] **Paso 2: escribir la E2E**

```ts
// tests/e2e/paquete-2.spec.ts
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
```

En `tests/e2e/preparar.ts`, crear el tema del filtro con un id de categoría real:

```ts
const restaurantes = await payload.find({ collection: 'categorias', where: { slug: { equals: 'restaurantes' } }, locale: 'es', overrideAccess: true, limit: 1 })
const zonaLaPaz = await payload.find({ collection: 'zonas', where: { slug: { equals: 'la-paz' } }, overrideAccess: true, limit: 1 })
const autor = await payload.find({ collection: 'users', overrideAccess: true, limit: 1 })
await payload.create({
  collection: 'temas', locale: 'es', overrideAccess: true, context: { disableRevalidate: true },
  data: {
    titulo: 'Restaurantes para niños (prueba)', slug: 'filtro-prueba', resumen: 'R', _status: 'published', autor: autor.docs[0].id,
    introduccion: { root: { type: 'root', version: 1, format: '', indent: 0, direction: 'ltr', children: [{ type: 'paragraph', version: 1, format: '', indent: 0, direction: 'ltr', textFormat: 0, children: [{ type: 'text', text: 'Intro.', format: 0, style: '', mode: 'normal', detail: 0, version: 1 }] }] } },
    zona: zonaLaPaz.docs[0].id, categorias: [restaurantes.docs[0].id], caracteristicas: ['para-ninos'],
  } as never,
})
```

Si esa categoría del seed no tiene un lugar con `para-ninos`, igual se muestra el aviso: el aviso no depende de que haya resultados. `tests/e2e/preparar.ts` corre después del seed, que vacía la colección, así que no se duplica.

- [ ] **Paso 3: correr la E2E.** Detener cualquier `next dev`. `npm run test:e2e`. Esperado: PASS en los dos modos, incluidas las E2E anteriores. `tests/int/seed.int.test.ts` puede necesitar los conteos nuevos.

- [ ] **Paso 4: documentación.**
  - Spec principal: §6 (colecciones Itinerarios y Temas), §7 (URLs nuevas), §9 (JSON-LD e indexabilidad del tema), §10 (etiquetas), §13 (orígenes `itinerario` y `tema`).
  - `docs/editores/escribir-para-buscadores.md`: cuándo conviene un itinerario y cuándo un tema; cómo traducir notas; cómo leer el aviso «se indexa / no se indexa».

- [ ] **Paso 5: verificación final.** `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:int`, `npm run test:e2e`. Medir con el banco del plan 4 y comprobar que la página del itinerario no pasa del LCP de la ficha + 100 ms.

- [ ] **Paso 6: commit y push** con mensaje `test: E2E del paquete 2, seed y documentación`.
