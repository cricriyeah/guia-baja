# Paquete 1: fichas y artículos que llevan a reservar. Plan de implementación

> **Para agentes:** sub-skill requerida: usar superpowers:subagent-driven-development (recomendada) o
> superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** que fichas, artículos y bloques de tours empujen a reservar. El paquete tiene siete piezas:
- bloque «Tour» en artículos;
- preguntas frecuentes en la ficha;
- «Antes de ir»;
- temporadas;
- JSON-LD `TouristTrip`;
- enlaces automáticos a las fichas;
- WhatsApp de tours.

**Arquitectura:**
- **Reglas puras en `src/dominio/`**, una por tema (temporada, visita, menciones, WhatsApp), con pruebas unitarias sin
  Payload ni Next.
- **Datos:** Payload guarda los datos nuevos y `src/sitio/datos/` los mapea a los tipos públicos. `toursDeSede` ordena
  por temporada fuera de la caché.
- **Pintado:** componentes de servidor en `src/sitio/ui/` pintan, y no agregan JavaScript al cliente.
- **JSON-LD:** sale de `src/sitio/seo/jsonld.ts`, con los mismos datos que se ven.

**Stack:** Next.js 16.4.3 (App Router, ISR), Payload 3.92.1 (Postgres, Lexical), Vitest, Playwright.

**Spec:** `docs/specs/2026-11-07-paquete-1-fichas-y-articulos-design.md` (aprobado). Lo complementan el spec
principal `docs/specs/2026-10-30-guia-baja-design.md` y el de presencia `docs/specs/2026-11-07-presencia-reservas-design.md`.

## Restricciones globales

- **Versiones y estilo:**
  - Versiones fijas: Node `^24.22.1`, Payload 3.92.1, Next.js 16.4.3. Nada de `^` en `package.json` ni dependencias
    nuevas.
  - Importaciones dentro de `src/` relativas, nunca `@/`.
  - URLs públicas solo desde `src/dominio/rutas.ts`.
- **Esquema y migraciones:**
  - Nunca `push` de esquema.
  - Antes del primer deploy a producción: `npm run migracion:regenerar -- --no-hay-deploy`. Si ya hubo deploy, una
    migración nueva con `npm run payload migrate:create`.
  - Después de tocar el esquema: `npm run generate:types` y `npm run generate:importmap`.
- **Datos y acceso:**
  - Acceso negado por defecto, con las reglas de `src/acceso/reglas.ts`.
  - Nunca datos reales en local, CI ni previews.
  - Los logs nunca llevan correo, teléfono ni IP.
  - El número de WhatsApp vive solo en `WHATSAPP_NUMERO` y nunca va al código ni al seed.
- **Páginas:**
  - Todo el contenido en el HTML del servidor. Las páginas siguen siendo ISR (`x-nextjs-cache: HIT` en la segunda
    visita).
  - No hay Cache Components ni PPR.
- **Medición:** `tour_clic` y `whatsapp_clic` llevan como máximo 2 propiedades (`zona`, `origen`); el detalle va en la
  pieza.
- **Repo:**
  - Commits en español, terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push directo a `main`.
  - Nunca se toca el sitio de reservas ni su API. El catálogo solo se lee.

---

## Mapa de archivos

### Reglas puras (`src/dominio/`)

| Archivo | Qué hace | Lo usan |
|---|---|---|
| `src/dominio/temporada.ts` (nuevo) | `MESES` (1–12 con nombres es/en), `mesEnBCS(ahora)`, `enTemporada(meses, mes)`, `mesesATexto(meses, lang)`, `ordenarPorTemporada(tours, mes)` (estable). `registroTourConDatos(datos, locale)`: la regla del registro vacío. Con `locale !== 'es'` devuelve `true` y no rechaza, porque `temporada` está localizada y en `en` no se ve el valor en español. Con `es` exige foto, `meses` no vacío (`[]` cuenta como vacío) o `temporada`. El paquete 3 la amplía con el perfil. | `cacheadas.ts`, `FotosTours.ts`, `PrecioTour.tsx`, `TemporadaPortada.tsx` |
| `src/dominio/visita.ts` (nuevo) | Tipo `VisitaPublica` (lo importa `sitio/datos/tipos.ts`). `SERVICIOS_VISITA` y `MEDIOS` (listas cerradas es/en), y las **etiquetas de las filas** (es/en), junto a esas listas, como en `CARACTERISTICAS`. `validarVisita(v)` (tiempo y medio juntos, `sin-servicios` solo), `filasVisita(v, lang, zonaNombre)` → `{ dato, valor }[]` con los textos ya en su idioma, `chipsVisita(v, lang, zonaNombre)`. | `Lugares.ts`, `AntesDeIr.tsx`, ficha |
| `src/dominio/menciones.ts` (nuevo) | `enlazarMenciones(cuerpos, candidatos, { excluir })`: función pura sobre JSON de Lexical (sección 2.6 del spec). Tipo `CandidatoMencion = { id, nombres: string[], enlazable: boolean }`. La lista lleva **todos** los lugares: los nombres compartidos se cuentan entre todos, y solo se enlazan los `enlazable`. Así un lugar patrocinado que comparte nombre sigue haciendo ambiguo ese nombre. | `src/sitio/datos/menciones.ts` |
| `src/dominio/whatsapp.ts` (nuevo) | `digitosWhatsapp(numero)` (10 a 15 dígitos o `null`), `enlaceWhatsapp(digitos, mensaje)`, `mensajeWhatsapp(lang, nombre)`. | `src/sitio/datos/whatsapp.ts`, `EnlaceWhatsapp.tsx`, `Pie.tsx` |
| `src/dominio/catalogo.ts` (modificar) | `PrecioDesde` suma `valor: number`: `Number(precioMxn)` o `aDolares(...)`, el mismo número que formatea `monto`. | `jsonld.ts` |
| `src/dominio/presencia.ts` (sin cambios) | `esClaveDeTour` y `relacionadosVisibles` ya existen. | bloque «Tour» |

### Esquema (Payload)

| Archivo | Cambio |
|---|---|
| `src/collections/Lugares.ts` | `preguntas` (lista es/en, máx. 8), grupo `visita` (validado con `validarVisita`), `otrosNombres` (texto `hasMany`, máx. 5), `enlazarMenciones` (casilla, encendida por defecto). |
| `src/collections/FotosTours.ts` | `meses` (select `hasMany` 1–12), `foto` opcional. Un `beforeValidate` evalúa `registroTourConDatos({ ...originalDoc, ...data }, req.locale)`: en una actualización `data` solo trae lo enviado. Etiqueta «Fotos y temporadas de tours». |
| `src/globals/AjustesGuia.ts` | `whatsappToursActivo` (casilla, apagada). |
| `src/bloques/articulo.ts` | Bloque `tour`: `zona` (relación) y `tour` (texto validado con `esClaveDeTour`, con el componente del admin en modo uno). |
| `src/admin/ToursRelacionados.tsx` | `clientProps`: `modo: 'varios' \| 'uno'` y `rutaZona?: string`. La zona sale de la ruta absoluta, o del hermano del `path` (último segmento cambiado por `zona`). |
| `src/migrations/*`, `src/payload-types.ts`, `src/app/(payload)/admin/importMap.js` | Regenerados. |

### Datos públicos (`src/sitio/datos/`)

| Archivo | Cambio |
|---|---|
| `tipos.ts` | `TarjetaLugar` suma `otrosNombres: string[]`, `enlazarMenciones: boolean` y `servicios: string[]`. `FichaLugar` suma `preguntas: { pregunta, respuesta }[]` y `visita: VisitaPublica \| null` (el tipo viene de `dominio/visita.ts`). |
| `mapeo.ts` | Mapea lo de arriba (localizado con la regla de idioma de siempre). |
| `lecturas/catalogo.ts` | `FotoTour` suma `meses: number[]`. |
| `cacheadas.ts` | `TourConFoto` suma `meses` y `enTemporada`. `toursDeSede` ordena con `ordenarPorTemporada(…, mesEnBCS(new Date()))`, fuera de `unstable_cache`. |
| `menciones.ts` (nuevo) | `candidatosMencion(lugares)`: pasa de `TarjetaLugar[]` a `CandidatoMencion[]` sin quitar ninguno. `enlazable` es falso con `enlazarMenciones` apagada o con patrocinio declarado (`patrocinioDeclarado`). |
| `whatsapp.ts` (nuevo) | `whatsappTours(lang)`: devuelve `string \| null`. Lee `ajustesCacheados` (`whatsappToursActivo`) y `whatsappNumero()`, y aplica `digitosWhatsapp`. |
| `lecturas/ajustes.ts` | Expone `whatsappToursActivo`. |

### JSON-LD (`src/sitio/seo/jsonld.ts`, modificar)

- `lugarLd` suma `@id` (`{url}#lugar`), `isAccessibleForFree` y `amenityFeature`.
- Nuevo `toursLd(tours, { lang, base, lugarId? })`: un `ItemList` de `TouristTrip` con `UnitPriceSpecification`.
  Omite `offers` sin precio o con `por_ruta`, y omite `unitText` vacío.

### Pintado (`src/sitio/ui/`)

| Archivo | Qué hace |
|---|---|
| `PreguntasFrecuentes.tsx` (nuevo) | El `<div class="faq">` con `<details>`, sacado de `CuerpoRico`. Lo usan el bloque del artículo y la ficha. |
| `AntesDeIr.tsx` (nuevo) | La sección «Antes de ir» con la tabla de `filasVisita`. |
| `TarjetaTour.tsx` (nuevo) | La tarjeta grande de un tour, con foto, precio, duración, temporada, «Ver tour» y la frase «{nombre}, desde {precio}.». No sabe de qué página viene: recibe `href` y los `data-*`. |
| `BloqueTour.tsx` (nuevo, async) | El bloque «Tour». Contrato: `BloqueTour({ lang, zonaId, clave, pieza, origen })`. Resuelve la zona, llama a `toursDeSede` y busca la clave; pinta `TarjetaTour` y `toursLd`. Sin tour visible no pinta nada. No sabe de artículos: el paquete 2 lo reusa con otra pieza y otro origen. |
| `EnlaceWhatsapp.tsx` (nuevo) | El link `wa.me` con `data-evento="whatsapp_clic"`, `data-zona` y `data-origen`, en variante texto o icono. Recibe los dígitos y el mensaje ya armados. |
| `TemporadaPortada.tsx` (nuevo, async) | «En temporada este mes» de la portada: hasta 3 tours, uno por zona. Lee las sedes en paralelo con `Promise.all`. |
| `PrecioTour.tsx` (modificar) | Etiqueta «En temporada». `detalles` usa `mesesATexto` cuando falta `temporada`. |
| `ToursEnZona.tsx` (modificar) | `toursLd` por bloque y, en formato riel, `EnlaceWhatsapp`. |
| `ToursRelacionados.tsx` (modificar) | `toursLd` con `lugarId`. **Sigue siendo síncrono:** recibe `whatsapp: string \| null` de la página, que pasa `null` si el lugar tiene patrocinio declarado. |
| `presencia/PresenciaTours.tsx` (modificar) | `EnlaceWhatsapp` en el pie de la tarjeta **solo si `tipo !== 'ficha'`** (la tarjeta también sale en la ficha, donde el spec §2.7 lo limita a «Tours para conocer») y como icono en la barra. |
| `CuerpoRico.tsx` (modificar) | Conversor del bloque `tour`: usa `BloqueTour` con `pieza = tour-${piezaTours}` y `origen = origenTours`, una prop opcional nueva que vale `'articulo'` por defecto. Usa `PreguntasFrecuentes`. No llama a `enlazarMenciones`: recibe el cuerpo ya enlazado. |
| `Pie.tsx` (modificar) | El WhatsApp del pie lleva `data-evento="whatsapp_clic"` y `data-origen="pie"`. |

### Páginas, textos, estilos y medición

| Archivo | Cambio |
|---|---|
| `src/app/(sitio)/[lang]/guia/lugares/[slug]/page.tsx` | En el `<article>`: «Antes de ir» primero, luego relacionados, saber y preguntas. Chips de visita en `.datos`. `faqLd`. El cuerpo pasa por `enlazarMenciones` con `excluir` = el id del lugar. Llama a `whatsappTours(lang)` y pasa el resultado a `ToursRelacionados` (`null` con patrocinio declarado). |
| `src/app/(sitio)/[lang]/guia/articulos/[slug]/page.tsx` | El cuerpo pasa por `enlazarMenciones`. `piezaTours` sigue igual (`articulo-{slug}`); `CuerpoRico` arma con ella la pieza del bloque, `tour-articulo-{slug}`. |
| `src/app/(sitio)/[lang]/guia/eventos/[slug]/page.tsx` | El cuerpo pasa por `enlazarMenciones`. |
| `src/app/(sitio)/[lang]/guia/page.tsx` | Agrega `<TemporadaPortada>` después de las zonas. |
| `src/sitio/textos.ts` | Textos nuevos es/en: títulos de sección («Antes de ir», «Preguntas frecuentes»), temporada, WhatsApp, «Ver tour». Las etiquetas de las filas de visita viven en `dominio/visita.ts`. |
| `src/sitio/analitica/track.ts` | `whatsapp_clic: ['zona', 'origen']` y su `propsDeElemento`. |
| `src/sitio/estilos/ficha.css`, `articulo.css`, `presencia.css` | Estilos de antes de ir, tarjeta grande, etiqueta de temporada y botón de WhatsApp de la barra. |

### Seed, E2E y documentación

| Archivo | Cambio |
|---|---|
| `src/seed/datos.ts`, `src/seed/index.ts` | Datos inventados: la playa con visita, preguntas y `otrosNombres`; un lugar patrocinado con `otrosNombres`; un artículo con bloque «Tour» y una mención; el registro sin foto de «Ballenas de prueba» con `meses` = el mes en que corre el seed. |
| `tests/e2e/preparar.ts` | Enciende `whatsappToursActivo`. |
| `scripts/entorno-e2e.mjs` | `WHATSAPP_NUMERO=5210000000000`. |
| `docs/specs/2026-10-30-guia-baja-design.md` | Secciones 6, 9 y 13. |
| `docs/editores/escribir-para-buscadores.md` | Antes de ir, bloque «Tour», preguntas y `otrosNombres`. |

### Pruebas

| Archivo | Cubre |
|---|---|
| `tests/unit/temporada.test.ts` (nuevo) | `mesesATexto`, `mesEnBCS`, `enTemporada` y `ordenarPorTemporada`. `registroTourConDatos`: un registro con solo `temporada` guardado en `en` se acepta; uno vacío guardado en `es` se rechaza; `meses: []` cuenta como vacío. |
| `tests/unit/visita.test.ts` (nuevo) | `validarVisita`, `filasVisita` y `chipsVisita`. |
| `tests/unit/menciones.test.ts` (nuevo) | Todos los casos de §5 del spec, incluido el nombre compartido con un lugar no `enlazable`, y `candidatosMencion` (patrocinio declarado y casilla apagada dan `enlazable: false`). |
| `tests/unit/whatsapp.test.ts` (nuevo) | `digitosWhatsapp`, `enlaceWhatsapp` y `mensajeWhatsapp`. |
| `tests/unit/jsonld-tours.test.ts` (nuevo) | `toursLd` y `lugarLd` con visita y con `@id`. |
| `tests/unit/catalogo.test.ts`, `cuerpo-rico.test.ts`, `ficha-lugar.test.ts` (modificar) | `valor` del precio, el bloque `tour` y las secciones nuevas. `ficha-lugar` agrega `ajustesCacheados` a su mock. |
| `tests/int/paquete-1.int.test.ts` (nuevo) | Validaciones de visita, preguntas y Fotos de tours; el bloque `tour`; lectura pública de `meses`. |
| `tests/e2e/paquete-1.spec.ts` (nuevo, `@indexable`) | Los casos E2E de §5 del spec, más: la tarjeta de presencia en una ficha no lleva WhatsApp. |

### Dependencias entre módulos (sin ciclos)

- `dominio/*` no importa nada de `sitio/`, `collections/` ni Next.
- `collections/*` solo importa de `dominio/` y de `acceso/`, `hooks/` y `revalidacion/`, como hoy. Nunca de `sitio/`.
- `sitio/datos/*` importa de `dominio/`.
- `sitio/ui/*` importa de `sitio/datos/`, `sitio/seo/` y `dominio/`.
- `src/admin/*` importa de `dominio/` y solo el **tipo** `OpcionTour` de `sitio/datos/tours-de-zona`, como hoy.

### Paso 0, antes de la tarea 1: línea base de rendimiento

El spec §5 pide medir 01f2bae (presencia) en el banco del CI antes de implementar, con las 4 URLs de
`scripts/lighthouse.mjs`. Si presencia pasó del margen contra c60283d, se reporta al dueño y se para.

<!-- arch-critic: APPROVED -->

---

<!-- plan-critic: APPROVED -->

## Tareas

**Orden con los otros planes:** el plan 4 (etapa 1) va antes, porque da la línea base de la tarea 0.

Comandos de siempre:
- Unitarias de un archivo: `npx vitest run tests/unit/{archivo} --project=unit`, o `npm run test:unit -- {archivo}`.
- Integración: `npm run test:int -- {archivo}`.
- E2E de un modo: `E2E_SOLO=indexable npm run test:e2e`. Antes detén cualquier `next dev` (borrar `.next` falla con EBUSY en Windows).

### Tarea 0: línea base

**Archivos:** ninguno del sitio.

- [ ] **Paso 1:** con el banco del plan 4 (`scripts/medir/`), crear la rama `medir/base-01f2bae` desde `main`, dejar `scripts/medir/matriz.json` en `["base","base2"]` y hacer push.
- [ ] **Paso 2:** al terminar el workflow, `node scripts/medir/leer.mjs {sha}` y anotar LCP y TBT de las 4 URLs de `scripts/lighthouse.mjs` en `docs/rendimiento/lcp-2026-11.md`.
- [ ] **Paso 3:** comparar contra los números de c60283d anotados en `docs/rendimiento/lcp-2026-11.md` (plan 4, tarea 4). Si la diferencia pasa de +100 ms de LCP o +50 ms de TBT y supera el ruido A/A, **parar y reportar al dueño**. Si no, seguir.
- [ ] **Paso 4:** borrar la rama: `git push origin --delete medir/base-01f2bae`.

### Tarea 1: temporadas (reglas puras)

**Archivos:**
- Crear: `src/dominio/temporada.ts`
- Prueba: `tests/unit/temporada.test.ts`

**Interfaces:**
- Produce: `MESES`, `mesEnBCS(ahora: Date): number`, `enTemporada(meses: readonly number[], mes: number): boolean`, `mesesATexto(meses: readonly number[], lang: Locale): string | null`, `ordenarPorTemporada<T extends { meses: readonly number[] }>(tours: T[], mes: number): T[]`, `registroTourConDatos(datos, locale): boolean`.

- [ ] **Paso 1: escribir la prueba que falla**

```ts
// tests/unit/temporada.test.ts
import { describe, expect, it } from 'vitest'

import { enTemporada, mesEnBCS, mesesATexto, ordenarPorTemporada, registroTourConDatos } from '../../src/dominio/temporada'

describe('mesesATexto', () => {
  it('rango que cruza diciembre', () => expect(mesesATexto([11, 12, 1, 2, 3, 4], 'es')).toBe('noviembre a abril'))
  it('varios rangos', () => expect(mesesATexto([1, 2, 7], 'es')).toBe('enero a febrero y julio'))
  it('un mes', () => expect(mesesATexto([3], 'es')).toBe('marzo'))
  it('todo el año', () => expect(mesesATexto([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'es')).toBe('todo el año'))
  it('sin meses', () => expect(mesesATexto([], 'es')).toBeNull())
  it('en inglés', () => expect(mesesATexto([1, 2, 7], 'en')).toBe('January to February and July'))
  it('tres rangos', () => expect(mesesATexto([1, 4, 7], 'es')).toBe('enero, abril y julio'))
})

describe('mesEnBCS y enTemporada', () => {
  // America/Mazatlan es UTC-7: el 1 de noviembre a las 06:30 UTC todavía es 31 de octubre a las 23:30 en BCS.
  it('usa la hora de BCS en el último día del mes a las 23:30', () => {
    expect(mesEnBCS(new Date('2026-11-01T06:30:00Z'))).toBe(10)
    expect(mesEnBCS(new Date('2026-11-01T07:30:00Z'))).toBe(11)
  })
  it('enTemporada', () => {
    expect(enTemporada([1, 2], 2)).toBe(true)
    expect(enTemporada([1, 2], 3)).toBe(false)
    expect(enTemporada([], 3)).toBe(false)
  })
})

describe('ordenarPorTemporada', () => {
  it('pone primero los de temporada y conserva el orden dentro de cada grupo', () => {
    const t = [{ n: 'a', meses: [] }, { n: 'b', meses: [5] }, { n: 'c', meses: [1] }, { n: 'd', meses: [5] }]
    expect(ordenarPorTemporada(t, 5).map((x) => x.n)).toEqual(['b', 'd', 'a', 'c'])
  })
})

describe('registroTourConDatos', () => {
  it('vacío en es: rechazado', () => expect(registroTourConDatos({}, 'es')).toBe(false))
  it('meses vacío cuenta como vacío', () => expect(registroTourConDatos({ meses: [] }, 'es')).toBe(false))
  it('con meses, foto o temporada en es: aceptado', () => {
    expect(registroTourConDatos({ meses: ['1'] }, 'es')).toBe(true)
    expect(registroTourConDatos({ foto: 3 }, 'es')).toBe(true)
    expect(registroTourConDatos({ temporada: 'enero' }, 'es')).toBe(true)
  })
  it('en en no rechaza: temporada está localizada', () => {
    expect(registroTourConDatos({ temporada: 'January' }, 'en')).toBe(true)
    expect(registroTourConDatos({}, 'en')).toBe(true)
  })
})
```

- [ ] **Paso 2: correrla y ver que falla.** `npx vitest run tests/unit/temporada.test.ts`. Esperado: FAIL, no encuentra el módulo.

- [ ] **Paso 3: implementar**

```ts
// src/dominio/temporada.ts
import type { Locale } from './idioma'

export const MESES = [
  { valor: 1, es: 'enero', en: 'January' }, { valor: 2, es: 'febrero', en: 'February' },
  { valor: 3, es: 'marzo', en: 'March' }, { valor: 4, es: 'abril', en: 'April' },
  { valor: 5, es: 'mayo', en: 'May' }, { valor: 6, es: 'junio', en: 'June' },
  { valor: 7, es: 'julio', en: 'July' }, { valor: 8, es: 'agosto', en: 'August' },
  { valor: 9, es: 'septiembre', en: 'September' }, { valor: 10, es: 'octubre', en: 'October' },
  { valor: 11, es: 'noviembre', en: 'November' }, { valor: 12, es: 'diciembre', en: 'December' },
] as const

// El mes actual en BCS (spec del paquete 1 §2.4). Mazatlán y La Paz comparten huso.
export function mesEnBCS(ahora: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mazatlan', month: 'numeric' }).format(ahora))
}

export const enTemporada = (meses: readonly number[], mes: number): boolean => meses.includes(mes)

const siguiente = (m: number) => (m === 12 ? 1 : m + 1)
const anterior = (m: number) => (m === 1 ? 12 : m - 1)

// [11,12,1] → «noviembre a enero»; [1,2,7] → «enero a febrero y julio». Diciembre sigue a enero.
export function mesesATexto(meses: readonly number[], lang: Locale): string | null {
  const unicos = [...new Set(meses)].sort((a, b) => a - b)
  if (!unicos.length) return null
  if (unicos.length === 12) return lang === 'es' ? 'todo el año' : 'all year'
  const nombre = (m: number) => MESES[m - 1][lang]
  const rangos = unicos.filter((m) => !unicos.includes(anterior(m))).map((inicio) => {
    let fin = inicio
    while (unicos.includes(siguiente(fin))) fin = siguiente(fin)
    return fin === inicio ? nombre(inicio) : `${nombre(inicio)} ${lang === 'es' ? 'a' : 'to'} ${nombre(fin)}`
  })
  const y = lang === 'es' ? 'y' : 'and'
  return rangos.length === 1 ? rangos[0] : `${rangos.slice(0, -1).join(', ')} ${y} ${rangos[rangos.length - 1]}`
}

// Primero los de temporada; dentro de cada grupo, el orden que traían.
export function ordenarPorTemporada<T extends { meses: readonly number[] }>(tours: T[], mes: number): T[] {
  return [...tours.filter((t) => enTemporada(t.meses, mes)), ...tours.filter((t) => !enTemporada(t.meses, mes))]
}

type DatosRegistro = { foto?: unknown; meses?: unknown[] | null; temporada?: string | null }

// Un registro de «Fotos y temporadas de tours» tiene que aportar algo. Solo se rechaza al guardar en español: `temporada`
// está localizada y en inglés no se ve el valor en español. Se evalúa sobre { ...originalDoc, ...data }.
export function registroTourConDatos(datos: DatosRegistro, locale: string | undefined): boolean {
  if (locale !== 'es') return true
  return Boolean(datos.foto) || (datos.meses?.length ?? 0) > 0 || Boolean(datos.temporada?.trim())
}
```

- [ ] **Paso 4: correrla y ver que pasa.** Esperado: PASS.

- [ ] **Paso 5: commit**

```bash
git add src/dominio/temporada.ts tests/unit/temporada.test.ts
git commit -m "feat: reglas de temporada de los tours

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarea 2: datos de visita (reglas puras)

**Archivos:**
- Crear: `src/dominio/visita.ts`
- Prueba: `tests/unit/visita.test.ts`

**Interfaces:**
- Produce: `SERVICIOS_VISITA`, `MEDIOS`, `type VisitaPublica`, `validarVisita(v: unknown): true | string`, `filasVisita(v, lang, zonaNombre): { dato: string; valor: string }[]`, `chipsVisita(v, lang, zonaNombre): string[]`, `tieneVisita(v): boolean`.

- [ ] **Paso 1: escribir la prueba que falla**

```ts
// tests/unit/visita.test.ts
import { describe, expect, it } from 'vitest'

import { chipsVisita, filasVisita, tieneVisita, validarVisita, type VisitaPublica } from '../../src/dominio/visita'

const v = (extra: Partial<VisitaPublica> = {}): VisitaPublica => ({
  costoEntrada: null, entradaGratis: false, minutosDesdeZona: null, medio: null, comoLlegar: null, servicios: [], mejorHora: null, ...extra,
})

describe('validarVisita', () => {
  it('tiempo y medio van juntos', () => {
    expect(validarVisita({ minutosDesdeZona: 45 })).not.toBe(true)
    expect(validarVisita({ medio: 'auto' })).not.toBe(true)
    expect(validarVisita({ minutosDesdeZona: 45, medio: 'auto' })).toBe(true)
  })
  it('sin-servicios no se combina', () => {
    expect(validarVisita({ servicios: ['sin-servicios', 'sombra'] })).not.toBe(true)
    expect(validarVisita({ servicios: ['sin-servicios'] })).toBe(true)
  })
  it('vacío es válido', () => expect(validarVisita({})).toBe(true))
  it('sin valor es válido', () => expect(validarVisita(null)).toBe(true))
})

describe('filasVisita', () => {
  it('solo las filas con valor', () => {
    expect(filasVisita(v({ mejorHora: 'Temprano' }), 'es', 'La Paz')).toEqual([{ dato: 'Mejor hora', valor: 'Temprano' }])
  })
  it('«Gratis» gana a costoEntrada', () => {
    expect(filasVisita(v({ entradaGratis: true, costoEntrada: '$100' }), 'es', 'La Paz')[0]).toEqual({ dato: 'Entrada', valor: 'Gratis' })
  })
  it('tiempo con medio y zona, y servicios en su idioma', () => {
    const filas = filasVisita(v({ minutosDesdeZona: 45, medio: 'auto', servicios: ['sombra', 'banos'] }), 'en', 'La Paz')
    expect(filas).toContainEqual({ dato: 'Getting there', valor: '45 min by car from La Paz' })
    expect(filas).toContainEqual({ dato: 'Services', valor: 'Shade, Restrooms' })
  })
})

describe('chipsVisita', () => {
  it('costo y tiempo', () => {
    expect(chipsVisita(v({ costoEntrada: '$100 MXN', minutosDesdeZona: 30, medio: 'lancha' }), 'es', 'La Paz')).toEqual(['$100 MXN', '30 min en lancha desde La Paz'])
  })
  it('sin datos no hay chips', () => expect(chipsVisita(v(), 'es', 'La Paz')).toEqual([]))
})

describe('tieneVisita', () => {
  it('falso sin datos y verdadero con uno', () => {
    expect(tieneVisita(v())).toBe(false)
    expect(tieneVisita(v({ servicios: ['sombra'] }))).toBe(true)
  })
})
```

- [ ] **Paso 2: correrla y ver que falla.**

- [ ] **Paso 3: implementar**

```ts
// src/dominio/visita.ts
import type { Locale } from './idioma'

// Datos de visita de un lugar (spec del paquete 1 §2.3). Listas cerradas en código, como CARACTERISTICAS.
export const SERVICIOS_VISITA = [
  { valor: 'sombra', es: 'Sombra', en: 'Shade' },
  { valor: 'banos', es: 'Baños', en: 'Restrooms' },
  { valor: 'regaderas', es: 'Regaderas', en: 'Showers' },
  { valor: 'estacionamiento', es: 'Estacionamiento', en: 'Parking' },
  { valor: 'renta-de-equipo', es: 'Renta de equipo', en: 'Equipment rental' },
  { valor: 'comida-cerca', es: 'Comida cerca', en: 'Food nearby' },
  { valor: 'sin-servicios', es: 'Sin servicios', en: 'No services' },
] as const

export const MEDIOS = [
  { valor: 'auto', es: 'en auto', en: 'by car' },
  { valor: 'lancha', es: 'en lancha', en: 'by boat' },
  { valor: 'a-pie', es: 'a pie', en: 'on foot' },
  { valor: '4x4', es: 'en 4x4', en: 'by 4x4' },
] as const

const ETIQUETAS = {
  es: { entrada: 'Entrada', gratis: 'Gratis', tiempo: 'Cómo se llega', indicaciones: 'Indicaciones', servicios: 'Servicios', hora: 'Mejor hora', desde: 'desde' },
  en: { entrada: 'Entrance', gratis: 'Free', tiempo: 'Getting there', indicaciones: 'Directions', servicios: 'Services', hora: 'Best time', desde: 'from' },
} as const

export type VisitaPublica = {
  costoEntrada: string | null
  entradaGratis: boolean
  minutosDesdeZona: number | null
  medio: string | null
  comoLlegar: string | null
  servicios: string[]
  mejorHora: string | null
}

export function validarVisita(v: unknown): true | string {
  const d = (v ?? {}) as { minutosDesdeZona?: number | null; medio?: string | null; servicios?: string[] | null }
  if (Boolean(d.minutosDesdeZona) !== Boolean(d.medio)) return 'El tiempo y el medio van juntos: llena los dos o ninguno.'
  if (d.servicios?.includes('sin-servicios') && d.servicios.length > 1) return '«Sin servicios» no se combina con otro servicio.'
  return true
}

const textoTiempo = (v: VisitaPublica, lang: Locale, zona: string): string | null => {
  if (!v.minutosDesdeZona || !v.medio) return null
  const medio = MEDIOS.find((m) => m.valor === v.medio)
  return medio ? `${v.minutosDesdeZona} min ${medio[lang]} ${ETIQUETAS[lang].desde} ${zona}` : null
}

const textoEntrada = (v: VisitaPublica, lang: Locale): string | null => (v.entradaGratis ? ETIQUETAS[lang].gratis : v.costoEntrada)

export function filasVisita(v: VisitaPublica, lang: Locale, zonaNombre: string): { dato: string; valor: string }[] {
  const e = ETIQUETAS[lang]
  const servicios = SERVICIOS_VISITA.filter((s) => v.servicios.includes(s.valor)).map((s) => s[lang]).join(', ')
  const filas: [string, string | null][] = [
    [e.entrada, textoEntrada(v, lang)],
    [e.tiempo, textoTiempo(v, lang, zonaNombre)],
    [e.indicaciones, v.comoLlegar],
    [e.servicios, servicios || null],
    [e.hora, v.mejorHora],
  ]
  return filas.filter((f): f is [string, string] => Boolean(f[1])).map(([dato, valor]) => ({ dato, valor }))
}

// Lo que además sale arriba, en .datos (spec principal §9: datos duros arriba y en texto).
export function chipsVisita(v: VisitaPublica, lang: Locale, zonaNombre: string): string[] {
  return [textoEntrada(v, lang), textoTiempo(v, lang, zonaNombre)].filter((x): x is string => Boolean(x))
}

export const tieneVisita = (v: VisitaPublica): boolean =>
  Boolean(v.entradaGratis || v.costoEntrada || v.minutosDesdeZona || v.comoLlegar || v.servicios.length || v.mejorHora)
```

- [ ] **Paso 4: correrla y ver que pasa.**

- [ ] **Paso 5: commit** con mensaje `feat: reglas de los datos de visita de un lugar` y la línea `Co-Authored-By`.

### Tarea 3: enlaces automáticos (regla pura)

**Archivos:**
- Crear: `src/dominio/menciones.ts`, `src/sitio/datos/menciones.ts`
- Prueba: `tests/unit/menciones.test.ts`

**Interfaces:**
- Produce: `type CandidatoMencion = { id: number; nombres: string[]; enlazable: boolean }`, `enlazarMenciones(cuerpos: unknown[], candidatos: CandidatoMencion[], opciones?: { excluir?: readonly number[] }): unknown[]`, `MAX_ENLACES_AUTOMATICOS = 10`, y `candidatosMencion(lugares: TarjetaLugar[]): CandidatoMencion[]`.
- Consume: `idDe` de `src/dominio/lexical.ts`; `patrocinioDeclarado` de `src/dominio/patrocinio.ts`. `TarjetaLugar` suma `otrosNombres` y `enlazarMenciones` en la tarea 6; hasta entonces la prueba de `candidatosMencion` usa un objeto con esos campos.

- [ ] **Paso 1: escribir la prueba que falla**

```ts
// tests/unit/menciones.test.ts
import { describe, expect, it } from 'vitest'

import { enlazarMenciones, type CandidatoMencion } from '../../src/dominio/menciones'
import { candidatosMencion } from '../../src/sitio/datos/menciones'
import type { TarjetaLugar } from '../../src/sitio/datos/tipos'

const txt = (text: string) => ({ type: 'text', text, format: 0 })
const p = (...children: unknown[]) => ({ type: 'paragraph', children })
const c = (...children: unknown[]) => ({ root: { type: 'root', children } })
const h2 = (t: string) => ({ type: 'heading', tag: 'h2', children: [txt(t)] })
const link = (id: number, t: string) => ({ type: 'link', fields: { linkType: 'internal', doc: { relationTo: 'lugares', value: id } }, children: [txt(t)] })
const tarjeta = (id: number) => ({ type: 'block', fields: { blockType: 'tarjetaLugar', lugar: id } })

const balandra: CandidatoMencion = { id: 1, nombres: ['Playa Balandra', 'Balandra'], enlazable: true }
const tecolote: CandidatoMencion = { id: 2, nombres: ['El Tecolote'], enlazable: true }

type Nodo = { type?: string; text?: string; fields?: { doc?: { value?: number } }; children?: Nodo[] }
function hijos(cuerpo: unknown, i = 0): Nodo[] {
  return ((cuerpo as { root: { children: Nodo[] } }).root.children[i].children ?? []) as Nodo[]
}
const enlaces = (cuerpo: unknown): { id: number | undefined; texto: string | undefined }[] => {
  const salida: { id: number | undefined; texto: string | undefined }[] = []
  const ir = (n: Nodo) => {
    if (n.type === 'link') salida.push({ id: n.fields?.doc?.value, texto: n.children?.[0]?.text })
    n.children?.forEach(ir)
  }
  ;(cuerpo as { root: Nodo }).root.children?.forEach(ir)
  return salida
}

describe('enlazarMenciones', () => {
  it('enlaza la primera mención y parte el texto', () => {
    const [r] = enlazarMenciones([c(p(txt('Ve a Balandra y a Balandra otra vez.')))], [balandra])
    expect(hijos(r).map((n) => n.type)).toEqual(['text', 'link', 'text'])
    expect(enlaces(r)).toEqual([{ id: 1, texto: 'Balandra' }])
  })
  it('gana la más larga', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('En Playa Balandra.')))], [balandra])[0])).toEqual([{ id: 1, texto: 'Playa Balandra' }])
  })
  it('sin acentos', () => {
    const lugar: CandidatoMencion = { id: 3, nombres: ['Pichilingüe'], enlazable: true }
    expect(enlaces(enlazarMenciones([c(p(txt('Vamos a Pichilingue hoy.')))], [lugar])[0])).toEqual([{ id: 3, texto: 'Pichilingue' }])
  })
  it('palabra completa', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('Las Balandras son barcos.')))], [balandra])[0])).toEqual([])
  })
  it('primera letra minúscula no enlaza', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('una balandra blanca')))], [balandra])[0])).toEqual([])
  })
  it('no toca encabezados, links ya hechos ni bloques', () => {
    expect(enlaces(enlazarMenciones([c(h2('Balandra'))], [balandra])[0])).toEqual([])
    expect(enlaces(enlazarMenciones([c(p(link(9, 'Balandra')))], [balandra])[0])).toEqual([{ id: 9, texto: 'Balandra' }])
  })
  it('tarjeta del mismo lugar: no enlaza', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('Balandra.')), tarjeta(1))], [balandra])[0])).toEqual([])
  })
  it('propia ficha con excluir', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('Balandra.')))], [balandra], { excluir: [1] })[0])).toEqual([])
  })
  it('nombre ambiguo no se enlaza', () => {
    const otro: CandidatoMencion = { id: 7, nombres: ['Balandra'], enlazable: true }
    expect(enlaces(enlazarMenciones([c(p(txt('Balandra.')))], [balandra, otro])[0])).toEqual([])
  })
  it('un no enlazable que comparte nombre también lo vuelve ambiguo', () => {
    const patrocinado: CandidatoMencion = { id: 7, nombres: ['Balandra'], enlazable: false }
    expect(enlaces(enlazarMenciones([c(p(txt('Balandra.')))], [balandra, patrocinado])[0])).toEqual([])
  })
  it('no enlazable no se enlaza', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('El Tecolote.')))], [{ ...tecolote, enlazable: false }])[0])).toEqual([])
  })
  it('menos de 4 letras', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('Ir a Ola.')))], [{ id: 4, nombres: ['Ola'], enlazable: true }])[0])).toEqual([])
  })
  it('máximo 10 entre dos cuerpos', () => {
    const lugares = Array.from({ length: 12 }, (_, i): CandidatoMencion => ({ id: i + 1, nombres: [`Lugarcito${String.fromCharCode(65 + i)}`], enlazable: true }))
    const nombres = lugares.map((l) => l.nombres[0])
    const r = enlazarMenciones([c(p(txt(nombres.slice(0, 6).join(' y ')))), c(p(txt(nombres.slice(6).join(' y '))))], lugares)
    expect(enlaces(r[0]).length + enlaces(r[1]).length).toBe(10)
  })
  it('nodo partido no enlaza', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('Playa Bal'), { ...txt('andra'), format: 1 }))], [{ id: 5, nombres: ['Playa Balandra'], enlazable: true }])[0])).toEqual([])
  })
  it('primera mención en el cuerpo 1: el 2 no recibe enlace', () => {
    const r = enlazarMenciones([c(p(txt('Balandra.'))), c(p(txt('Balandra.')))], [balandra])
    expect(enlaces(r[0])).toHaveLength(1)
    expect(enlaces(r[1])).toHaveLength(0)
  })
  it('enlace manual en el cuerpo 2 impide enlazar en el 1', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('Balandra.'))), c(p(link(1, 'ahí')))], [balandra])[0])).toEqual([])
  })
  it('conserva el formato del texto', () => {
    const [r] = enlazarMenciones([c(p({ ...txt('Balandra'), format: 1 }))], [balandra])
    const n = hijos(r)[0] as Nodo & { children: (Nodo & { format?: number })[] }
    expect(n.children[0].format).toBe(1)
  })
  it('no muta la entrada y deja pasar un cuerpo nulo', () => {
    const e = c(p(txt('Balandra.')))
    const copia = JSON.stringify(e)
    expect(enlazarMenciones([null, e], [balandra])[0]).toBeNull()
    expect(JSON.stringify(e)).toBe(copia)
  })
})

describe('candidatosMencion', () => {
  const lugar = (extra: Partial<TarjetaLugar>) => ({
    id: 1, nombre: 'Playa Balandra', otrosNombres: ['Balandra'], enlazarMenciones: true, patrocinio: { activo: false, desde: null, hasta: null }, ...extra,
  }) as TarjetaLugar
  it('nombre y otros nombres, enlazable por defecto', () => {
    expect(candidatosMencion([lugar({})])).toEqual([{ id: 1, nombres: ['Playa Balandra', 'Balandra'], enlazable: true }])
  })
  it('casilla apagada: no enlazable, pero sigue en la lista', () => {
    expect(candidatosMencion([lugar({ enlazarMenciones: false })])[0].enlazable).toBe(false)
  })
  it('patrocinio declarado: no enlazable', () => {
    const p = { activo: true, desde: '2020-01-01', hasta: '2999-01-01' }
    expect(candidatosMencion([lugar({ patrocinio: p })])[0].enlazable).toBe(false)
  })
})
```

- [ ] **Paso 2: correrla y ver que falla.**

- [ ] **Paso 3: implementar la regla**

```ts
// src/dominio/menciones.ts
import { idDe } from './lexical'

export const MAX_ENLACES_AUTOMATICOS = 10
const MIN_LETRAS = 4

export type CandidatoMencion = { id: number; nombres: string[]; enlazable: boolean }

type Nodo = { type?: string; text?: string; fields?: Record<string, unknown>; children?: Nodo[]; [k: string]: unknown }

// Un carácter por carácter, para que los índices del texto plegado sirvan en el original.
function plegar(texto: string): string {
  return Array.from(texto, (ch) => {
    const p = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    return p.length === ch.length ? p : ch
  }).join('')
}

const LETRA = /[\p{L}\p{N}]/u
const esMayuscula = (ch: string | undefined) => Boolean(ch) && ch !== ch!.toLocaleLowerCase() && ch === ch!.toLocaleUpperCase()

function recorrer(n: Nodo | undefined, visitar: (n: Nodo) => void) {
  if (!n || typeof n !== 'object') return
  visitar(n)
  n.children?.forEach((h) => recorrer(h, visitar))
}

function yaEnlazados(cuerpos: unknown[]): Set<number> {
  const ids = new Set<number>()
  for (const c of cuerpos) {
    recorrer((c as { root?: Nodo } | null)?.root, (n) => {
      if (n.type === 'link') {
        const f = n.fields as { linkType?: string; doc?: { relationTo?: string; value?: unknown } } | undefined
        const id = f?.linkType === 'internal' && f.doc?.relationTo === 'lugares' ? idDe(f.doc.value) : null
        if (id !== null) ids.add(id)
      }
      if (n.type === 'block' && n.fields?.blockType === 'tarjetaLugar') {
        const id = idDe(n.fields.lugar)
        if (id !== null) ids.add(id)
      }
    })
  }
  return ids
}

type Patron = { plegado: string; id: number }

function patronesDe(candidatos: CandidatoMencion[], bloqueados: Set<number>): Patron[] {
  const duenos = new Map<string, Set<number>>()
  for (const c of candidatos) {
    for (const nombre of c.nombres) {
      const p = plegar(nombre.trim())
      if (!p) continue
      duenos.set(p, (duenos.get(p) ?? new Set()).add(c.id))
    }
  }
  const patrones: Patron[] = []
  for (const c of candidatos) {
    if (!c.enlazable || bloqueados.has(c.id)) continue
    for (const nombre of c.nombres) {
      const plegado = plegar(nombre.trim())
      const letras = plegado.replace(/[^\p{L}\p{N}]/gu, '').length
      if (letras >= MIN_LETRAS && duenos.get(plegado)?.size === 1) patrones.push({ plegado, id: c.id })
    }
  }
  return patrones.sort((a, b) => b.plegado.length - a.plegado.length)
}

const nodoEnlace = (id: number, texto: Nodo): Nodo => ({
  type: 'link', version: 3, format: '', indent: 0, direction: null,
  fields: { linkType: 'internal', newTab: false, doc: { relationTo: 'lugares', value: id } },
  children: [texto],
})

// Enlaza la primera mención de cada lugar en una lista de cuerpos Lexical, en orden de lectura (spec del paquete 1 §2.6).
// Primera mención y máximo cuentan para toda la lista. No guarda nada: se aplica al pintar.
export function enlazarMenciones(cuerpos: unknown[], candidatos: CandidatoMencion[], opciones: { excluir?: readonly number[] } = {}): unknown[] {
  const bloqueados = yaEnlazados(cuerpos)
  opciones.excluir?.forEach((id) => bloqueados.add(id))
  const patrones = patronesDe(candidatos, bloqueados)
  const hechos = new Set<number>()

  const partir = (nodo: Nodo): Nodo[] => {
    const original = nodo.text ?? ''
    const plegado = plegar(original)
    const salida: Nodo[] = []
    let desde = 0
    let i = 0
    while (i < plegado.length && hechos.size < MAX_ENLACES_AUTOMATICOS) {
      const hallado = esMayuscula(original[i]) && !(i > 0 && LETRA.test(original[i - 1]))
        ? patrones.find((p) => !hechos.has(p.id) && plegado.startsWith(p.plegado, i) && !LETRA.test(original[i + p.plegado.length] ?? ''))
        : undefined
      if (!hallado) {
        i += 1
        continue
      }
      if (i > desde) salida.push({ ...nodo, text: original.slice(desde, i) })
      salida.push(nodoEnlace(hallado.id, { ...nodo, text: original.slice(i, i + hallado.plegado.length) }))
      hechos.add(hallado.id)
      i += hallado.plegado.length
      desde = i
    }
    if (!salida.length) return [nodo]
    if (desde < original.length) salida.push({ ...nodo, text: original.slice(desde) })
    return salida
  }

  const transformar = (nodo: Nodo): Nodo => {
    if (nodo.type === 'heading' || nodo.type === 'link' || nodo.type === 'autolink' || nodo.type === 'block' || !nodo.children) return nodo
    return { ...nodo, children: nodo.children.flatMap((h) => (h.type === 'text' ? partir(h) : [transformar(h)])) }
  }

  return cuerpos.map((c) => {
    const raiz = (c as { root?: Nodo } | null)?.root
    return raiz ? { ...(c as object), root: transformar(raiz) } : c
  })
}
```

```ts
// src/sitio/datos/menciones.ts
import type { CandidatoMencion } from '../../dominio/menciones'
import { patrocinioDeclarado } from '../../dominio/patrocinio'
import type { TarjetaLugar } from './tipos'

// Todos los lugares del idioma: un no enlazable que comparte nombre sigue haciendo ambiguo ese nombre.
export function candidatosMencion(lugares: TarjetaLugar[]): CandidatoMencion[] {
  return lugares.map((l) => ({
    id: l.id,
    nombres: [l.nombre, ...l.otrosNombres],
    enlazable: l.enlazarMenciones && !patrocinioDeclarado(l.patrocinio),
  }))
}
```

- [ ] **Paso 4: correrla y ver que pasa.** La prueba importa `TarjetaLugar` solo como tipo, y vitest no comprueba tipos, así que pasa antes de la tarea 6.

- [ ] **Paso 5: commit** con mensaje `feat: enlaces automáticos de menciones de lugares` y la línea `Co-Authored-By`.

### Tarea 4: WhatsApp (reglas y medición)

**Archivos:**
- Crear: `src/dominio/whatsapp.ts`
- Modificar: `src/sitio/analitica/track.ts`
- Prueba: `tests/unit/whatsapp.test.ts`, `tests/unit/track.test.ts`

**Interfaces:**
- Produce: `digitosWhatsapp(numero: string | null | undefined): string | null`, `enlaceWhatsapp(digitos: string, mensaje: string): string`, `mensajeWhatsapp(lang: Locale, nombre: string): string`.

- [ ] **Paso 1: escribir la prueba que falla**

```ts
// tests/unit/whatsapp.test.ts
import { describe, expect, it } from 'vitest'

import { digitosWhatsapp, enlaceWhatsapp, mensajeWhatsapp } from '../../src/dominio/whatsapp'

describe('digitosWhatsapp', () => {
  it('normaliza', () => expect(digitosWhatsapp('+52 (612) 000-0000')).toBe('526120000000'))
  it('rechaza corto y largo', () => {
    expect(digitosWhatsapp('612000')).toBeNull()
    expect(digitosWhatsapp('1'.repeat(16))).toBeNull()
  })
  it('vacío', () => {
    expect(digitosWhatsapp('')).toBeNull()
    expect(digitosWhatsapp(undefined)).toBeNull()
  })
})

describe('enlaceWhatsapp y mensajeWhatsapp', () => {
  it('codifica el mensaje', () => {
    expect(enlaceWhatsapp('5210000000000', 'Hola, ¿qué tal?')).toBe('https://wa.me/5210000000000?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F')
  })
  it('mensaje por idioma', () => {
    expect(mensajeWhatsapp('es', 'La Paz')).toBe('Hola, vengo de la Guía (La Paz). Quiero información de tours.')
    expect(mensajeWhatsapp('en', 'La Paz')).toBe('Hi, I came from the Guide (La Paz). I would like information about tours.')
  })
})
```

En `tests/unit/track.test.ts`, agregar dentro de su `describe` principal:

```ts
it('whatsapp_clic lleva zona y origen', () => {
  expect(propsDeElemento('whatsapp_clic', { zona: 'la-paz', origen: 'barra' })).toEqual({ zona: 'la-paz', origen: 'barra' })
  expect(track('whatsapp_clic', { zona: 'la-paz', origen: 'barra' })).toBe(true)
})
```

- [ ] **Paso 2: correrlas y ver que fallan.**

- [ ] **Paso 3: implementar**

```ts
// src/dominio/whatsapp.ts
import type { Locale } from './idioma'

// El número vive solo en WHATSAPP_NUMERO (spec principal §5.5); nunca en el código ni en el seed.
export function digitosWhatsapp(numero: string | null | undefined): string | null {
  const d = (numero ?? '').replace(/\D/g, '')
  return d.length >= 10 && d.length <= 15 ? d : null
}

export const enlaceWhatsapp = (digitos: string, mensaje: string): string => `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`

export const mensajeWhatsapp = (lang: Locale, nombre: string): string =>
  lang === 'es'
    ? `Hola, vengo de la Guía (${nombre}). Quiero información de tours.`
    : `Hi, I came from the Guide (${nombre}). I would like information about tours.`
```

En `src/sitio/analitica/track.ts`, agregar a `EVENTOS`:

```ts
  whatsapp_clic: ['zona', 'origen'],
```

y a `propsDeElemento`, cambiando la primera línea:

```ts
  if (evento === 'tour_clic' || evento === 'whatsapp_clic') return { zona: d.zona, origen: d.origen }
```

- [ ] **Paso 4: correrlas y ver que pasan.**

- [ ] **Paso 5: commit** con mensaje `feat: reglas de WhatsApp de tours y evento whatsapp_clic` y la línea `Co-Authored-By`.

### Tarea 5: esquema de Payload

**Archivos:**
- Modificar: `src/collections/Lugares.ts`, `src/collections/FotosTours.ts`, `src/globals/AjustesGuia.ts`, `src/bloques/articulo.ts`, `src/admin/ToursRelacionados.tsx`
- Regenerar: `src/migrations/*`, `src/payload-types.ts`, `src/app/(payload)/admin/importMap.js`
- Prueba: `tests/int/paquete-1.int.test.ts`

- [ ] **Paso 1: escribir la prueba de integración que falla**

```ts
// tests/int/paquete-1.int.test.ts
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { crearCategoria, crearImagen, crearLugar, crearUsuario, crearZona, lexical, limpiar, obtenerPayload } from './utils'

let payload: Payload

let n = 0
async function base() {
  const zona = await crearZona(payload, { activa: true, sedeSlug: 'la-paz' })
  const categoria = await crearCategoria(payload)
  const foto = await crearImagen(payload)
  // Cada lugar con su slug: el índice de slugs es único.
  const lugar = (extra: Record<string, unknown>) => crearLugar(payload, { zona: zona.id, categorias: [categoria.id], foto: foto.id, slugEs: `lugar-${++n}`, extra })
  return { zona, categoria, lugar }
}

describe('esquema del paquete 1', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('visita: tiempo sin medio y sin-servicios combinado se rechazan', async () => {
    const { lugar } = await base()
    await expect(lugar({ visita: { minutosDesdeZona: 45 } })).rejects.toThrow()
    await expect(lugar({ visita: { servicios: ['sin-servicios', 'sombra'] } })).rejects.toThrow()
    await expect(lugar({ visita: { minutosDesdeZona: 45, medio: 'auto', servicios: ['sombra'] } })).resolves.toBeTruthy()
  })

  it('preguntas: máximo 8 y límites de texto', async () => {
    const { lugar } = await base()
    const fila = { pregunta: '¿Hay sombra?', respuesta: 'Sí.' }
    await expect(lugar({ preguntas: Array(9).fill(fila) })).rejects.toThrow()
    await expect(lugar({ preguntas: [{ pregunta: 'x'.repeat(121), respuesta: 'Sí.' }] })).rejects.toThrow()
    await expect(lugar({ preguntas: [fila] })).resolves.toBeTruthy()
  })

  it('fotos-tours: registro vacío rechazado, sin foto con meses aceptado y actualización parcial válida', async () => {
    const claves = { sedeSlug: 'la-paz', tipo: 'servicio' as const, slug: 'ballenas' }
    await expect(payload.create({ collection: 'fotos-tours', locale: 'es', data: claves, overrideAccess: true })).rejects.toThrow()
    const doc = await payload.create({ collection: 'fotos-tours', locale: 'es', data: { ...claves, meses: ['1', '2'] }, overrideAccess: true })
    const act = await payload.update({ collection: 'fotos-tours', id: doc.id, locale: 'es', data: { temporada: 'enero' }, overrideAccess: true })
    expect(act.meses).toEqual(['1', '2'])
  })

  it('el público lee meses', async () => {
    await payload.create({ collection: 'fotos-tours', locale: 'es', data: { sedeSlug: 'la-paz', tipo: 'servicio', slug: 'ballenas', meses: ['3'] }, overrideAccess: true })
    const { docs } = await payload.find({ collection: 'fotos-tours', overrideAccess: false, user: undefined })
    expect(docs[0].meses).toEqual(['3'])
  })

  it('bloque tour: clave mal formada rechazada', async () => {
    const { zona } = await base()
    const cuerpo = (tour: string) => {
      const c = lexical('Texto')
      ;(c.root.children as unknown[]).push({ type: 'block', version: 2, format: '', fields: { blockType: 'tour', zona: zona.id, tour } })
      return c
    }
    const portada = await crearImagen(payload)
    const autor = await crearUsuario(payload, 'admin')
    const data = { titulo: 'Artículo', resumen: 'R', portada: portada.id, autor: autor.id, _status: 'published' as const }
    await expect(payload.create({ collection: 'articulos', locale: 'es', data: { ...data, cuerpo: cuerpo('no-es-clave') }, overrideAccess: true })).rejects.toThrow()
    await expect(payload.create({ collection: 'articulos', locale: 'es', data: { ...data, cuerpo: cuerpo('servicio:ballenas') }, overrideAccess: true })).resolves.toBeTruthy()
  })

  it('ajustes: whatsappToursActivo apagado por defecto y sin campo de número', async () => {
    const g = await payload.findGlobal({ slug: 'ajustes-guia', overrideAccess: true })
    expect(g.whatsappToursActivo ?? false).toBe(false)
    expect('whatsappTours' in g).toBe(false)
  })
})
```

En `tests/int/utils.ts`, `crearLugar` suma una opción `extra?: Record<string, unknown>` a su tipo y hace `...op.extra` al final de `data` en `payload.create`.

- [ ] **Paso 2: correrla y ver que falla.** `npm run test:int -- paquete-1`. Esperado: FAIL por campos desconocidos.

- [ ] **Paso 3: Lugares.** Agregar después del campo `toursRelacionados` de `src/collections/Lugares.ts`, con estos imports (`validarVisita`, `MEDIOS`, `SERVICIOS_VISITA` de `../dominio/visita`):

```ts
    {
      name: 'visita',
      type: 'group',
      label: 'Antes de ir',
      admin: { description: 'Para playas y sitios naturales. Todo es opcional.' },
      validate: (v: unknown) => validarVisita(v),
      fields: [
        { name: 'costoEntrada', type: 'text', localized: true, maxLength: 120, admin: { description: 'P. ej. «$100 MXN por persona; menores de 5, gratis».' } },
        { name: 'entradaGratis', type: 'checkbox', defaultValue: false, admin: { description: 'Si está marcada, se muestra «Gratis» y se ignora el costo.' } },
        { name: 'minutosDesdeZona', type: 'number', min: 1, max: 600, admin: { description: 'Minutos desde el centro de la zona. Va junto con el medio.' } },
        { name: 'medio', type: 'select', options: MEDIOS.map((m) => ({ label: { es: m.es, en: m.en }, value: m.valor })) },
        { name: 'comoLlegar', type: 'textarea', localized: true, maxLength: 600 },
        { name: 'servicios', type: 'select', hasMany: true, options: SERVICIOS_VISITA.map((s) => ({ label: { es: s.es, en: s.en }, value: s.valor })) },
        { name: 'mejorHora', type: 'text', localized: true, maxLength: 160 },
      ],
    },
    {
      name: 'preguntas',
      type: 'array',
      localized: true,
      maxRows: 8,
      labels: { singular: 'Pregunta', plural: 'Preguntas frecuentes' },
      fields: [
        { name: 'pregunta', type: 'text', required: true, maxLength: 120 },
        { name: 'respuesta', type: 'textarea', required: true, maxLength: 600 },
      ],
    },
    {
      name: 'otrosNombres',
      type: 'text',
      hasMany: true,
      maxRows: 5,
      admin: { description: 'Nombres con que la gente conoce el lugar: el lugar «Playa Balandra» lleva «Balandra».' },
    },
    {
      name: 'enlazarMenciones',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Apágala si el nombre es una palabra común que aparece en otros textos con otro sentido.' },
    },
```

Payload no acepta `validate` en un campo `group`. Si `tsc` o el arranque lo rechazan, mover la regla a un `beforeValidate` de la colección que lance `ValidationError` con el mensaje de `validarVisita(data.visita)`, evaluando `{ ...originalDoc?.visita, ...data?.visita }`.

- [ ] **Paso 4: Fotos de tours.** En `src/collections/FotosTours.ts`: cambiar `labels` a `{ singular: 'Foto y temporada de tour', plural: 'Fotos y temporadas de tours' }`; `required: true` de `foto` pasa a `required: false`; agregar:

```ts
    {
      name: 'meses',
      type: 'select',
      hasMany: true,
      options: MESES.map((m) => ({ label: { es: m.es, en: m.en }, value: String(m.valor) })),
      admin: { description: 'Meses en que el tour está en temporada. Ordena las listas y pone la etiqueta «En temporada».' },
    },
```

y este hook a `hooks` (`MESES` y `registroTourConDatos` de `../dominio/temporada`; `ValidationError` de `payload`):

```ts
  hooks: {
    beforeValidate: [
      ({ data, originalDoc, req }) => {
        if (!registroTourConDatos({ ...originalDoc, ...data }, req.locale)) {
          throw new ValidationError({ collection: 'fotos-tours', errors: [{ path: 'foto', message: 'Agrega una foto, los meses o la temporada.' }] })
        }
        return data
      },
    ],
    afterChange: [revalidacion.afterChange],
    afterDelete: [revalidacion.afterDelete],
  },
```

- [ ] **Paso 5: Ajustes.** En `src/globals/AjustesGuia.ts`, agregar al final de `fields`:

```ts
    {
      name: 'whatsappToursActivo',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Muestra los links de WhatsApp junto a los tours. El número es la variable WHATSAPP_NUMERO.' },
    },
```

- [ ] **Paso 6: bloque.** En `src/bloques/articulo.ts`, importar `esClaveDeTour` de `../dominio/presencia` y agregar a `bloquesArticulo`:

```ts
  {
    slug: 'tour',
    labels: { singular: 'Tour', plural: 'Tours' },
    fields: [
      { name: 'zona', type: 'relationship', relationTo: 'zonas', required: true },
      {
        name: 'tour',
        type: 'text',
        required: true,
        validate: (v: unknown) => (typeof v === 'string' && esClaveDeTour(v) ? true : 'Elige un tour del catálogo.'),
        admin: { components: { Field: { path: '/admin/ToursRelacionados#ToursRelacionados', clientProps: { modo: 'uno' } } } },
      },
    ],
  },
```

- [ ] **Paso 7: selector.** En `src/admin/ToursRelacionados.tsx`:

Cambiar la firma y las primeras líneas:

```tsx
type Extra = { modo?: 'varios' | 'uno'; rutaZona?: string }

export const ToursRelacionados: React.FC<TextFieldClientProps & Extra> = ({ path, field, modo = 'varios', rutaZona }) => {
  const { value, setValue, showError, errorMessage } = useField<string[] | string | null>({ path })
  // La zona: la ruta absoluta si se pasó; si no, el campo hermano («zona» junto a este campo, también dentro de un bloque).
  const campoZona = rutaZona ?? (path.includes('.') ? path.replace(/[^.]+$/, 'zona') : 'zona')
  const zonaId = idDeZona(useFormFields(([campos]) => campos[campoZona]?.value))
```

con `import type { TextFieldClientProps } from 'payload'` y `import type React from 'react'` en lugar del tipo `TextFieldClientComponent`. Cambiar `guardadas`, `quitar`, `alternar` y `lleno`:

```tsx
  const uno = modo === 'uno'
  const guardadas = uno ? (typeof value === 'string' && value ? [value] : []) : Array.isArray(value) ? value : []
  const quitar = (clave: string) => setValue(uno ? null : guardadas.filter((c) => c !== clave))
  const alternar = (clave: string) => {
    if (guardadas.includes(clave)) quitar(clave)
    else setValue(uno ? clave : [...guardadas, clave])
  }
  const lleno = !uno && guardadas.length >= MAX_TOURS_RELACIONADOS
```

- [ ] **Paso 8: regenerar.** `npm run generate:types`, `npm run generate:importmap`, `npm run migracion:regenerar -- --no-hay-deploy` (si ya hubo deploy a producción: `npm run payload migrate:create paquete-1`). Luego `npx payload migrate:fresh --force-accept-warning` en la base local y el seed de `AGENTS.md`.

- [ ] **Paso 9: comprobar el riesgo del bloque (spec §2.1).** `npm run dev`, abrir un artículo en `/admin`, insertar el bloque «Tour», elegir una zona y ver que el selector carga los tours de esa zona.
  - Si `useFormFields` no ve `zona` dentro del bloque: quitar `admin.components` del campo `tour`, dejarlo como texto con `admin: { description: 'Clave del tour: servicio:slug o paquete:slug.' }`, correr `npm run generate:importmap` y anotarlo en el mensaje del commit. El sitio público no cambia.
  - Detener el servidor al terminar.

- [ ] **Paso 10: correr la prueba y ver que pasa.** `npm run test:int -- paquete-1`. Esperado: PASS.

- [ ] **Paso 11: commit** de los archivos de esta tarea, con mensaje `feat: esquema del paquete 1 (visita, preguntas, temporadas, bloque Tour)` y la línea `Co-Authored-By`.

### Tarea 6: datos públicos

**Archivos:**
- Modificar: `src/dominio/catalogo.ts`, `src/sitio/datos/tipos.ts`, `src/sitio/datos/mapeo.ts`, `src/sitio/datos/lecturas/catalogo.ts`, `src/sitio/datos/lecturas/ajustes.ts`, `src/sitio/datos/cacheadas.ts`
- Crear: `src/sitio/datos/whatsapp.ts`
- Prueba: `tests/unit/catalogo.test.ts`, `tests/unit/mapeo-documentos.test.ts`, fixtures de las pruebas que construyen `TarjetaLugar`

**Interfaces:**
- Produce: `PrecioDesde.valor: number`; `TourConFoto.meses: number[]`, `TourConFoto.enTemporada: boolean`; `TarjetaLugar.otrosNombres`, `.enlazarMenciones`, `.servicios`; `FichaLugar.preguntas`, `.visita`; `Ajustes.whatsappToursActivo`; `whatsappTours(lang): Promise<string | null>`.

- [ ] **Paso 1: escribir las pruebas que fallan.** En `tests/unit/catalogo.test.ts`:

```ts
it('el precio trae su número además del texto', () => {
  const [mxn] = toursDe(validarServicios([servicio()]), 'es')
  expect(mxn.precio).toMatchObject({ monto: '$11,290', valor: 11290, moneda: 'MXN' })
  const [usd] = toursDe(validarServicios([servicio()]), 'en')
  expect(usd.precio).toMatchObject({ valor: aDolares('11290.00', '17.5000'), moneda: 'USD' })
})
```

En `tests/unit/mapeo-documentos.test.ts`, que ya importa `fichaLugarDe` y define el fixture `lugar`:

```ts
it('mapea visita, preguntas y nombres', () => {
  const doc = { ...lugar, otrosNombres: ['Balandra'], enlazarMenciones: false,
    visita: { costoEntrada: '$100', entradaGratis: false, minutosDesdeZona: 45, medio: 'auto', comoLlegar: null, servicios: ['sombra'], mejorHora: null },
    preguntas: [{ id: 'a', pregunta: '¿Hay baños?', respuesta: 'No.' }] }
  const f = fichaLugarDe(doc as never, 'es', {})!
  expect(f.otrosNombres).toEqual(['Balandra'])
  expect(f.enlazarMenciones).toBe(false)
  expect(f.servicios).toEqual(['sombra'])
  expect(f.visita).toMatchObject({ costoEntrada: '$100', minutosDesdeZona: 45, medio: 'auto' })
  expect(f.preguntas).toEqual([{ pregunta: '¿Hay baños?', respuesta: 'No.' }])
})

it('sin datos: enlazarMenciones por defecto y visita nula', () => {
  const f = fichaLugarDe(lugar as never, 'es', {})!
  expect(f.enlazarMenciones).toBe(true)
  expect(f.visita).toBeNull()
  expect(f.preguntas).toEqual([])
})
```

- [ ] **Paso 2: correrlas y ver que fallan.**

- [ ] **Paso 3: precio numérico.** En `src/dominio/catalogo.ts`:

```ts
export type PrecioDesde = { monto: string; valor: number; moneda: 'MXN' | 'USD'; estrategia: Estrategia }
```

y en `precioDesde`:

```ts
  if (lang === 'en') {
    const valor = aDolares(item.precioMxn, item.tipoCambio)
    return { monto: formato(valor, 'USD'), valor, moneda: 'USD', estrategia: item.estrategia }
  }
  const valor = Number(item.precioMxn)
  return { monto: formato(valor, 'MXN'), valor, moneda: 'MXN', estrategia: item.estrategia }
```

- [ ] **Paso 4: tipos.** En `src/sitio/datos/tipos.ts`, importar `import type { VisitaPublica } from '../../dominio/visita'`. A `TarjetaLugar`, sumar:

```ts
  otrosNombres: string[]; enlazarMenciones: boolean; servicios: string[]
```

a `FichaLugar`:

```ts
  preguntas: { pregunta: string; respuesta: string }[]; visita: VisitaPublica | null
```

y a `Ajustes`: `whatsappToursActivo: boolean`.

- [ ] **Paso 5: mapeo.** En `src/sitio/datos/mapeo.ts`, en `lugarDe`, después de `toursRelacionados`:

```ts
    otrosNombres: doc.otrosNombres ?? [],
    enlazarMenciones: doc.enlazarMenciones !== false,
    servicios: doc.visita?.servicios ?? [],
```

Agregar antes de `fichaLugarDe`:

```ts
function visitaDe(doc: Lugare): VisitaPublica | null {
  const v = doc.visita
  if (!v) return null
  const publica: VisitaPublica = {
    costoEntrada: v.costoEntrada ?? null,
    entradaGratis: Boolean(v.entradaGratis),
    minutosDesdeZona: v.minutosDesdeZona ?? null,
    medio: v.medio ?? null,
    comoLlegar: v.comoLlegar ?? null,
    servicios: v.servicios ?? [],
    mejorHora: v.mejorHora ?? null,
  }
  return tieneVisita(publica) ? publica : null
}
```

con `import { tieneVisita, type VisitaPublica } from '../../dominio/visita'`. En `fichaLugarDe`, sumar:

```ts
    preguntas: (doc.preguntas ?? []).map((p) => ({ pregunta: p.pregunta, respuesta: p.respuesta })),
    visita: visitaDe(doc),
```

- [ ] **Paso 6: lecturas.** En `src/sitio/datos/lecturas/catalogo.ts`:

```ts
export type FotoTour = { clave: string; foto: Imagen | null; temporada: string | null; meses: number[] }
```

y en el `map` de `fotosDeTours`:

```ts
  return docs.map((d) => ({ clave: `${d.tipo}:${d.slug}`, foto: d.foto ? imagenDe(d.foto, lang) : null, temporada: d.temporada ?? null, meses: (d.meses ?? []).map(Number) }))
```

En `src/sitio/datos/lecturas/ajustes.ts`, sumar `whatsappToursActivo: Boolean(g.whatsappToursActivo),`.

- [ ] **Paso 7: tours con temporada.** En `src/sitio/datos/cacheadas.ts`:

```ts
export type TourConFoto = Tour & Pick<FotoTour, 'foto' | 'meses'> & { temporada: string | null; enTemporada: boolean }
```

y en `toursDeSede` (`mesEnBCS`, `mesesATexto`, `enTemporada`, `ordenarPorTemporada` de `../../dominio/temporada`). El orden corre fuera de la caché, para que cambie con el mes:

```ts
    const mes = mesEnBCS(new Date())
    const conDatos = toursDe(items, lang).map((t) => {
      const f = porClave.get(t.clave)
      const meses = f?.meses ?? []
      return { ...t, foto: f?.foto ?? null, meses, temporada: f?.temporada ?? mesesATexto(meses, lang), enTemporada: enTemporada(meses, mes) }
    })
    return ordenarPorTemporada(conDatos, mes)
```

- [ ] **Paso 8: número de WhatsApp.**

```ts
// src/sitio/datos/whatsapp.ts
import type { Locale } from '../../dominio/idioma'
import { digitosWhatsapp } from '../../dominio/whatsapp'
import { whatsappNumero } from '../entorno'
import { ajustesCacheados } from './cacheadas'

// Los dígitos de WHATSAPP_NUMERO si la casilla de Ajustes está encendida; si no, null (spec del paquete 1 §2.7).
export async function whatsappTours(lang: Locale): Promise<string | null> {
  const ajustes = await ajustesCacheados(lang)
  return ajustes.whatsappToursActivo ? digitosWhatsapp(whatsappNumero()) : null
}
```

- [ ] **Paso 9: fixtures.** `npm run typecheck`. Por cada error en `tests/` de un objeto `TarjetaLugar`, `FichaLugar`, `PrecioDesde` o `TourConFoto`, agregar los campos nuevos con valores vacíos: `otrosNombres: [], enlazarMenciones: true, servicios: []`, `preguntas: [], visita: null`, `valor: 0`, `meses: [], enTemporada: false`. En `tests/unit/catalogo.test.ts:74-79`, que no falla por tipos sino por `toEqual`, agregar `valor: 11290` al `precio` esperado.

- [ ] **Paso 10: correr todo.** `npm run typecheck` y `npm run test:unit`. Esperado: sin errores.

- [ ] **Paso 11: commit** con mensaje `feat: datos públicos de visita, temporadas y precio numérico` y la línea `Co-Authored-By`.

### Tarea 7: JSON-LD

**Archivos:**
- Modificar: `src/sitio/seo/jsonld.ts`
- Prueba: `tests/unit/jsonld-tours.test.ts`

**Interfaces:**
- Produce: `toursLd(tours: TourConFoto[], c: { lang: Locale; base: string; lugarId?: string }): object`, `lugarLd` con `@id`.

- [ ] **Paso 1: escribir la prueba que falla**

```ts
// tests/unit/jsonld-tours.test.ts
import { describe, expect, it } from 'vitest'

import type { TourConFoto } from '../../src/sitio/datos/cacheadas'
import type { FichaLugar } from '../../src/sitio/datos/tipos'
import { lugarLd, toursLd } from '../../src/sitio/seo/jsonld'

const base = 'https://www.salysoltours.com'
const tour = (extra: Partial<TourConFoto> = {}): TourConFoto => ({
  clave: 'servicio:a', tipo: 'servicio', slug: 'a', nombre: 'Tour A', duracion: null, noches: null, ruta: '/es/servicio/e/a',
  precio: { monto: '$1,500', valor: 1500, moneda: 'MXN', estrategia: 'por_persona' }, foto: null, temporada: null, meses: [], enTemporada: false, ...extra,
})
const trip = (t: TourConFoto, c = {}) => (toursLd([t], { lang: 'es', base, ...c }) as { itemListElement: { item: Record<string, never> }[] }).itemListElement[0].item

describe('toursLd', () => {
  it('por persona: minPrice numérico y unidad', () => {
    expect(trip(tour())).toMatchObject({
      '@type': 'TouristTrip', name: 'Tour A', url: `${base}/es/servicio/e/a`,
      offers: { '@type': 'Offer', url: `${base}/es/servicio/e/a`, priceSpecification: { '@type': 'UnitPriceSpecification', minPrice: 1500, priceCurrency: 'MXN', unitText: 'por persona' } },
      provider: { '@type': 'Organization', name: 'Sun Baja', url: base },
    })
  })
  it('por grupo lleva su unidad', () => {
    const t = tour({ precio: { monto: '$11,290', valor: 11290, moneda: 'MXN', estrategia: 'por_grupo' } })
    expect(trip(t)).toMatchObject({ offers: { priceSpecification: { minPrice: 11290, unitText: 'por grupo' } } })
  })
  it('paquete', () => {
    expect(trip(tour({ tipo: 'paquete', noches: 5 }))).toMatchObject({ offers: { priceSpecification: { minPrice: 1500 } } })
  })
  it('tarifa fija: sin unitText', () => {
    const t = tour({ precio: { monto: '$900', valor: 900, moneda: 'MXN', estrategia: 'tarifa_fija' } })
    expect(trip(t).offers).not.toHaveProperty('priceSpecification.unitText')
  })
  it('sin precio: sin offers', () => expect(trip(tour({ precio: null }))).not.toHaveProperty('offers'))
  it('en inglés, USD', () => {
    const t = tour({ precio: { monto: '$86', valor: 86, moneda: 'USD', estrategia: 'por_persona' } })
    expect(trip(t, { lang: 'en' })).toMatchObject({ offers: { priceSpecification: { minPrice: 86, priceCurrency: 'USD', unitText: 'per person' } } })
  })
  it('con y sin itinerary hacia el lugar', () => {
    expect(trip(tour(), { lugarId: `${base}/es/guia/lugares/x#lugar` })).toMatchObject({ itinerary: { '@id': `${base}/es/guia/lugares/x#lugar` } })
    expect(trip(tour())).not.toHaveProperty('itinerary')
  })
})

describe('lugarLd', () => {
  const l = {
    nombre: 'Playa', resumen: 'R', fotos: [], direccion: null, coordenadas: null, telefono: null, rangoPrecio: null, horario: [],
    visita: { costoEntrada: null, entradaGratis: true, minutosDesdeZona: null, medio: null, comoLlegar: null, servicios: ['sombra', 'sin-servicios'], mejorHora: null },
  } as unknown as FichaLugar
  const c = { url: '/es/guia/lugares/playa', tipoSchema: 'Beach', zonaNombre: 'La Paz', base, lang: 'es' as const }
  it('@id, gratis y servicios, sin publicar sin-servicios', () => {
    expect(lugarLd(l, c)).toMatchObject({
      '@id': `${base}/es/guia/lugares/playa#lugar`,
      isAccessibleForFree: true,
      amenityFeature: [{ '@type': 'LocationFeatureSpecification', name: 'Sombra', value: true }],
    })
  })
  it('sin visita: sin esas llaves', () => {
    const r = lugarLd({ ...l, visita: null }, c)
    expect(r).not.toHaveProperty('isAccessibleForFree')
    expect(r).not.toHaveProperty('amenityFeature')
  })
})
```

- [ ] **Paso 2: correrla y ver que falla.**

- [ ] **Paso 3: implementar.** En `src/sitio/seo/jsonld.ts`, con `import type { TourConFoto } from '../datos/cacheadas'`, `import { SERVICIOS_VISITA } from '../../dominio/visita'` y `import { textos } from '../textos'`.

`lugarLd` recibe `lang` en su contexto, y agrega:

```ts
export function lugarLd(l: FichaLugar, c: { url: string; tipoSchema: string; zonaNombre: string; base: string; lang: Locale }) {
  const servicios = SERVICIOS_VISITA.filter((s) => s.valor !== 'sin-servicios' && l.visita?.servicios.includes(s.valor))
  return limpio({
    '@context': 'https://schema.org',
    '@id': `${absoluta(c.url, c.base)}#lugar`,
    '@type': c.tipoSchema,
    // …campos actuales sin cambios…
    isAccessibleForFree: l.visita?.entradaGratis ? true : null,
    amenityFeature: servicios.map((s) => ({ '@type': 'LocationFeatureSpecification', name: s[c.lang], value: true })),
  })
}
```

Agregar `lang` en la llamada de `lugares/[slug]/page.tsx` (`lugarLd(l, { url: ruta, tipoSchema: …, zonaNombre: …, base: sitioUrl(), lang })`) y en `tests/unit/jsonld-documentos.test.ts`. `jsonld.ts` importa `TourConFoto` solo como tipo, así no arrastra Payload a las pruebas.

Agregar al final:

```ts
function tourLd(t: TourConFoto, c: { lang: Locale; base: string; lugarId?: string }) {
  const url = absoluta(t.ruta, c.base)
  const unidad = t.precio ? textos(c.lang).tours.por[t.precio.estrategia] : ''
  return limpio({
    '@type': 'TouristTrip',
    name: t.nombre,
    url,
    image: t.foto ? absoluta(t.foto.src, c.base) : null,
    itinerary: c.lugarId ? { '@id': c.lugarId } : null,
    provider: { '@type': 'Organization', name: 'Sun Baja', url: c.base },
    offers: t.precio
      ? {
          '@type': 'Offer',
          url,
          priceSpecification: limpio({
            '@type': 'UnitPriceSpecification',
            minPrice: t.precio.valor,
            priceCurrency: t.precio.moneda,
            unitText: unidad || null,
          }),
        }
      : null,
  })
}

// Spec del paquete 1 §2.5: TouristTrip y no Product, porque los resultados de comerciante piden envío y devoluciones.
export function toursLd(tours: TourConFoto[], c: { lang: Locale; base: string; lugarId?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: tours.map((t, i) => ({ '@type': 'ListItem', position: i + 1, item: tourLd(t, c) })),
  }
}
```

- [ ] **Paso 4: correrla y ver que pasa.** También `npm run typecheck`.

- [ ] **Paso 5: commit** con mensaje `feat: JSON-LD de tours y datos de visita` y la línea `Co-Authored-By`.

### Tarea 8: secciones de la ficha

**Archivos:**
- Crear: `src/sitio/ui/PreguntasFrecuentes.tsx`, `src/sitio/ui/AntesDeIr.tsx`
- Modificar: `src/sitio/ui/CuerpoRico.tsx`, `src/app/(sitio)/[lang]/guia/lugares/[slug]/page.tsx`, `src/sitio/textos.ts`, `src/sitio/estilos/ficha.css`
- Prueba: `tests/unit/ficha-lugar.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan.** En `tests/unit/ficha-lugar.test.ts`, agregar `ajustesCacheados: async () => ({ whatsappToursActivo: false })` al mock de `cacheadas`, y los campos nuevos a `base`. Luego:

```ts
const visita = { costoEntrada: '$100 MXN', entradaGratis: false, minutosDesdeZona: 45, medio: 'auto', comoLlegar: null, servicios: ['sombra'], mejorHora: null }

it('«Antes de ir» con sus filas y chips arriba', async () => {
  const html = await pintar({ ...base, visita })
  expect(html).toContain('Antes de ir')
  expect(html).toContain('45 min en auto desde La Paz')
  expect(html).toContain('<div class="datos">')
  expect(html.indexOf('Antes de ir')).toBeLessThan(html.indexOf('Lo que hay que saber'))
})

it('sin datos de visita no hay sección', async () => {
  expect(await pintar(base)).not.toContain('Antes de ir')
})

it('preguntas frecuentes y FAQPage', async () => {
  const html = await pintar({ ...base, preguntas: [{ pregunta: '¿Hay sombra?', respuesta: 'Poca.' }] })
  expect(html).toContain('¿Hay sombra?')
  expect(html).toContain('FAQPage')
})

it('sin preguntas no hay FAQPage', async () => {
  expect(await pintar(base)).not.toContain('FAQPage')
})

it('enlaza la mención de otro lugar en el cuerpo, pero no la propia ficha', async () => {
  otrosLugares = [{ ...base, id: 2, slug: 'mar-azul', nombre: 'Mar Azul' }]
  const cuerpo = { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Junto a Café Duna y Mar Azul.', format: 0 }] }] } }
  const html = await pintar({ ...base, cuerpo })
  expect(html).toContain('<a href="/es/guia/lugares/mar-azul">Mar Azul</a>') // El texto completo: el riel «Más…» también enlaza a esa ficha.
  expect(html).not.toContain('<a href="/es/guia/lugares/cafe-duna">Café Duna</a>')
  otrosLugares = []
})
```

Para eso, agregar `let otrosLugares: FichaLugar[] = []` junto a `let ficha = base`, y cambiar el mock a `lugaresCacheados: async () => [ficha, ...otrosLugares]`.

- [ ] **Paso 2: correrlas y ver que fallan.**

- [ ] **Paso 3: componentes.**

```tsx
// src/sitio/ui/PreguntasFrecuentes.tsx
// Lista de preguntas (bloque del artículo y ficha del lugar). El FAQPage lo pone quien la usa.
export function PreguntasFrecuentes({ preguntas, etiqueta }: { preguntas: { pregunta: string; respuesta: string }[]; etiqueta: string }) {
  if (!preguntas.length) return null
  return (
    <div className="faq" aria-label={etiqueta}>
      {preguntas.map((p, i) => (
        <details key={i}>
          <summary>{p.pregunta}</summary>
          <div className="faq__resp"><p>{p.respuesta}</p></div>
        </details>
      ))}
    </div>
  )
}
```

```tsx
// src/sitio/ui/AntesDeIr.tsx
import type { Locale } from '../../dominio/idioma'
import { filasVisita, type VisitaPublica } from '../../dominio/visita'
import { textos } from '../textos'

// «Antes de ir» (spec del paquete 1 §2.3): texto real en una tabla, sin iconos que reemplacen palabras.
export function AntesDeIr({ lang, visita, zonaNombre }: { lang: Locale; visita: VisitaPublica | null; zonaNombre: string }) {
  const filas = visita ? filasVisita(visita, lang, zonaNombre) : []
  if (!filas.length) return null
  return (
    <section className="bloque antes-de-ir" aria-labelledby="t-antes">
      <h2 id="t-antes" className="t-seccion">{textos(lang).ficha.antesDeIr}</h2>
      <table className="horario">
        <tbody>
          {filas.map((f) => (
            <tr key={f.dato}><th scope="row">{f.dato}</th><td>{f.valor}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
```

En `src/sitio/textos.ts`, dentro de `ficha`: `antesDeIr: 'Antes de ir',` y `preguntas: 'Preguntas frecuentes',` en español; `antesDeIr: 'Before you go',` y `preguntas: 'Frequently asked questions',` en inglés.

En `CuerpoRico.tsx`, reemplazar el cuerpo del conversor `preguntasFrecuentes`:

```tsx
      preguntasFrecuentes: ({ node }: Args) => (
        <PreguntasFrecuentes preguntas={(node.fields.preguntas as { pregunta: string; respuesta: string }[] | undefined) ?? []} etiqueta={t.articulo.preguntas} />
      ),
```

- [ ] **Paso 4: ficha.** En `lugares/[slug]/page.tsx`, con los imports nuevos (`chipsVisita`, `enlazarMenciones`, `candidatosMencion`, `AntesDeIr`, `PreguntasFrecuentes`, `faqLd`):

Después de calcular `citan`:

```tsx
  const visitaChips = l.visita ? chipsVisita(l.visita, lang, zona?.nombre ?? '') : []
  const [cuerpo] = enlazarMenciones([l.cuerpo], candidatosMencion(lugares), { excluir: [l.id] })
```

En `.datos`, después de los chips de `caracteristicas`:

```tsx
          {visitaChips.map((c) => <span key={c}>{c}</span>)}
```

Dentro de `<article>`, antes de `<ToursRelacionados>`:

```tsx
          <AntesDeIr lang={lang} visita={l.visita} zonaNombre={zona?.nombre ?? ''} />
```

En `CuerpoRico`, `cuerpo={cuerpo}`. Después de la sección «Lo que hay que saber»:

```tsx
          {l.preguntas.length > 0 && (
            <section className="bloque" aria-labelledby="t-preguntas">
              <h2 id="t-preguntas" className="t-seccion">{t.ficha.preguntas}</h2>
              <PreguntasFrecuentes preguntas={l.preguntas} etiqueta={t.ficha.preguntas} />
            </section>
          )}
```

Junto a los otros `JsonLd`:

```tsx
      {l.preguntas.length > 0 && <JsonLd datos={faqLd(l.preguntas)} />}
```

En `src/sitio/estilos/ficha.css`: `.antes-de-ir th { font-weight: 700; text-align: left; padding-right: 16px; vertical-align: top; }`.

- [ ] **Paso 5: correrlas y ver que pasan.** También `npm run test:unit -- cuerpo-rico`.

- [ ] **Paso 6: commit** con mensaje `feat: «Antes de ir» y preguntas frecuentes en la ficha` y la línea `Co-Authored-By`.

### Tarea 9: bloque «Tour» y menciones en artículos y eventos

**Archivos:**
- Crear: `src/sitio/ui/TarjetaTour.tsx`, `src/sitio/ui/BloqueTour.tsx`
- Modificar: `src/sitio/ui/CuerpoRico.tsx`, `src/app/(sitio)/[lang]/guia/articulos/[slug]/page.tsx`, `src/app/(sitio)/[lang]/guia/eventos/[slug]/page.tsx`, `src/sitio/textos.ts`, `src/sitio/estilos/articulo.css`
- Prueba: `tests/unit/cuerpo-rico.test.ts`, `tests/unit/tarjeta-tour.test.ts`, `tests/unit/ficha-evento.test.ts`

**Interfaces:**
- Produce: `TarjetaTour({ lang, tour, enlace }: { lang; tour: TourConFoto; enlace: { href: string; 'data-evento': string; 'data-zona': string; 'data-origen': string } })`, y `BloqueTour({ lang, zonaId, clave, pieza, origen })`.
- Consume: `Origen` de `ToursEnZona`; `relacionadosVisibles`, `toursLd`, `precioEnTexto`.

- [ ] **Paso 1: escribir las pruebas que fallan**

```ts
// tests/unit/tarjeta-tour.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { TourConFoto } from '../../src/sitio/datos/cacheadas'
import { TarjetaTour } from '../../src/sitio/ui/TarjetaTour'

const tour: TourConFoto = {
  clave: 'servicio:a', tipo: 'servicio', slug: 'a', nombre: 'Tour A', duracion: '6 h', noches: null, ruta: '/es/servicio/e/a',
  precio: { monto: '$11,290', valor: 11290, moneda: 'MXN', estrategia: 'por_grupo' }, foto: null, temporada: 'enero a marzo', meses: [1], enTemporada: true,
}
const enlace = { href: 'https://x.test/a?desde=guia&pieza=tour-articulo-b', 'data-evento': 'tour_clic', 'data-zona': 'la-paz', 'data-origen': 'articulo' }

describe('TarjetaTour', () => {
  const html = renderToStaticMarkup(createElement(TarjetaTour, { lang: 'es', tour, enlace }))
  it('nombre, atribución, «Ver tour» y etiqueta', () => {
    expect(html).toContain('Tour A')
    expect(html).toContain('pieza=tour-articulo-b')
    expect(html).toContain('data-origen="articulo"')
    expect(html).toContain('Ver tour')
    expect(html).toContain('En temporada')
  })
  it('frase en texto plano con el precio', () => {
    expect(html).toContain('Tour A, desde $11,290 MXN por grupo.')
  })
})
```

En `tests/unit/cuerpo-rico.test.ts`, agregar un caso con el mock de `BloqueTour`:

```ts
vi.mock('../../src/sitio/ui/BloqueTour', () => ({
  BloqueTour: ({ clave, pieza, origen }: { clave: string; pieza: string; origen: string }) => createElement('span', { 'data-clave': clave, 'data-pieza': pieza, 'data-origen': origen }),
}))

it('bloque tour: arma la pieza y el origen por defecto', () => {
  const cuerpo = { root: { type: 'root', children: [{ type: 'block', fields: { blockType: 'tour', zona: 7, tour: 'servicio:a' } }] } }
  const html = renderToStaticMarkup(createElement(CuerpoRico, { ...comunes, cuerpo, piezaTours: 'articulo-x' }))
  expect(html).toContain('data-clave="servicio:a"')
  expect(html).toContain('data-pieza="tour-articulo-x"')
  expect(html).toContain('data-origen="articulo"')
})

it('bloque tour sin piezaTours no pinta', () => {
  const cuerpo = { root: { type: 'root', children: [{ type: 'block', fields: { blockType: 'tour', zona: 7, tour: 'servicio:a' } }] } }
  expect(renderToStaticMarkup(createElement(CuerpoRico, { ...comunes, cuerpo }))).not.toContain('data-clave')
})
```

Definir antes de esos casos, con el `resolutor` y el `media` que ya tiene el archivo: `const comunes = { lang: 'es' as const, resolutor: resolutor as never, media, categorias: [] }`.

- [ ] **Paso 2: correrlas y ver que fallan.**

- [ ] **Paso 3: implementar**

```tsx
// src/sitio/ui/TarjetaTour.tsx
import type { Locale } from '../../dominio/idioma'
import type { TourConFoto } from '../datos/cacheadas'
import { textos } from '../textos'
import { Imagen } from './Imagen'
import { detalles, EtiquetaTemporada, precioEnTexto, PrecioTour } from './PrecioTour'

type Enlace = { href: string; 'data-evento': string; 'data-zona': string; 'data-origen': string }

// Tarjeta grande de un tour. No sabe de qué página viene: el enlace y su atribución los arma quien la usa.
// La frase va en texto plano: es la que leen buscadores y asistentes.
export function TarjetaTour({ lang, tour, enlace }: { lang: Locale; tour: TourConFoto; enlace: Enlace }) {
  const t = textos(lang).tours
  const precio = precioEnTexto(lang, tour)
  return (
    <div className="b-tour">
      <a className="b-tour__tarjeta tarjeta presionable" {...enlace}>
        {tour.foto && <div className="media"><Imagen imagen={tour.foto} sizes="(min-width: 900px) 640px, 100vw" alt="" /></div>}
        <div className="b-tour__cuerpo">
          <p className="titular">{tour.nombre}</p>
          <PrecioTour lang={lang} tour={tour} clase="tour__precio" />
          <EtiquetaTemporada lang={lang} tour={tour} />
          {detalles(lang, tour) && <p className="meta">{detalles(lang, tour)}</p>}
          <span className="relacionado__accion">{t.verTour}</span>
        </div>
      </a>
      <p className="relacionado__frase">{precio ? `${tour.nombre}, ${t.desde} ${precio}.` : `${tour.nombre}.`}</p>
    </div>
  )
}
```

```tsx
// src/sitio/ui/BloqueTour.tsx
import type { Locale } from '../../dominio/idioma'
import { relacionadosVisibles } from '../../dominio/presencia'
import { atribucion } from '../../dominio/rutas'
import { toursDeSede, zonasActivasCacheadas } from '../datos/cacheadas'
import { porId } from '../datos/consultas'
import { sitioUrl } from '../entorno'
import { toursLd } from '../seo/jsonld'
import { JsonLd } from './JsonLd'
import { TarjetaTour } from './TarjetaTour'
import type { Origen } from './ToursEnZona'

// Bloque «Tour» (spec del paquete 1 §2.1). Sin zona pública, sin sede, con el catálogo caído o con una clave que ya no
// existe, no pinta nada: nunca lo cambia por otro tour.
export async function BloqueTour({ lang, zonaId, clave, pieza, origen }: { lang: Locale; zonaId: number; clave: string; pieza: string; origen: Origen }) {
  const zona = porId(await zonasActivasCacheadas(lang), zonaId)
  if (!zona?.sedeSlug) return null
  const [tour] = relacionadosVisibles(await toursDeSede(zona.sedeSlug, lang), [clave])
  if (!tour) return null
  const enlace = { href: `${sitioUrl()}${tour.ruta}?${atribucion(pieza)}`, 'data-evento': 'tour_clic', 'data-zona': zona.slug, 'data-origen': origen }
  return (
    <>
      <TarjetaTour lang={lang} tour={tour} enlace={enlace} />
      <JsonLd datos={toursLd([tour], { lang, base: sitioUrl() })} />
    </>
  )
}
```

En `src/sitio/ui/PrecioTour.tsx`, agregar:

```tsx
export function EtiquetaTemporada({ lang, tour }: { lang: Locale; tour: TourConFoto }) {
  return tour.enTemporada ? <span className="etiqueta etiqueta--temporada">{textos(lang).tours.enTemporada}</span> : null
}
```

En `src/sitio/textos.ts`, dentro de `tours`: `verTour: 'Ver tour',` y `enTemporada: 'En temporada',`; en inglés `verTour: 'See tour',` y `enTemporada: 'In season',`.

En `CuerpoRico.tsx`, agregar la prop `origenTours?: Origen` (por defecto `'articulo'`, importando `type Origen` de `./ToursEnZona`), `import { BloqueTour } from './BloqueTour'`, y en `blocks`:

```tsx
      tour: ({ node }: Args) => {
        const zonaId = idDe(node.fields.zona)
        const clave = node.fields.tour
        return piezaTours && typeof zonaId === 'number' && typeof clave === 'string'
          ? <BloqueTour lang={lang} zonaId={zonaId} clave={clave} pieza={`tour-${piezaTours}`} origen={origenTours} />
          : null
      },
```

En `src/sitio/estilos/articulo.css`:

```css
.b-tour { margin-block: 24px; }
.b-tour__tarjeta { display: block; overflow: hidden; }
.b-tour__cuerpo { padding: 16px; }
.etiqueta--temporada { display: inline-block; margin-top: 4px; }
```

- [ ] **Paso 4: menciones.** En `articulos/[slug]/page.tsx` y en `eventos/[slug]/page.tsx`, importar `enlazarMenciones` y `candidatosMencion`, y antes del `return`:

```tsx
  const [cuerpo] = enlazarMenciones([a.cuerpo], candidatosMencion(lugares))
```

(`e.cuerpo` en la página de evento), pasando `cuerpo={cuerpo}` a `CuerpoRico`. Una llamada a `enlazarMenciones` ya deja fuera los lugares con «Tarjeta de lugar», porque los reúne del mismo cuerpo.

En `tests/unit/ficha-evento.test.ts`, si su fixture de `lugares` no trae `otrosNombres` y `enlazarMenciones`, agregarlos.

- [ ] **Paso 5: correrlas y ver que pasan.** También `npm run typecheck`.

- [ ] **Paso 6: commit** con mensaje `feat: bloque Tour y enlaces automáticos en artículos y eventos` y la línea `Co-Authored-By`.

### Tarea 10: WhatsApp en las piezas de tours

**Archivos:**
- Crear: `src/sitio/ui/EnlaceWhatsapp.tsx`
- Modificar: `src/sitio/ui/ToursEnZona.tsx`, `src/sitio/ui/ToursRelacionados.tsx`, `src/sitio/ui/presencia/PresenciaTours.tsx`, `src/sitio/ui/Pie.tsx`, `src/app/(sitio)/[lang]/guia/lugares/[slug]/page.tsx`, `src/sitio/textos.ts`, `src/sitio/estilos/presencia.css`, `src/sitio/estilos/ficha.css`
- Prueba: `tests/unit/enlace-whatsapp.test.ts`, `tests/unit/ficha-lugar.test.ts`

**Interfaces:**
- Produce: `EnlaceWhatsapp({ lang, digitos, nombre, zona, origen, icono? })`. `icono` pinta el botón cuadrado de la barra.
- `ToursRelacionados` suma la prop `whatsapp: string | null` y sigue síncrono.

- [ ] **Paso 1: escribir las pruebas que fallan**

```ts
// tests/unit/enlace-whatsapp.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EnlaceWhatsapp } from '../../src/sitio/ui/EnlaceWhatsapp'

describe('EnlaceWhatsapp', () => {
  const props = { lang: 'es' as const, digitos: '5210000000000', nombre: 'La Paz', zona: 'la-paz', origen: 'barra' as const }
  it('texto, evento y mensaje', () => {
    const html = renderToStaticMarkup(createElement(EnlaceWhatsapp, props))
    expect(html).toContain('https://wa.me/5210000000000?text=Hola')
    expect(html).toContain('data-evento="whatsapp_clic"')
    expect(html).toContain('data-origen="barra"')
    expect(html).toContain('¿Dudas? Pregunta por WhatsApp')
    expect(html).toContain('rel="noopener"')
  })
  it('icono con aria-label', () => {
    const html = renderToStaticMarkup(createElement(EnlaceWhatsapp, { ...props, icono: true }))
    expect(html).toContain('aria-label="Preguntar por WhatsApp"')
    expect(html).not.toContain('¿Dudas?')
  })
})
```

En `tests/unit/ficha-lugar.test.ts`, sumando `afterEach` y `beforeEach` al import de `vitest`, con una variable `let whatsappActivo = false` que use el mock `ajustesCacheados: async () => ({ whatsappToursActivo: whatsappActivo })`, y con `process.env.WHATSAPP_NUMERO = '5210000000000'` al inicio:

```ts
describe('WhatsApp de tours en la ficha', () => {
  const zonaConSede = { id: 1, slug: 'la-paz', nombre: 'La Paz', descripcion: null, sedeSlug: 'la-paz', coordenadas: [-110.3, 24.1] }
  beforeEach(() => { whatsappActivo = true; zonas = [zonaConSede]; tours = [tourEspiritu] })
  afterEach(() => { whatsappActivo = false; zonas = zonasBase; tours = [] })

  it('sale en «Tours para conocer»', async () => {
    const html = await pintar({ ...base, toursRelacionados: ['servicio:espiritu-santo'] })
    expect(html).toContain('Tour Espíritu Santo')
    expect(html).toContain('data-evento="whatsapp_clic"')
  })
  it('con patrocinio declarado no sale', async () => {
    const patrocinio = { activo: true, desde: '2020-01-01', hasta: '2999-01-01' }
    const html = await pintar({ ...base, patrocinio, toursRelacionados: ['servicio:espiritu-santo'] })
    expect(html).toContain('Tour Espíritu Santo')
    expect(html).not.toContain('data-evento="whatsapp_clic"')
  })
})
```

- [ ] **Paso 2: correrlas y ver que fallan.**

- [ ] **Paso 3: implementar**

```tsx
// src/sitio/ui/EnlaceWhatsapp.tsx
import type { Locale } from '../../dominio/idioma'
import { enlaceWhatsapp, mensajeWhatsapp } from '../../dominio/whatsapp'
import { textos } from '../textos'
import { ICONO_WHATSAPP } from './iconos'

type OrigenWhatsapp = 'relacionado' | 'zona' | 'tarjeta' | 'barra'

// Link de salida a WhatsApp (spec del paquete 1 §2.7). Recibe los dígitos ya validados: si no hay, no se pinta.
export function EnlaceWhatsapp({ lang, digitos, nombre, zona, origen, icono = false }: {
  lang: Locale; digitos: string; nombre: string; zona: string; origen: OrigenWhatsapp; icono?: boolean
}) {
  const t = textos(lang).tours
  const comunes = {
    href: enlaceWhatsapp(digitos, mensajeWhatsapp(lang, nombre)),
    target: '_blank',
    rel: 'noopener',
    'data-evento': 'whatsapp_clic',
    'data-zona': zona,
    'data-origen': origen,
  }
  if (icono) {
    return (
      <a className="boton-whatsapp presionable" aria-label={t.whatsappBoton} {...comunes}>
        <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d={ICONO_WHATSAPP} /></svg>
      </a>
    )
  }
  return <a className="enlace-whatsapp" {...comunes}>{t.whatsappTexto}</a>
}
```

Mover la constante `ICONO_WHATSAPP` de `Pie.tsx` a un archivo nuevo `src/sitio/ui/iconos.ts`, con `export const ICONO_WHATSAPP = '…'` y el mismo valor, e importarla en `Pie.tsx`.

En `src/sitio/textos.ts`, dentro de `tours`: `whatsappTexto: '¿Dudas? Pregunta por WhatsApp',` y `whatsappBoton: 'Preguntar por WhatsApp',`; en inglés `whatsappTexto: 'Questions? Ask on WhatsApp',` y `whatsappBoton: 'Ask on WhatsApp',`.

- [ ] **Paso 4: piezas.**

`Pie.tsx`: al `<a className="pie-sb__boton" …>` del WhatsApp, agregar `data-evento="whatsapp_clic" data-origen="pie"`.

`ToursRelacionados.tsx`: la firma suma `whatsapp` y al cerrar la sección:

```tsx
export function ToursRelacionados({ lang, lugar, tours, whatsapp, base }: {
  lang: Locale; lugar: { slug: string; nombre: string; zonaSlug: string }; tours: TourConFoto[]; whatsapp: string | null; base: string
}) {
```

```tsx
      {whatsapp && <EnlaceWhatsapp lang={lang} digitos={whatsapp} nombre={lugar.nombre} zona={lugar.zonaSlug} origen="relacionado" />}
      <JsonLd datos={toursLd(tours, { lang, base: sitioUrl(), lugarId: `${sitioUrl()}${base}#lugar` })} />
```

donde `base` es la ruta de la ficha (`rutas.lugar(lang, l.slug)`).

Ficha (`lugares/[slug]/page.tsx`): llamar `whatsappTours(lang)` junto al `Promise.all` inicial y pasar:

```tsx
<ToursRelacionados lang={lang} lugar={l} tours={relacionados} whatsapp={declarado ? null : whatsapp} base={ruta} />
```

`declarado` y `ruta` ya existen antes de ese `return`.

`ToursEnZona.tsx`: leer `const whatsapp = formato === 'riel' ? await whatsappTours(lang) : null`. Justo antes de cada `return` de los tres formatos, dentro del JSX, agregar:

```tsx
<JsonLd datos={toursLd(tours, { lang, base: sitioUrl() })} />
```

En el formato riel, dentro de `.seccion__cabeza`, junto a `verTodos`:

```tsx
{whatsapp && <EnlaceWhatsapp lang={lang} digitos={whatsapp} nombre={zona.nombre} zona={zona.slug} origen="zona" />}
```

`PresenciaTours.tsx`: leer `const whatsapp = zona ? await whatsappTours(lang) : null` y:

- En la barra, envolver el link principal en una fila: `<div className="barra-tours__fila-principal">` con el `<a>` actual y después `{whatsapp && zona && <EnlaceWhatsapp lang={lang} digitos={whatsapp} nombre={zona.nombre} zona={zona.slug} origen="barra" icono />}`.
- En la tarjeta, después del link «Ver todos», **solo si no es ficha**:

```tsx
{whatsapp && tipo !== 'ficha' && <EnlaceWhatsapp lang={lang} digitos={whatsapp} nombre={zona.nombre} zona={zona.slug} origen="tarjeta" />}
```

En `src/sitio/estilos/presencia.css`:

```css
.barra-tours__fila-principal { display: flex; gap: 8px; align-items: stretch; }
.barra-tours__fila-principal > .boton { flex: 1; }
.boton-whatsapp { display: flex; align-items: center; justify-content: center; width: 48px; border-radius: var(--radio-card); box-shadow: 0 0 0 1px var(--borde); background: var(--blanco, #fff); }
.boton-whatsapp svg { width: 24px; height: 24px; }
.enlace-whatsapp { display: inline-block; margin-top: 12px; font-weight: 700; }
```

Comprobar los nombres de las variables CSS contra `base.css`; usar las que existan.

En `tests/unit/ficha-lugar.test.ts` y en otras pruebas que rendericen `ToursEnZona`, `whatsappTours` no se usa directamente porque esos componentes se mockean. Si `npm run test:unit` falla por un mock de `cacheadas` sin `ajustesCacheados`, agregarlo con `async () => ({ whatsappToursActivo: false })`.

- [ ] **Paso 5: correrlas y ver que pasan.** `npm run test:unit` y `npm run typecheck`.

- [ ] **Paso 6: commit** con mensaje `feat: WhatsApp de tours y JSON-LD en los bloques de tours` y la línea `Co-Authored-By`.

### Tarea 11: «En temporada este mes» y etiqueta en las tarjetas

**Archivos:**
- Crear: `src/sitio/ui/TemporadaPortada.tsx`
- Modificar: `src/app/(sitio)/[lang]/guia/page.tsx`, `src/sitio/ui/ToursEnZona.tsx`, `src/sitio/ui/ToursRelacionados.tsx`, `src/sitio/textos.ts`
- Prueba: `tests/unit/temporada-portada.test.ts`

- [ ] **Paso 1: escribir la prueba que falla.** La lógica de selección es pura y va en `src/dominio/temporada.ts`:

Agregar a `tests/unit/temporada.test.ts`:

```ts
describe('unoPorZona', () => {
  it('toma uno por zona y luego completa hasta el máximo', () => {
    const listas = [[{ n: 'a1' }, { n: 'a2' }], [{ n: 'b1' }], []]
    expect(unoPorZona(listas, 3).map((x) => x.n)).toEqual(['a1', 'b1', 'a2'])
  })
  it('sin tours', () => expect(unoPorZona([[], []], 3)).toEqual([]))
})
```

(importar `unoPorZona` en la línea de imports de ese archivo).

- [ ] **Paso 2: correrla y ver que falla.**

- [ ] **Paso 3: implementar**

En `src/dominio/temporada.ts`:

```ts
// Reparte: uno por zona, en el orden de las zonas, y vuelve a empezar hasta llegar al máximo (spec del paquete 1 §2.4).
export function unoPorZona<T>(listas: T[][], max: number): T[] {
  const salida: T[] = []
  for (let vuelta = 0; salida.length < max && listas.some((l) => l.length > vuelta); vuelta += 1) {
    for (const lista of listas) {
      if (lista[vuelta] && salida.length < max) salida.push(lista[vuelta])
    }
  }
  return salida
}
```

```tsx
// src/sitio/ui/TemporadaPortada.tsx
import type { Locale } from '../../dominio/idioma'
import { atribucion } from '../../dominio/rutas'
import { unoPorZona } from '../../dominio/temporada'
import { toursDeSede, type TourConFoto } from '../datos/cacheadas'
import type { ZonaPublica } from '../datos/tipos'
import { sitioUrl } from '../entorno'
import { toursLd } from '../seo/jsonld'
import { textos } from '../textos'
import { JsonLd } from './JsonLd'
import { TarjetaTour } from './TarjetaTour'

const MAX = 3

// «En temporada este mes» (spec del paquete 1 §2.4). Sin tours en temporada no hay sección.
export async function TemporadaPortada({ lang, zonas }: { lang: Locale; zonas: ZonaPublica[] }) {
  const conSede = zonas.filter((z) => z.sedeSlug)
  const listas = await Promise.all(conSede.map(async (z) => (await toursDeSede(z.sedeSlug!, lang)).filter((t) => t.enTemporada).map((t) => ({ t, z }))))
  const elegidos = unoPorZona(listas, MAX)
  if (!elegidos.length) return null
  const tours: TourConFoto[] = elegidos.map((e) => e.t)
  return (
    <section className="seccion" aria-labelledby="t-temporada">
      <div className="seccion__cabeza"><h2 id="t-temporada" className="t-seccion">{textos(lang).tours.enTemporadaMes}</h2></div>
      {elegidos.map(({ t, z }) => (
        <TarjetaTour key={t.clave} lang={lang} tour={t} enlace={{ href: `${sitioUrl()}${t.ruta}?${atribucion('portada-temporada')}`, 'data-evento': 'tour_clic', 'data-zona': z.slug, 'data-origen': 'zona' }} />
      ))}
      <JsonLd datos={toursLd(tours, { lang, base: sitioUrl() })} />
    </section>
  )
}
```

En `src/sitio/textos.ts`, dentro de `tours`: `enTemporadaMes: 'En temporada este mes',`; en inglés `enTemporadaMes: 'In season this month',`.

En `guia/page.tsx`, después de la sección de zonas: `<TemporadaPortada lang={lang} zonas={zonas} />`.

En `ToursEnZona.tsx` (formatos fila, bloque y riel) y `ToursRelacionados.tsx`, debajo de cada `<PrecioTour …>`, agregar `<EtiquetaTemporada lang={lang} tour={tour} />`.

- [ ] **Paso 4: correr todo.** `npm run test:unit` y `npm run typecheck`.

- [ ] **Paso 5: commit** con mensaje `feat: tours en temporada en la portada y etiqueta en las tarjetas` y la línea `Co-Authored-By`.

### Tarea 12: seed, E2E y documentación

**Archivos:**
- Modificar: `src/seed/datos.ts`, `tests/e2e/preparar.ts`, `scripts/entorno-e2e.mjs`, `docs/specs/2026-10-30-guia-baja-design.md`, `docs/editores/escribir-para-buscadores.md`
- Prueba: `tests/e2e/paquete-1.spec.ts`

- [ ] **Paso 1: seed.** En `src/seed/datos.ts`:

Dentro del `for` de `LUGARES`, en `data` de `payload.create`, agregar:

```ts
        ...(l.nombre === 'Playa Arena Fina'
          ? {
              otrosNombres: ['Arena Fina'],
              visita: { costoEntrada: '$100 MXN por persona', minutosDesdeZona: 45, medio: 'auto' as const, comoLlegar: 'Por la carretera a Pichilingue.', servicios: ['sombra' as const, 'banos' as const], mejorHora: 'Temprano, antes de las 10.' },
              preguntas: [{ pregunta: '¿Hay sombra?', respuesta: 'Sí, con palapas.' }],
            }
          : {}),
        ...('patrocinado' in l ? { otrosNombres: ['Patrocinado Prueba'] } : {}),
```

En el `payload.update` en inglés del mismo `for`, cuando `l.nombre === 'Playa Arena Fina'`, agregar `visita: { costoEntrada: '$100 MXN per person', comoLlegar: 'Take the road to Pichilingue.', mejorHora: 'Early, before 10.' }` y `preguntas: [{ pregunta: 'Is there shade?', respuesta: 'Yes, palapas.' }]`.

En `cuerpoArticulo`, antes de la línea `h2('En el centro'),` agregar un párrafo con mención y un bloque «Tour». El nombre que se menciona debe estar en `LUGARES` y sin tarjeta en ese mismo cuerpo:

```ts
      { type: 'paragraph', version: 1, format: '', indent: 0, direction: 'ltr', textFormat: 0, children: [txt('Muy cerca de Arena Fina y de Patrocinado Prueba.')] },
      { type: 'block', version: 2, format: '', fields: { id: 'tour-1', blockName: '', blockType: 'tour', zona: zonas[0].id, tour: 'servicio:ballenas-prueba' } },
```

Después de crear los artículos, agregar el registro de temporada con el mes en que corre el seed (`mesEnBCS` de `../dominio/temporada`):

```ts
  await payload.create({
    collection: 'fotos-tours', locale: 'es', overrideAccess: true, context: { disableRevalidate: true },
    data: { sedeSlug: 'la-paz', tipo: 'servicio', slug: 'ballenas-prueba', meses: [String(mesEnBCS(new Date()))] as never },
  })
```

- [ ] **Paso 2: entorno E2E.** En `scripts/entorno-e2e.mjs`, sumar a `envModo`: `WHATSAPP_NUMERO: '5210000000000',`. En `tests/e2e/preparar.ts`, en el `updateGlobal` de `ajustes-guia`, agregar `whatsappToursActivo: true` a `data`.

En el mismo archivo, antes del `payload.delete` de solicitudes, un lugar en La Ventana, la sede cuyo catálogo falso da 500. Va aquí y no en el seed para no cambiar el listado de La Paz:

```ts
// Spec del paquete 1 §5: una ficha cuyo catálogo está caído.
const ventana = await payload.find({ collection: 'zonas', where: { slug: { equals: 'la-ventana' } }, overrideAccess: true, limit: 1 })
const molde = await payload.find({ collection: 'lugares', where: { nombre: { equals: 'Playa Arena Fina' } }, overrideAccess: true, locale: 'es', depth: 0, limit: 1 })
await payload.create({
  collection: 'lugares', locale: 'es', overrideAccess: true, context: { disableRevalidate: true },
  data: {
    nombre: 'Mirador de prueba', slug: 'mirador-de-prueba', resumen: 'Lugar de prueba en La Ventana.', zona: ventana.docs[0].id,
    categorias: molde.docs[0].categorias, fotos: molde.docs[0].fotos, cuerpo: molde.docs[0].cuerpo, coordenadas: [-109.9906, 24.0469],
    toursRelacionados: ['servicio:ballenas-prueba'], _status: 'published',
  } as never,
})
```

- [ ] **Paso 3: escribir la E2E**

```ts
// tests/e2e/paquete-1.spec.ts
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
```

- [ ] **Paso 4: correr la E2E.** Detener cualquier `next dev`. `E2E_SOLO=indexable npm run test:e2e`, y luego `npm run test:e2e` completo. Esperado: todo PASS, incluidas las E2E existentes de presencia y tours. La prueba de `presencia.spec.ts` que espera `Pesca de prueba` en la fila extra cambia, porque ahora «Ballenas de prueba» va primero por temporada: actualizar esas expectativas (`toContainText('Ballenas de prueba')`, y `/Ballenas de prueba/` en la tarjeta). El helper `barra` de `presencia.spec.ts:12` cambia a `page.locator('#tours-barra a.boton')`, porque la tarea 10 envuelve el link en `.barra-tours__fila-principal`.

- [ ] **Paso 5: documentación.**

En `docs/specs/2026-10-30-guia-baja-design.md`:
- §6 Lugares: `visita`, `preguntas`, `otrosNombres`, `enlazarMenciones`. Artículos: bloque «Tour». Fotos de tours: `meses`, `foto` opcional. Ajustes: `whatsappToursActivo`.
- §9 JSON-LD: `TouristTrip`, `amenityFeature` y `FAQPage` en la ficha.
- §13: `whatsapp_clic` (`zona`, `origen`: relacionado, zona, tarjeta, barra o pie).

En `docs/editores/escribir-para-buscadores.md`, agregar una sección «Antes de ir, preguntas y tours» que explique: cómo llenar los datos de visita; escribir la pregunta como la haría un visitante; usar el bloque «Tour» cuando el texto habla de un tour concreto; llenar `otrosNombres` con el nombre corto; apagar `enlazarMenciones` si el nombre es una palabra común; poner los meses en «Fotos y temporadas de tours».

- [ ] **Paso 6: verificación final.** `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:int`, `npm run test:e2e`. Todo en verde. Medir con el banco del plan 4 (`["base","base2"]`) y comprobar que LCP no sube más de 100 ms ni TBT más de 50 ms contra la línea base de la tarea 0, salvo por el ruido A/A. Si se pasa, parar y reportar.

- [ ] **Paso 7: commit y push.**

```bash
git add src/seed tests/e2e scripts/entorno-e2e.mjs docs/specs/2026-10-30-guia-baja-design.md docs/editores/escribir-para-buscadores.md
git commit -m "test: E2E del paquete 1, seed y documentación

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Paso 8: recordatorio para el dueño.** Reportar que en producción falta poner `WHATSAPP_NUMERO` en Vercel y encender «whatsappToursActivo» en Ajustes.
