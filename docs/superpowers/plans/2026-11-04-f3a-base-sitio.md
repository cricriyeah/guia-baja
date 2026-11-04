# F3a Base del sitio público — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar lista la base sobre la que se montan las páginas públicas de la Guía. Incluye:

- el paso por el `proxy.ts`: origen, rutas en inglés, 404 de idioma cruzado, y paginación y filtros como rutas internas;
- el esqueleto `(sitio)/[lang]/guia` con cabecera, pie, 404 y error por idioma;
- la capa de datos cacheada con etiquetas y la revalidación desde Payload;
- el SEO base;
- las redirecciones antes del 404;
- el orden de listados y la paginación.

**Architecture:** Las reglas viven en funciones puras de `src/dominio/` con pruebas unitarias: origen, traducción de rutas en los dos sentidos, etiquetas, indexabilidad, orden y paginación.

El sitio público tiene dos partes:

- **Rutas:** `src/app/(sitio)/[lang]/guia/...`.
- **UI, textos, SEO y datos:** `src/sitio/`.

El layout de `guia` pinta la cabecera y el pie. Así el 404 y el error salen con marco y en su idioma.

Los datos se organizan en tres capas:

- **Lecturas simples** sobre la Local API (`datos/lecturas/*`), probadas contra Postgres.
- **Tabla pura de llaves y etiquetas** (`datos/llaves.ts`), con pruebas unitarias.
- **Envoltorio mecánico** en `unstable_cache` (`datos/cacheadas.ts`).

Las páginas componen varias lecturas cacheadas, y Next asocia sus etiquetas a la página ISR. Toda lista y toda lectura por slug llevan etiquetas de colección (`listados`, `zonas`, `categorias`), porque su resultado puede cambiar sin que su llave cambie. La etiqueta `{tipo}:{id}` va solo en lecturas por id.

El proxy calcula el origen una sola vez y lo reenvía en cabeceras de petición que el cliente no puede falsificar. También convierte `?pagina=N` en un segmento interno, para que los listados sigan siendo ISR, y manda a una ruta interna dinámica los listados con filtros.

Payload revalida con hooks `afterChange`/`afterDelete` en `src/revalidacion/`, que calculan las etiquetas con la función pura del dominio.

**Tech Stack:** Next.js 16.4.3 (App Router, `proxy.ts`, `unstable_cache`, `revalidateTag`, `next/font/local`), Payload 3.92.1 (Local API), React 19.2.6, Vitest 4.0.18, Postgres/PostGIS en Docker.

**Spec:** `docs/specs/2026-10-30-guia-baja-design.md` (§4, §4.1, §6 «Regla de idioma», §7, §9, §10, §11). Índice de F3: `docs/superpowers/plans/2026-11-04-f3-sitio-publico.md`.

## Global Constraints

- Node 24.x (`engines` `^24.22.1`), npm. Payload 3.92.1, Next.js 16.4.3, versiones exactas en `package.json` (sin `^`). No usar Cache Components ni PPR: `cacheComponents` apagado y sin `'use cache'`.
- Este plan no agrega dependencias ni cambia el esquema de Payload.
- **Rutas públicas:** `/es/guia/...` y `/en/guide/...`. El árbol de rutas está en español: `src/app/(sitio)/[lang]/guia/...`. El `proxy.ts` reescribe el inglés al árbol. Las combinaciones cruzadas (`/en/guia/...`, `/es/guide/...`, segmentos del otro idioma) dan 404 con el diseño de la Guía, nunca con una respuesta vacía (spec §4).
- **URLs públicas** solo desde `src/dominio/rutas.ts`. Importaciones dentro de `src/` relativas (no `@/`).
- **Origen (spec §4.1):** `origenDePeticion` solo se llama en `src/proxy.ts`.
  - El proxy siempre sobrescribe dos cabeceras de la petición que sigue: `x-guia-origen` (`publico`/`directo`) y `x-guia-ip`. Borra lo que haya mandado el cliente en ellas y quita `x-guia-proxy`.
  - La Server Action del formulario (F3c) lee esas dos cabeceras con `origenReenviado(headers)`.
  - **Las páginas no leen `headers()` ni cookies.**
- La cabecera `x-guia-proxy` nunca viaja en la respuesta ni se registra en logs. Los logs nunca llevan correo, teléfono ni IP.
- **Regla de idioma (spec §6):** un documento existe en un idioma solo si tiene en él `resumen` y `cuerpo` (y `nombre`/`titulo` cuando es localizado).
  - Toda lectura pública usa `locale`, `fallbackLocale: false` y lee como público (`overrideAccess: false`, sin usuario).
  - Excepción: ninguna en F3a. El nombre del autor ya viaja copiado en `articulos.autorNombre`, así que nunca se lee `users`.
- **Caché (spec §10):** toda lectura del sitio público pasa por `unstable_cache` con etiquetas.
  - Etiquetas del spec: `lugar:{id}`, `evento:{id}`, `articulo:{id}`, `zona:{id}`, `categoria:{id}`, `listados`, `redirecciones`, `ajustes`, `catalogo:{sedeSlug}`, `textos:{zona}:{categoria}`, `tours-fotos`.
  - Este plan agrega etiquetas de colección para las listas y las lecturas por slug: `zonas`, `categorias` y `media`.
  - Se revalida con `revalidateTag(tag, { expire: 0 })`. Las páginas llevan `revalidate = 3600`.
- **Hooks de revalidación:** no revalidan si `req.context.disableRevalidate` es verdadero. Envuelven la llamada en `try/catch` y registran el error sin romper el guardado.
- **SEO (spec §9):**
  - `noindex` en el HTML si `GUIA_INDEXABLE !== 'true'`, si el documento tiene `noIndexar`, por umbral de lugares o si es una variante con filtros.
  - `hreflang` (`es-MX`, `en-US`, `x-default` → español) solo entre versiones indexables.
  - Canónicas absolutas con `SITIO_URL` (`metadataBase`).
- **Diseño:** `docs/diseno/lineamientos.md` y la propuesta C (`docs/diseno/propuestas/c-*.html`, `c-base.css`, `c-base.js`). Los links al sitio de reservas son `<a>`, no `<Link>`.
- Commits en español, terminados con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nunca `push`. No tocar `.great_cto/` ni `shared/`.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/dominio/origen.ts` | Crear | `origenDePeticion(headers, secreto)` → `{ tipo: 'publico' \| 'directo', ip }`, con comparación en tiempo constante. `origenReenviado(headers)` lee `x-guia-origen`/`x-guia-ip` ya puestas por el proxy. Puro (recibe `Headers`). |
| `src/dominio/rutas-publicas.ts` | Crear | `resolverRutaPublica(pathname, searchParams)` devuelve una de estas acciones: `{ tipo: 'pasar' }`, `{ tipo: 'reescribir', destino }`, `{ tipo: 'redirigir', destino }` (308 de `?pagina=1`, conservando los demás parámetros) o `{ tipo: 'noEncontrado', lang }`. Traduce el inglés al árbol; lleva `?pagina=N` (N ≥ 2) al segmento interno `/--pagina/N` y los listados con filtros conocidos a `/--filtros`; responde 404 a todo segmento público que empiece con `--` (ninguna ruta pública lo usa: `--` no es un slug válido). `rutaPublicaDesdeArbol(lang, segmentos)` es la inversa (árbol → ruta pública). Puro; usa `SEGMENTOS` de `rutas.ts`. |
| `src/proxy.ts` | Crear | Proxy de Next 16 para `/es/:path*`, `/en/:path*` y `/guia-sitemap.xml`. Aplica `resolverRutaPublica`. Un `noEncontrado` se reescribe a `/{lang}/guia/--` (ruta que termina en `notFound()`). Fija `x-guia-origen`/`x-guia-ip` en la petición y quita `x-guia-proxy`. En la respuesta pone `x-guia-origen` y, si es directa, `X-Robots-Tag: noindex`. |
| `next.config.ts` | Modificar | El `X-Robots-Tag: noindex` global queda solo para lo que no es la guía (`/admin`, `/api`). Agrega `experimental.serverActions.allowedOrigins`: `salysoltours.com`, `www.salysoltours.com`. |
| `src/dominio/idioma.ts` | Modificar | `CAMPOS_IDIOMA` y `CAMPOS_LOCALIZADOS` por colección (fuente única; las colecciones los reexportan) y `esLocale(valor)`. |
| `src/dominio/etiquetas.ts` | Crear | Constructores de etiquetas (`etiqueta.lugar(id)`, `etiqueta.zonas`, …) y `etiquetasDeCambio(coleccion, doc, anterior)`. Toda colección emite su etiqueta de colección más las de id. Puro. |
| `src/dominio/indexable.ts` | Crear | `esIndexable({ guiaIndexable, noIndexar, conteo, conFiltros })` y `alternosIndexables(alternos)`. Puro. |
| `src/dominio/orden.ts` | Crear | `ordenarListado(items, ahora, { porInicio })`: hasta 2 patrocinios vigentes arriba (por `desde` y luego por nombre); el resto por `orden` + `nombre`, o por `inicio`. Puro. |
| `src/dominio/paginacion.ts` | Crear | `paginar(items, pagina, porPagina)` → `{ items, pagina, totalPaginas }` o `null` si la página está fuera de rango. Puro. |
| `src/sitio/entorno.ts` | Crear | `sitioUrl()`, `guiaIndexable()`, `whatsappNumero()`: lectura única de variables de entorno. |
| `eslint.config.mjs` | Modificar | `@next/next/no-img-element` apagado solo en `src/sitio/**` y `src/app/(sitio)/**` (spec §4.2: sin optimizador de Next). |
| `.env.example`, `docs/specs/2026-10-30-guia-baja-design.md` §5.5 | Modificar | Variable nueva `WHATSAPP_NUMERO` (botón de WhatsApp del pie; el sitio de reservas lo toma también de una variable). |
| `src/sitio/textos.ts` | Crear | Textos de la interfaz es/en (`textos(lang)`). Sin imports de servidor: lo usan componentes de servidor y de cliente. |
| `src/sitio/datos/payload.ts` | Crear | `obtenerPayload()`: instancia compartida (`getPayload({ config })`). |
| `src/sitio/datos/tipos.ts` | Crear | Tipos de dominio que reciben las páginas: `Imagen`, `ZonaPublica`, `CategoriaPublica`, `Ajustes`, `MapaRedirecciones`. Nunca documentos crudos de Payload. |
| `src/sitio/datos/mapeo.ts` | Crear | Mapeos puros de Payload a tipos: `imagenDe(media, lang)` (con `srcset` de `s480/s960/s1600`), `zonaDe`, `categoriaDe` (`grupo` → clase `g-*`). |
| `src/sitio/datos/lecturas/publico.ts` | Crear | `opcionesPublicas(lang)`: `{ locale, fallbackLocale: false, overrideAccess: false, draft: false }`. Es el único lugar donde se arman. |
| `src/sitio/datos/lecturas/zonas.ts` | Crear | `zonasActivas(payload, lang)` (incluye `slug`, `nombre`, `sedeSlug`). |
| `src/sitio/datos/lecturas/categorias.ts` | Crear | `categorias(payload, lang)`. |
| `src/sitio/datos/lecturas/ajustes.ts` | Crear | `ajustesPublicos(payload, lang)`. |
| `src/sitio/datos/lecturas/redirecciones.ts` | Crear | `mapaRedirecciones(payload)`: toda la tabla `redirects` como `{ [from]: destino }`, en una sola lectura. |
| `src/sitio/datos/llaves.ts` | Crear | Tabla pura con la llave y las etiquetas de cada lectura (`LLAVES.zonasActivas(lang)` → `{ llave, etiquetas }`). F3b y F3c agregan filas. |
| `src/sitio/datos/cacheadas.ts` | Crear | Envoltorio mecánico: `unstable_cache(lectura, llave, { tags, revalidate: 3600 })` por fila de `llaves.ts`. Es lo único que importan las páginas y los layouts. |
| `src/sitio/redirigir.ts` | Crear | `noEncontrado(lang, segmentos)`: arma la ruta pública con `rutaPublicaDesdeArbol` y la busca en el mapa de redirecciones cacheado. Si hay destino, `permanentRedirect()`; si no, `notFound()`. |
| `src/sitio/seo/metadatos.ts` | Crear | `metadatos({ lang, titulo, descripcion, ruta, alternos, indexable })` → `Metadata` (canónica absoluta, `hreflang` indexables, robots). |
| `src/sitio/seo/jsonld.ts` | Crear | Constructores puros: `migasLd(migas)`, `listaLd(items)`. F3b agrega lugar, evento y artículo. |
| `src/sitio/ui/JsonLd.tsx` | Crear | `<script type="application/ld+json">` con el JSON escapado (`<` → `<`). |
| `src/sitio/ui/Cabecera.tsx` | Crear | Server: recibe `lang` y las zonas activas, y pinta la cabecera de la Guía (spec §7, «Navegación»). |
| `src/sitio/ui/CabeceraCliente.tsx` | Crear | `'use client'`: marca la zona actual en la fila de zonas (`usePathname().split('/')[3]`), borde y zonas que se esconden al bajar, búsqueda que se expande y hoja de búsqueda en celular. Sin sugerencias hasta F3c. Recibe ya pintados desde el servidor (slot) el selector de idioma y el puente a reservas. |
| `src/sitio/contexto.ts` | Crear | `contextoDe(lang, segmentos)` → `{ alterno, zona }`. `alterno` es la ruta del mismo documento en el otro idioma, o la portada de ese idioma si no existe. `zona` es la zona de la página, para el puente «Tours en {zona} →». Usa lecturas cacheadas. F3a resuelve portada, zona, zona × categoría, categoría y páginas fijas; F3b agrega lugar, evento y artículo en este mismo archivo. |
| `src/sitio/ui/Puente.tsx` | Crear | Server: el único link a reservas de la cabecera, «Tours en {zona} →» (sede de la zona) o «Tours en la Baja →», con `?desde=guia&pieza=cabecera` y los atributos de `tour_clic` (spec §7, §13). |
| `src/sitio/ui/SelectorIdioma.tsx` | Crear | Server: selector ES/EN con el link del otro idioma ya resuelto. |
| `src/app/(sitio)/[lang]/guia/@idioma/page.tsx` | Crear | Slot paralelo para la portada: `contextoDe(lang, [])`, `SelectorIdioma` y `Puente`. Se normaliza igual que `guia/page.tsx`, así que no choca. |
| `src/app/(sitio)/[lang]/guia/@idioma/[...resto]/page.tsx` | Crear | Slot paralelo para todo lo demás. Usa el mismo nombre de parámetro que el catch-all de `children`, así su ruta normalizada coincide con `/[lang]/guia/[...resto]` y el validador de rutas la acepta. Next lo asigna a toda ruta de `children` sin página propia en el slot y le pasa `resto` con los segmentos internos. Calcula `contextoDe(lang, resto)` en el servidor y pinta `SelectorIdioma` y `Puente`, así que el HTML cacheado ya trae los links correctos, sin JavaScript (spec §7, §9). **No usar un catch-all opcional `[[...]]` en el slot:** choca con `guia/page.tsx` en `validateAppPaths`. |
| `src/app/(sitio)/[lang]/guia/@idioma/default.tsx` | Crear | Respaldo del slot: link a la portada del otro idioma y puente general. |
| `src/sitio/ui/Pie.tsx` | Crear | Pie copiado del sitio de reservas (`pie-datos.ts`) más el link al aviso de privacidad de la Guía. |
| `src/sitio/ui/pie-datos.ts` | Crear | Textos y links del pie por idioma (datos fijos, spec §7). |
| `src/sitio/ui/Migas.tsx` | Crear | Migas visibles; la página pasa las mismas migas a `migasLd`. |
| `src/sitio/ui/NoEncontrado.tsx` | Crear | `'use client'`: contenido del 404 (diseño `c-404.html`). Toma el idioma de `usePathname().split('/')[1]`. |
| `src/sitio/estilos/base.css` | Crear | Port de `c-base.css`. |
| `src/sitio/estilos/no-encontrado.css` | Crear | Estilos de `c-404.html`. |
| `src/sitio/estilos/portada.css` | Crear | Estilos del `<style>` de `c-portada.html` (F3b los usa completos). |
| `src/sitio/ui/ErrorGuia.tsx` | Crear | `'use client'`: contenido de error por idioma (`usePathname().split('/')[1]`) con «Reintentar»; lo usan los dos `error.tsx`. |
| `src/sitio/fuentes/ConsolaMono-Bold.woff2` | Crear (copia) | Desde `docs/diseno/recursos/fuentes/`. |
| `public/guia-assets/logos/*.svg`, `public/guia-assets/pagos/*.svg` | Crear (copia) | Desde `docs/diseno/recursos/`. |
| `src/app/(sitio)/[lang]/layout.tsx` | Crear | Layout raíz: `<html lang>`, fuente, `base.css`, `generateStaticParams` (es, en), `metadataBase`. Si `lang` no es `es`/`en`, `notFound()`. |
| `src/app/(sitio)/[lang]/guia/layout.tsx` | Crear | Recibe `children` y el slot `idioma`. Pinta `Cabecera` (con `zonasActivas` cacheada y el slot), `children` y `Pie`. |
| `src/app/(sitio)/[lang]/error.tsx` | Crear | `'use client'`: atrapa los errores del layout de `guia` (por ejemplo, la base caída con la caché vacía). Idioma desde `usePathname().split('/')[1]`, estilos mínimos y sin datos. |
| `src/app/(sitio)/[lang]/guia/not-found.tsx` | Crear | `<NoEncontrado />` dentro del marco del layout de `guia`. |
| `src/app/(sitio)/[lang]/guia/error.tsx` | Crear | `'use client'`: error por idioma (`usePathname`) con «Reintentar». |
| `src/app/(sitio)/[lang]/guia/page.tsx` | Crear | Portada mínima de F3a: título, zonas activas y categorías (de `c-portada.html`, secciones «Zonas» y «Categorías»). F3b la completa. Existe desde F3a para que el build de este plan ya valide la forma del slot `@idioma` junto a la portada. |
| `src/app/(sitio)/[lang]/guia/[...resto]/page.tsx` | Crear | `dynamic = 'force-dynamic'`. Toda ruta de la guía sin página propia → `noEncontrado(lang, resto)`. Solo usa lecturas ya cacheadas. |
| `src/revalidacion/revalidar.ts` | Crear | `revalidar(etiquetas, req)`: `revalidateTag(t, { expire: 0 })` por etiqueta. Respeta `req.context.disableRevalidate` y nunca lanza. |
| `src/revalidacion/hooks.ts` | Crear | `hooksDeRevalidacion(coleccion)` → `{ afterChange, afterDelete }` con `etiquetasDeCambio`, y `revalidarAjustes` para el Global. |
| `src/collections/{Zonas,Categorias,Lugares,Eventos,Articulos,TextosZonaCategoria,FotosTours,Media}.ts` | Modificar | Registran los hooks de revalidación después de los existentes. |
| `src/globals/AjustesGuia.ts` | Modificar | `hooks.afterChange: [revalidarAjustes]`. |
| `src/redirecciones/plugin.ts` | Modificar | Hooks de `redirects`: `afterChange`/`afterDelete` revalidan `redirecciones`, y `beforeValidate` rechaza `to.type: 'reference'`. Solo se aceptan rutas `custom`, porque el destino de una referencia depende del idioma y del slug del momento, y el mapa cacheado no lo seguiría. No cambia el esquema. |
| `src/seed/datos.ts` | Sin cambios | Su contexto ya lleva `disableRevalidate: true` (F2). |
| `tests/unit/{origen,rutas-publicas,proxy,etiquetas,indexable,orden,paginacion,mapeo,llaves,revalidar,metadatos,jsonld,textos,contexto,redirigir}.test.ts` | Crear | Unitarias de lo puro y de lo delgado con dependencias simuladas (`next/cache`, `next/navigation`, `cacheadas`). |
| `tests/int/sitio-lecturas.int.test.ts` | Crear | Lecturas públicas contra Postgres: zona inactiva invisible, sin idioma de respaldo, mapa de redirecciones, ajustes sin `correosAviso`, redirección `reference` rechazada. |
| `tests/int/revalidacion.int.test.ts` | Crear | Guardar fuera del runtime de Next (con y sin `disableRevalidate`) no rompe el guardado. |

**Rutas internas que F3b llena** (las fija este plan, porque las genera el proxy):

| Pública | Interna |
|---|---|
| `…/{zona}/{categoria}?pagina=N` | `…/{zona}/{categoria}/--pagina/N` |
| `…/categoria/{categoria}?pagina=N` | `…/categoria/{categoria}/--pagina/N` |
| `…/eventos?pagina=N` | `…/eventos/--pagina/N` |
| Cualquiera de esas tres con `precio`, `abierto`, `caracteristica`, `zona` o `desde`/`hasta` | `…/--filtros?…` (página dinámica con `noindex` y canónica a la URL sin parámetros) |

La búsqueda (`buscar`) conserva su consulta tal cual: es dinámica y lleva `noindex`. Cualquier otro parámetro (por ejemplo `gclid`) se deja pasar sin tocar, porque ninguna página lee `searchParams`, salvo `filtros` y `buscar`.

**Regla de `usePathname`:** en el servidor devuelve la ruta interna (tras el rewrite: `/en/guia/lugares/x`, `…/--pagina/2`) y en el cliente la pública. Solo se leen de él `pathname.split('/')[1]` (idioma) y `pathname.split('/')[3]` (zona); el índice 0 es la cadena vacía antes de la primera `/`. Nunca se arma un `href` con él.

**Costo aceptado:** la cabecera de todas las páginas usa la etiqueta `zonas`. Guardar una zona invalida todo el sitio, y guardar un lugar, evento o artículo invalida todas las páginas que usan `listados`. Con el volumen de la Guía (cientos de documentos y pocas ediciones al día) esto no pesa.

<!-- arch-critic: APPROVED -->

---

### Task 1: Origen de la petición

**Files:**
- Create: `src/dominio/origen.ts`
- Test: `tests/unit/origen.test.ts`

**Interfaces:**
- Produces: `type Origen = { tipo: 'publico' | 'directo'; ip: string | null }`; `origenDePeticion(headers: Headers, secreto: string | undefined): Origen`; `origenReenviado(headers: Headers): Origen`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/origen.test.ts
import { describe, expect, it } from 'vitest'

import { origenDePeticion, origenReenviado } from '../../src/dominio/origen'

const h = (o: Record<string, string>) => new Headers(o)

describe('origenDePeticion (spec §4.1)', () => {
  it('es pública con el secreto correcto y toma la IP de x-guia-ip', () => {
    expect(origenDePeticion(h({ 'x-guia-proxy': 's3cr3t', 'x-guia-ip': '1.2.3.4', 'x-real-ip': '9.9.9.9' }), 's3cr3t')).toEqual({
      tipo: 'publico',
      ip: '1.2.3.4',
    })
  })

  it('es directa con un secreto inválido y toma x-real-ip', () => {
    expect(origenDePeticion(h({ 'x-guia-proxy': 'otro', 'x-guia-ip': '1.2.3.4', 'x-real-ip': '9.9.9.9' }), 's3cr3t')).toEqual({
      tipo: 'directo',
      ip: '9.9.9.9',
    })
  })

  it('es directa sin la cabecera', () => {
    expect(origenDePeticion(h({ 'x-real-ip': '9.9.9.9' }), 's3cr3t').tipo).toBe('directo')
  })

  it('nunca es pública si el secreto no está configurado', () => {
    expect(origenDePeticion(h({ 'x-guia-proxy': '' }), '').tipo).toBe('directo')
    expect(origenDePeticion(h({ 'x-guia-proxy': 'x' }), undefined).tipo).toBe('directo')
  })

  it('toma solo la primera IP de una lista y devuelve null si no hay', () => {
    expect(origenDePeticion(h({ 'x-real-ip': '5.5.5.5, 6.6.6.6' }), 's').ip).toBe('5.5.5.5')
    expect(origenDePeticion(h({}), 's').ip).toBeNull()
  })
})

describe('origenReenviado', () => {
  it('lee lo que dejó el proxy', () => {
    expect(origenReenviado(h({ 'x-guia-origen': 'publico', 'x-guia-ip': '1.2.3.4' }))).toEqual({ tipo: 'publico', ip: '1.2.3.4' })
  })

  it('cualquier otro valor es directo', () => {
    expect(origenReenviado(h({ 'x-guia-origen': 'raro' })).tipo).toBe('directo')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/origen.test.ts`
Expected: FAIL («Failed to resolve import "../../src/dominio/origen"»).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/dominio/origen.ts
import { timingSafeEqual } from 'node:crypto'

export type Origen = { tipo: 'publico' | 'directo'; ip: string | null }

function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

function primeraIp(valor: string | null): string | null {
  const ip = valor?.split(',')[0]?.trim()
  return ip ? ip : null
}

// Spec §4.1. Solo lo llama src/proxy.ts; lo demás lee lo que el proxy reenvía (origenReenviado).
export function origenDePeticion(headers: Headers, secreto: string | undefined): Origen {
  const recibido = headers.get('x-guia-proxy')
  if (secreto && recibido && iguales(recibido, secreto)) {
    return { tipo: 'publico', ip: primeraIp(headers.get('x-guia-ip')) }
  }
  return { tipo: 'directo', ip: primeraIp(headers.get('x-real-ip')) }
}

// Lo que el proxy deja en la petición. El proxy siempre sobrescribe estas cabeceras: el cliente no puede falsificarlas.
export function origenReenviado(headers: Headers): Origen {
  return {
    tipo: headers.get('x-guia-origen') === 'publico' ? 'publico' : 'directo',
    ip: primeraIp(headers.get('x-guia-ip')),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/origen.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/dominio/origen.ts tests/unit/origen.test.ts
git commit -m "feat: origen de la petición pública o directa

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Rutas públicas en los dos sentidos

**Files:**
- Create: `src/dominio/rutas-publicas.ts`
- Test: `tests/unit/rutas-publicas.test.ts`

**Interfaces:**
- Consumes: `SEGMENTOS` de `src/dominio/rutas.ts`; `LOCALES`, `Locale` de `src/dominio/idioma.ts`.
- Produces:
  - `type AccionRuta = { tipo: 'pasar' } | { tipo: 'reescribir'; destino: string } | { tipo: 'redirigir'; destino: string } | { tipo: 'noEncontrado'; lang: Locale }`
  - `resolverRutaPublica(pathname: string, params: URLSearchParams): AccionRuta`
  - `rutaPublicaDesdeArbol(lang: Locale, segmentos: string[]): string`
  - `FILTROS_LISTADO = ['precio', 'abierto', 'caracteristica', 'zona', 'desde', 'hasta']`
  - `SEGMENTO_PAGINA = '--pagina'`, `SEGMENTO_FILTROS = '--filtros'`, `SEGMENTO_NO_ENCONTRADO = '--'`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/rutas-publicas.test.ts
import { describe, expect, it } from 'vitest'

import { resolverRutaPublica, rutaPublicaDesdeArbol } from '../../src/dominio/rutas-publicas'

const r = (url: string) => {
  const u = new URL(url, 'https://x.test')
  return resolverRutaPublica(u.pathname, u.searchParams)
}

describe('resolverRutaPublica (spec §4, §7)', () => {
  it.each([
    ['/es/guia', { tipo: 'pasar' }],
    ['/es/guia/la-paz/playas', { tipo: 'pasar' }],
    ['/es/guia/lugares/balandra', { tipo: 'pasar' }],
    ['/guia-sitemap.xml', { tipo: 'pasar' }],
    ['/es/guia/lugares/balandra?gclid=1', { tipo: 'pasar' }],
  ])('deja pasar %s', (url, accion) => expect(r(url)).toEqual(accion))

  it.each([
    ['/en/guide', '/en/guia'],
    ['/en/guide/la-paz', '/en/guia/la-paz'],
    ['/en/guide/la-paz/beaches', '/en/guia/la-paz/beaches'],
    ['/en/guide/places/balandra', '/en/guia/lugares/balandra'],
    ['/en/guide/events', '/en/guia/eventos'],
    ['/en/guide/events/museum-night', '/en/guia/eventos/museum-night'],
    ['/en/guide/articles/fish', '/en/guia/articulos/fish'],
    ['/en/guide/category/beaches', '/en/guia/categoria/beaches'],
    ['/en/guide/get-listed', '/en/guia/aparece-en-la-guia'],
    ['/en/guide/privacy', '/en/guia/privacidad'],
    ['/en/guide/search?q=taco', '/en/guia/buscar?q=taco'],
    ['/en/guide/places/balandra/', '/en/guia/lugares/balandra'],
  ])('reescribe %s → %s', (url, destino) => expect(r(url)).toEqual({ tipo: 'reescribir', destino }))

  it.each([
    ['/en/guia', 'en'],
    ['/es/guide', 'es'],
    ['/es/guia/places/x', 'es'],
    ['/en/guide/lugares/x', 'en'],
    ['/es/guia/--', 'es'],
    ['/es/guia/la-paz/playas/--pagina/2', 'es'],
    ['/en/guide/events/--filtros', 'en'],
  ])('404 para %s', (url, lang) => expect(r(url)).toEqual({ tipo: 'noEncontrado', lang }))

  it('lleva ?pagina=N de un listado a su segmento interno', () => {
    expect(r('/es/guia/la-paz/playas?pagina=2')).toEqual({ tipo: 'reescribir', destino: '/es/guia/la-paz/playas/--pagina/2' })
    expect(r('/en/guide/category/beaches?pagina=3')).toEqual({ tipo: 'reescribir', destino: '/en/guia/categoria/beaches/--pagina/3' })
    expect(r('/es/guia/eventos?pagina=2')).toEqual({ tipo: 'reescribir', destino: '/es/guia/eventos/--pagina/2' })
  })

  it('redirige ?pagina=1 a la URL sin ese parámetro (308) y conserva los demás', () => {
    expect(r('/en/guide/la-paz/beaches?pagina=1')).toEqual({ tipo: 'redirigir', destino: '/en/guide/la-paz/beaches' })
    expect(r('/es/guia/eventos?pagina=1&gclid=x')).toEqual({ tipo: 'redirigir', destino: '/es/guia/eventos?gclid=x' })
  })

  it('una página inválida es 404', () => {
    expect(r('/es/guia/eventos?pagina=0')).toEqual({ tipo: 'noEncontrado', lang: 'es' })
    expect(r('/es/guia/eventos?pagina=abc')).toEqual({ tipo: 'noEncontrado', lang: 'es' })
    expect(r('/es/guia/eventos?pagina=02')).toEqual({ tipo: 'noEncontrado', lang: 'es' })
  })

  it('un listado con filtros va a su ruta interna dinámica, con la consulta completa', () => {
    expect(r('/es/guia/la-paz/playas?caracteristica=para-ninos&pagina=2')).toEqual({
      tipo: 'reescribir',
      destino: '/es/guia/la-paz/playas/--filtros?caracteristica=para-ninos&pagina=2',
    })
    expect(r('/en/guide/events?zona=la-paz')).toEqual({ tipo: 'reescribir', destino: '/en/guia/eventos/--filtros?zona=la-paz' })
  })

  it('?pagina y filtros fuera de un listado no cambian nada', () => {
    expect(r('/es/guia/lugares/balandra?pagina=2')).toEqual({ tipo: 'pasar' })
    expect(r('/es/guia/la-paz?zona=x')).toEqual({ tipo: 'pasar' })
  })

  it('no toca rutas que no son de la guía', () => {
    expect(r('/es')).toEqual({ tipo: 'pasar' })
    expect(r('/es/otra-cosa')).toEqual({ tipo: 'pasar' })
  })
})

describe('rutaPublicaDesdeArbol', () => {
  it.each([
    ['es', [], '/es/guia'],
    ['en', [], '/en/guide'],
    ['en', ['lugares', 'balandra'], '/en/guide/places/balandra'],
    ['en', ['la-paz', 'beaches'], '/en/guide/la-paz/beaches'],
    ['es', ['aparece-en-la-guia'], '/es/guia/aparece-en-la-guia'],
    ['en', ['eventos'], '/en/guide/events'],
  ] as const)('%s %j → %s', (lang, segs, ruta) => expect(rutaPublicaDesdeArbol(lang, [...segs])).toBe(ruta))

  it('ida y vuelta: lo que reescribe el proxy vuelve a la ruta pública', () => {
    for (const url of ['/en/guide/places/x', '/en/guide/category/y', '/en/guide/la-paz/beaches', '/en/guide/get-listed']) {
      const accion = r(url)
      if (accion.tipo !== 'reescribir') throw new Error(url)
      const [, lang, , ...segs] = accion.destino.split('/')
      expect(rutaPublicaDesdeArbol(lang as 'en', segs)).toBe(url)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/rutas-publicas.test.ts`
Expected: FAIL (no existe el módulo).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/dominio/rutas-publicas.ts
import { LOCALES, type Locale } from './idioma'
import { SEGMENTOS } from './rutas'

export type AccionRuta =
  | { tipo: 'pasar' }
  | { tipo: 'reescribir'; destino: string }
  | { tipo: 'redirigir'; destino: string }
  | { tipo: 'noEncontrado'; lang: Locale }

// Segmentos internos: empiezan con «--», que ningún slug puede tener (dominio/slugs.ts, FORMATO).
export const SEGMENTO_NO_ENCONTRADO = '--'
export const SEGMENTO_PAGINA = '--pagina'
export const SEGMENTO_FILTROS = '--filtros'
export const FILTROS_LISTADO = ['precio', 'abierto', 'caracteristica', 'zona', 'desde', 'hasta'] as const

type Clave = Exclude<keyof (typeof SEGMENTOS)['es'], 'guia'>
const CLAVES = (Object.keys(SEGMENTOS.es) as (keyof (typeof SEGMENTOS)['es'])[]).filter((k): k is Clave => k !== 'guia')
const claveDe = (lang: Locale, seg: string): Clave | undefined => CLAVES.find((k) => SEGMENTOS[lang][k] === seg)
const otro = (lang: Locale): Locale => (lang === 'es' ? 'en' : 'es')
const esLocale = (v: string | undefined): v is Locale => (LOCALES as readonly string[]).includes(v ?? '')

// Spec §7: zona × categoría, categoría en todas las zonas y eventos (árbol en español).
function esListado(arbol: string[]): boolean {
  const [a] = arbol
  if (arbol.length === 1) return a === SEGMENTOS.es.eventos
  if (arbol.length !== 2) return false
  if (a === SEGMENTOS.es.categoria) return true
  return claveDe('es', a) === undefined
}

export function resolverRutaPublica(pathname: string, params: URLSearchParams): AccionRuta {
  const [lang, guia, ...resto] = pathname.split('/').filter(Boolean)
  if (!esLocale(lang)) return { tipo: 'pasar' }
  if (guia === SEGMENTOS[otro(lang)].guia) return { tipo: 'noEncontrado', lang }
  if (guia !== SEGMENTOS[lang].guia) return { tipo: 'pasar' }
  if (resto.some((s) => s.startsWith('--'))) return { tipo: 'noEncontrado', lang }

  const [primero, ...demas] = resto
  let arbol = resto
  if (primero !== undefined) {
    if (claveDe(otro(lang), primero) && !claveDe(lang, primero)) return { tipo: 'noEncontrado', lang }
    const clave = claveDe(lang, primero)
    if (clave) arbol = [SEGMENTOS.es[clave], ...demas]
  }
  const base = `/${lang}/guia${arbol.length ? `/${arbol.join('/')}` : ''}`
  const consulta = params.toString()

  if (esListado(arbol)) {
    if (FILTROS_LISTADO.some((f) => params.has(f))) {
      return { tipo: 'reescribir', destino: `${base}/${SEGMENTO_FILTROS}?${consulta}` }
    }
    const pagina = params.get('pagina')
    if (pagina !== null) {
      if (pagina === '1') {
        const otros = new URLSearchParams(params)
        otros.delete('pagina')
        const q = otros.toString()
        return { tipo: 'redirigir', destino: `/${lang}/${SEGMENTOS[lang].guia}${resto.length ? `/${resto.join('/')}` : ''}${q ? `?${q}` : ''}` }
      }
      if (!/^[1-9]\d*$/.test(pagina)) return { tipo: 'noEncontrado', lang }
      return { tipo: 'reescribir', destino: `${base}/${SEGMENTO_PAGINA}/${pagina}` }
    }
  }

  // En español sin cambios no hay nada que hacer; la diagonal final se quita para que el árbol reciba una sola forma.
  if (lang === 'es' && !pathname.endsWith('/')) return { tipo: 'pasar' }
  return { tipo: 'reescribir', destino: consulta ? `${base}?${consulta}` : base }
}

// Inversa: segmentos del árbol en español (después de «guia») → ruta pública del idioma.
export function rutaPublicaDesdeArbol(lang: Locale, segmentos: string[]): string {
  const [primero, ...demas] = segmentos
  const clave = primero === undefined ? undefined : claveDe('es', primero)
  const publicos = primero === undefined ? [] : [clave ? SEGMENTOS[lang][clave] : primero, ...demas]
  return `/${lang}/${SEGMENTOS[lang].guia}${publicos.length ? `/${publicos.join('/')}` : ''}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/rutas-publicas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dominio/rutas-publicas.ts tests/unit/rutas-publicas.test.ts
git commit -m "feat: traducción de rutas públicas al árbol en español y de vuelta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `proxy.ts` y cabeceras de `next.config`

**Files:**
- Create: `src/proxy.ts`
- Modify: `next.config.ts`
- Test: `tests/unit/proxy.test.ts`

**Interfaces:**
- Consumes: `origenDePeticion` (Task 1), `resolverRutaPublica`, `SEGMENTO_NO_ENCONTRADO` (Task 2).
- Produces:
  - `proxy(request: NextRequest): NextResponse` y `config.matcher`.
  - Cabeceras de la petición reenviada: `x-guia-origen` y `x-guia-ip`, sin `x-guia-proxy`.
  - Cabeceras de la respuesta: `x-guia-origen` y, si la petición es directa, `X-Robots-Tag: noindex`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/proxy.test.ts
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { proxy } from '../../src/proxy'

const pedir = (ruta: string, headers: Record<string, string> = {}) => proxy(new NextRequest(`https://guia.test${ruta}`, { headers }))
const reenviada = (res: Response, nombre: string) => res.headers.get(`x-middleware-request-${nombre}`)

describe('proxy de la Guía (spec §4.1)', () => {
  beforeEach(() => {
    process.env.GUIA_PROXY_SECRET = 's3cr3t'
  })
  afterEach(() => {
    delete process.env.GUIA_PROXY_SECRET
  })

  it('con el secreto: pública, sin X-Robots-Tag, y reenvía la IP del visitante', () => {
    const res = pedir('/es/guia', { 'x-guia-proxy': 's3cr3t', 'x-guia-ip': '1.2.3.4' })
    expect(res.headers.get('x-guia-origen')).toBe('publico')
    expect(res.headers.get('X-Robots-Tag')).toBeNull()
    expect(reenviada(res, 'x-guia-origen')).toBe('publico')
    expect(reenviada(res, 'x-guia-ip')).toBe('1.2.3.4')
  })

  it('sin el secreto: directa con noindex, y sobrescribe la x-guia-ip que mandó el cliente', () => {
    const res = pedir('/es/guia', { 'x-guia-ip': '6.6.6.6', 'x-real-ip': '9.9.9.9' })
    expect(res.headers.get('x-guia-origen')).toBe('directo')
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
    expect(reenviada(res, 'x-guia-ip')).toBe('9.9.9.9')
    expect(reenviada(res, 'x-guia-origen')).toBe('directo')
  })

  it('nunca reenvía ni devuelve el secreto', () => {
    const res = pedir('/es/guia', { 'x-guia-proxy': 's3cr3t' })
    expect(reenviada(res, 'x-guia-proxy')).toBeNull()
    expect(res.headers.get('x-middleware-override-headers') ?? '').not.toContain('x-guia-proxy')
    expect(res.headers.get('x-guia-proxy')).toBeNull()
  })

  it('reescribe el inglés al árbol en español', () => {
    const res = pedir('/en/guide/places/balandra')
    expect(res.headers.get('x-middleware-rewrite')).toBe('https://guia.test/en/guia/lugares/balandra')
  })

  it('una combinación cruzada se reescribe a la ruta de 404 del idioma de la URL', () => {
    expect(pedir('/en/guia/lugares/x').headers.get('x-middleware-rewrite')).toBe('https://guia.test/en/guia/--')
  })

  it('?pagina=1 redirige 308 a la URL sin el parámetro', () => {
    const res = pedir('/es/guia/eventos?pagina=1')
    expect(res.status).toBe(308)
    expect(new URL(res.headers.get('location') ?? '', 'https://guia.test').pathname).toBe('/es/guia/eventos')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/proxy.test.ts`
Expected: FAIL (no existe `src/proxy`).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server'

import { origenDePeticion } from './dominio/origen'
import { resolverRutaPublica, SEGMENTO_NO_ENCONTRADO } from './dominio/rutas-publicas'

// Spec §4 y §4.1. Corre en cada petición de la guía, antes de la caché: el origen solo toca cabeceras.
export function proxy(request: NextRequest): NextResponse {
  const origen = origenDePeticion(request.headers, process.env.GUIA_PROXY_SECRET)

  // Lo que sigue (páginas, Server Action) recibe el origen ya decidido; lo que mande el cliente se pisa.
  const headers = new Headers(request.headers)
  headers.delete('x-guia-proxy')
  headers.set('x-guia-origen', origen.tipo)
  if (origen.ip) headers.set('x-guia-ip', origen.ip)
  else headers.delete('x-guia-ip')

  const accion = resolverRutaPublica(request.nextUrl.pathname, request.nextUrl.searchParams)
  let res: NextResponse
  switch (accion.tipo) {
    case 'redirigir':
      // URL absoluta: el adaptador de Node de Next la vuelve relativa si es del mismo host (getRelativeURL), que
      // es lo que hace falta detrás del rewrite del sitio de reservas. Una Location relativa aquí da 500.
      res = NextResponse.redirect(new URL(accion.destino, request.url), 308)
      break
    case 'reescribir':
      res = NextResponse.rewrite(new URL(accion.destino, request.url), { request: { headers } })
      break
    case 'noEncontrado':
      res = NextResponse.rewrite(new URL(`/${accion.lang}/guia/${SEGMENTO_NO_ENCONTRADO}`, request.url), {
        request: { headers },
      })
      break
    default:
      res = NextResponse.next({ request: { headers } })
  }
  res.headers.set('x-guia-origen', origen.tipo)
  if (origen.tipo === 'directo') res.headers.set('X-Robots-Tag', 'noindex')
  return res
}

export const config = { matcher: ['/es/:path*', '/en/:path*', '/guia-sitemap.xml'] }
```

En `next.config.ts`, reemplaza el bloque `headers()` (y su comentario «Temporal hasta F3») por este, y agrega `experimental`:

```ts
  // La guía decide su X-Robots-Tag en src/proxy.ts (spec §4.1); el admin y la API nunca se indexan.
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex' }]
    return [
      { source: '/admin/:path*', headers: noindex },
      { source: '/api/:path*', headers: noindex },
    ]
  },
  // El formulario llega por salysoltours.com (rewrite): su Server Action debe aceptar ese origen (spec §4).
  experimental: { serverActions: { allowedOrigins: ['salysoltours.com', 'www.salysoltours.com'] } },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/unit/proxy.test.ts` y luego `npm run typecheck`
Expected: PASS (6 tests); typecheck sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts next.config.ts tests/unit/proxy.test.ts
git commit -m "feat: proxy de la guía con origen reenviado, rutas en inglés y 404 cruzado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Reglas puras de listados, etiquetas e indexabilidad

**Files:**
- Modify: `src/dominio/idioma.ts`, `src/collections/Lugares.ts`, `src/collections/Eventos.ts`, `src/collections/Articulos.ts`
- Create: `src/dominio/etiquetas.ts`, `src/dominio/indexable.ts`, `src/dominio/orden.ts`, `src/dominio/paginacion.ts`
- Test: `tests/unit/etiquetas.test.ts`, `tests/unit/indexable.test.ts`, `tests/unit/orden.test.ts`, `tests/unit/paginacion.test.ts`, `tests/unit/idioma.test.ts` (agregar casos)

**Interfaces:**
- Produces:
  - `CAMPOS_IDIOMA` y `CAMPOS_LOCALIZADOS` con las llaves `lugares`, `eventos` y `articulos` (mismos valores que hoy tienen las colecciones); `esLocale(v: unknown): v is Locale`; `otroIdioma(l: Locale): Locale`.
  - `etiqueta` (constructores), `type ColeccionRevalidable` y `etiquetasDeCambio(coleccion, doc, anterior): string[]`, que devuelve la lista ordenada y sin repetir.
  - `type VersionIdioma = { lang: Locale; ruta: string; indexable: boolean }`.
  - `esIndexable(r: { guiaIndexable: boolean; noIndexar?: boolean | null; conteo?: number; conFiltros?: boolean }): boolean`.
  - `hreflang(propia: VersionIdioma, versiones: VersionIdioma[]): Record<string, string>`, con llaves `es-MX`, `en-US` y `x-default`. Devuelve un objeto vacío si hay menos de 2 versiones indexables o si la propia no lo es.
  - `type Ordenable = { nombre: string; orden?: number | null; inicio?: string | null; patrocinio?: Patrocinio | null }`, `ordenarListado<T extends Ordenable>(items: T[], ahora?: Date, opciones?: { porInicio?: boolean }): T[]` y `MAX_PATROCINIOS_ARRIBA = 2`.
  - `POR_PAGINA = 24`, `paginar<T>(items: T[], pagina: number, porPagina?: number): { items: T[]; pagina: number; totalPaginas: number } | null` y `numeroDePagina(seg: string): number | null`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/etiquetas.test.ts
import { describe, expect, it } from 'vitest'

import { etiqueta, etiquetasDeCambio } from '../../src/dominio/etiquetas'

describe('etiquetasDeCambio (spec §10)', () => {
  it('lugar: su id, listados, zona y categorías de antes y de después', () => {
    expect(etiquetasDeCambio('lugares', { id: 1, zona: 2, categorias: [3, { id: 4 }] }, { id: 1, zona: 5, categorias: [3] })).toEqual(
      ['categoria:3', 'categoria:4', 'listados', 'lugar:1', 'zona:2', 'zona:5'],
    )
  })

  it('evento: también el lugar donde ocurre', () => {
    expect(etiquetasDeCambio('eventos', { id: 7, zona: 2, categorias: [3], lugar: 9 }, null)).toEqual([
      'categoria:3', 'evento:7', 'listados', 'lugar:9', 'zona:2',
    ])
  })

  it('artículo: sus zonas, categorías y los lugares citados antes y después', () => {
    expect(
      etiquetasDeCambio('articulos', { id: 8, zonas: [2], categorias: [], lugaresCitados: [10] }, { id: 8, zonas: [2], lugaresCitados: [11] }),
    ).toEqual(['articulo:8', 'listados', 'lugar:10', 'lugar:11', 'zona:2'])
  })

  it('zona y categoría emiten su etiqueta de colección', () => {
    expect(etiquetasDeCambio('zonas', { id: 2 }, null)).toEqual(['listados', 'zona:2', 'zonas'])
    expect(etiquetasDeCambio('categorias', { id: 3 }, null)).toEqual(['categoria:3', 'categorias', 'listados'])
  })

  it('textos, fotos de tours, media y redirecciones', () => {
    expect(etiquetasDeCambio('textos-zona-categoria', { id: 1, zona: 2, categoria: { id: 3 } }, { id: 1, zona: 2, categoria: 4 })).toEqual([
      'textos:2:3', 'textos:2:4',
    ])
    expect(etiquetasDeCambio('fotos-tours', { id: 1 }, null)).toEqual(['tours-fotos'])
    expect(etiquetasDeCambio('media', { id: 1 }, null)).toEqual(['media'])
    expect(etiquetasDeCambio('redirects', { id: 1 }, null)).toEqual(['redirecciones'])
  })

  it('constructores', () => {
    expect(etiqueta.catalogo('la-paz')).toBe('catalogo:la-paz')
    expect(etiqueta.textos(1, 2)).toBe('textos:1:2')
  })
})
```

```ts
// tests/unit/indexable.test.ts
import { describe, expect, it } from 'vitest'

import { esIndexable, hreflang } from '../../src/dominio/indexable'

describe('esIndexable (spec §9)', () => {
  it('cualquier regla basta para noindex', () => {
    expect(esIndexable({ guiaIndexable: true })).toBe(true)
    expect(esIndexable({ guiaIndexable: false })).toBe(false)
    expect(esIndexable({ guiaIndexable: true, noIndexar: true })).toBe(false)
    expect(esIndexable({ guiaIndexable: true, conFiltros: true })).toBe(false)
    expect(esIndexable({ guiaIndexable: true, conteo: 2 })).toBe(false)
    expect(esIndexable({ guiaIndexable: true, conteo: 3 })).toBe(true)
  })
})

describe('hreflang solo entre versiones indexables', () => {
  const es = { lang: 'es' as const, ruta: '/es/guia/la-paz', indexable: true }
  const en = { lang: 'en' as const, ruta: '/en/guide/la-paz', indexable: true }

  it('dos versiones indexables: las dos y x-default al español', () => {
    expect(hreflang(es, [es, en])).toEqual({ 'es-MX': '/es/guia/la-paz', 'en-US': '/en/guide/la-paz', 'x-default': '/es/guia/la-paz' })
  })

  it('si la otra no es indexable o no existe, ninguno', () => {
    expect(hreflang(es, [es, { ...en, indexable: false }])).toEqual({})
    expect(hreflang(es, [es])).toEqual({})
  })

  it('si la propia no es indexable, ninguno', () => {
    expect(hreflang({ ...es, indexable: false }, [{ ...es, indexable: false }, en])).toEqual({})
  })
})
```

```ts
// tests/unit/orden.test.ts
import { describe, expect, it } from 'vitest'

import { ordenarListado } from '../../src/dominio/orden'

const ahora = new Date('2026-11-10T12:00:00-07:00')
const vig = (desde: string) => ({ activo: true, desde, hasta: '2026-12-31' })

describe('ordenarListado (spec §7)', () => {
  it('hasta 2 patrocinios vigentes arriba, por desde más antiguo y luego nombre', () => {
    const items = [
      { nombre: 'A', orden: 1 },
      { nombre: 'P3', orden: 50, patrocinio: vig('2026-11-05') },
      { nombre: 'P1', orden: 90, patrocinio: vig('2026-11-01') },
      { nombre: 'P2b', orden: 90, patrocinio: vig('2026-11-03') },
      { nombre: 'P2a', orden: 90, patrocinio: vig('2026-11-03') },
    ]
    expect(ordenarListado(items, ahora).map((i) => i.nombre)).toEqual(['P1', 'P2a', 'A', 'P3', 'P2b'])
  })

  it('un patrocinio declarado pero no vigente no sube', () => {
    const items = [{ nombre: 'B', orden: 1 }, { nombre: 'F', orden: 9, patrocinio: vig('2026-12-01') }]
    expect(ordenarListado(items, ahora).map((i) => i.nombre)).toEqual(['B', 'F'])
  })

  it('el resto por orden y luego nombre; sin orden cuenta como 100', () => {
    const items = [{ nombre: 'C' }, { nombre: 'B', orden: 100 }, { nombre: 'Z', orden: 5 }]
    expect(ordenarListado(items, ahora).map((i) => i.nombre)).toEqual(['Z', 'B', 'C'])
  })

  it('en eventos el resto va por inicio', () => {
    const items = [
      { nombre: 'Tarde', inicio: '2026-11-20T18:00:00Z' },
      { nombre: 'Pronto', inicio: '2026-11-12T18:00:00Z' },
    ]
    expect(ordenarListado(items, ahora, { porInicio: true }).map((i) => i.nombre)).toEqual(['Pronto', 'Tarde'])
  })
})
```

```ts
// tests/unit/paginacion.test.ts
import { describe, expect, it } from 'vitest'

import { numeroDePagina, paginar } from '../../src/dominio/paginacion'

describe('paginación (spec §7)', () => {
  const lista = Array.from({ length: 30 }, (_, i) => i)

  it('rebana y cuenta páginas', () => {
    expect(paginar(lista, 1, 24)).toEqual({ items: lista.slice(0, 24), pagina: 1, totalPaginas: 2 })
    expect(paginar(lista, 2, 24)?.items).toEqual(lista.slice(24))
  })

  it('fuera de rango es null (la página da 404)', () => {
    expect(paginar(lista, 3, 24)).toBeNull()
    expect(paginar(lista, 0, 24)).toBeNull()
  })

  it('una lista vacía tiene una sola página', () => {
    expect(paginar([], 1)).toEqual({ items: [], pagina: 1, totalPaginas: 1 })
  })

  it('numeroDePagina solo acepta enteros positivos sin ceros a la izquierda', () => {
    expect(numeroDePagina('2')).toBe(2)
    expect(numeroDePagina('02')).toBeNull()
    expect(numeroDePagina('x')).toBeNull()
  })
})
```

Agrega a `tests/unit/idioma.test.ts` (junta el import con los que ya existen de ese módulo):

```ts
import { CAMPOS_IDIOMA, esLocale, otroIdioma } from '../../src/dominio/idioma'

describe('constantes de idioma', () => {
  it('campos de la regla de idioma por colección', () => {
    expect(CAMPOS_IDIOMA.lugares).toEqual(['slug', 'resumen', 'cuerpo'])
    expect(CAMPOS_IDIOMA.eventos).toEqual(['nombre', 'slug', 'resumen', 'cuerpo'])
    expect(CAMPOS_IDIOMA.articulos).toEqual(['titulo', 'slug', 'resumen', 'cuerpo'])
  })

  it('esLocale y otroIdioma', () => {
    expect(esLocale('es')).toBe(true)
    expect(esLocale('fr')).toBe(false)
    expect(otroIdioma('es')).toBe('en')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/etiquetas.test.ts tests/unit/indexable.test.ts tests/unit/orden.test.ts tests/unit/paginacion.test.ts tests/unit/idioma.test.ts`
Expected: FAIL (módulos y exportaciones inexistentes).

- [ ] **Step 3: Write minimal implementation**

Agrega al final de `src/dominio/idioma.ts`:

```ts
export const esLocale = (v: unknown): v is Locale => v === 'es' || v === 'en'
export const otroIdioma = (l: Locale): Locale => (l === 'es' ? 'en' : 'es')

// Regla de idioma (spec §6): campos que deben tener valor en un idioma para que el documento exista en él.
export const CAMPOS_IDIOMA = {
  lugares: ['slug', 'resumen', 'cuerpo'],
  eventos: ['nombre', 'slug', 'resumen', 'cuerpo'],
  articulos: ['titulo', 'slug', 'resumen', 'cuerpo'],
} as const

export const CAMPOS_LOCALIZADOS = {
  lugares: ['slug', 'resumen', 'cuerpo', 'notaHorario'],
  eventos: ['nombre', 'slug', 'resumen', 'cuerpo', 'precio'],
  articulos: ['titulo', 'slug', 'resumen', 'cuerpo'],
} as const
```

En las colecciones, las constantes pasan a reexportar las del dominio, con los mismos nombres y valores:

```ts
// src/collections/Lugares.ts (reemplaza las dos constantes)
import { CAMPOS_IDIOMA, CAMPOS_LOCALIZADOS } from '../dominio/idioma'
export const CAMPOS_IDIOMA_LUGAR = CAMPOS_IDIOMA.lugares
export const CAMPOS_LOCALIZADOS_LUGAR = CAMPOS_LOCALIZADOS.lugares
```

```ts
// src/collections/Eventos.ts
import { CAMPOS_IDIOMA, CAMPOS_LOCALIZADOS } from '../dominio/idioma'
export const CAMPOS_IDIOMA_EVENTO = CAMPOS_IDIOMA.eventos
export const CAMPOS_LOCALIZADOS_EVENTO = CAMPOS_LOCALIZADOS.eventos
```

```ts
// src/collections/Articulos.ts
import { CAMPOS_IDIOMA, CAMPOS_LOCALIZADOS } from '../dominio/idioma'
export const CAMPOS_IDIOMA_ARTICULO = CAMPOS_IDIOMA.articulos
export const CAMPOS_LOCALIZADOS_ARTICULO = CAMPOS_LOCALIZADOS.articulos
```

```ts
// src/dominio/etiquetas.ts
type Id = number | string

// Etiquetas de caché (spec §10). zonas, categorias y media son de colección: las llevan las lecturas
// por slug y las listas, cuyo resultado puede cambiar sin que cambie su llave (plan F3a).
export const etiqueta = {
  lugar: (id: Id) => `lugar:${id}`,
  evento: (id: Id) => `evento:${id}`,
  articulo: (id: Id) => `articulo:${id}`,
  zona: (id: Id) => `zona:${id}`,
  categoria: (id: Id) => `categoria:${id}`,
  textos: (zona: Id, categoria: Id) => `textos:${zona}:${categoria}`,
  catalogo: (sedeSlug: string) => `catalogo:${sedeSlug}`,
  listados: 'listados',
  zonas: 'zonas',
  categorias: 'categorias',
  media: 'media',
  redirecciones: 'redirecciones',
  ajustes: 'ajustes',
  toursFotos: 'tours-fotos',
} as const

export type ColeccionRevalidable =
  | 'lugares' | 'eventos' | 'articulos' | 'zonas' | 'categorias'
  | 'textos-zona-categoria' | 'fotos-tours' | 'media' | 'redirects'

type Doc = Record<string, unknown> | null | undefined

const idDe = (v: unknown): Id | undefined => {
  const x = v && typeof v === 'object' ? (v as { id?: unknown }).id : v
  return typeof x === 'number' || typeof x === 'string' ? x : undefined
}
const ids = (v: unknown): Id[] => (Array.isArray(v) ? v : [v]).map(idDe).filter((x): x is Id => x !== undefined)

export function etiquetasDeCambio(coleccion: ColeccionRevalidable, doc: Doc, anterior: Doc): string[] {
  const docs = [doc, anterior].filter((d): d is Record<string, unknown> => Boolean(d))
  const de = (campo: string) => docs.flatMap((d) => ids(d[campo]))
  const t = new Set<string>()
  const agregar = (campo: string, f: (id: Id) => string) => de(campo).forEach((id) => t.add(f(id)))

  switch (coleccion) {
    case 'lugares':
      agregar('id', etiqueta.lugar)
      t.add(etiqueta.listados)
      agregar('zona', etiqueta.zona)
      agregar('categorias', etiqueta.categoria)
      break
    case 'eventos':
      agregar('id', etiqueta.evento)
      t.add(etiqueta.listados)
      agregar('zona', etiqueta.zona)
      agregar('categorias', etiqueta.categoria)
      agregar('lugar', etiqueta.lugar)
      break
    case 'articulos':
      agregar('id', etiqueta.articulo)
      t.add(etiqueta.listados)
      agregar('zonas', etiqueta.zona)
      agregar('categorias', etiqueta.categoria)
      agregar('lugaresCitados', etiqueta.lugar)
      break
    case 'zonas':
      agregar('id', etiqueta.zona)
      t.add(etiqueta.zonas)
      t.add(etiqueta.listados)
      break
    case 'categorias':
      agregar('id', etiqueta.categoria)
      t.add(etiqueta.categorias)
      t.add(etiqueta.listados)
      break
    case 'textos-zona-categoria':
      for (const d of docs) {
        const z = idDe(d.zona)
        const c = idDe(d.categoria)
        if (z !== undefined && c !== undefined) t.add(etiqueta.textos(z, c))
      }
      break
    case 'fotos-tours':
      t.add(etiqueta.toursFotos)
      break
    case 'media':
      t.add(etiqueta.media)
      break
    case 'redirects':
      t.add(etiqueta.redirecciones)
      break
  }
  return [...t].sort()
}
```

```ts
// src/dominio/indexable.ts
import type { Locale } from './idioma'
import { combinacionIndexable } from './umbrales'

type Reglas = { guiaIndexable: boolean; noIndexar?: boolean | null; conteo?: number; conFiltros?: boolean }

// Spec §9: cualquiera de estas reglas basta para noindex. Ninguna depende de la petición.
export function esIndexable(r: Reglas): boolean {
  if (!r.guiaIndexable || r.noIndexar || r.conFiltros) return false
  if (r.conteo !== undefined && !combinacionIndexable(r.conteo)) return false
  return true
}

export type VersionIdioma = { lang: Locale; ruta: string; indexable: boolean }

const CODIGO: Record<Locale, string> = { es: 'es-MX', en: 'en-US' }

// hreflang solo entre versiones indexables: si la propia o la otra no lo es, ninguno.
export function hreflang(propia: VersionIdioma, versiones: VersionIdioma[]): Record<string, string> {
  if (!propia.indexable) return {}
  const ok = versiones.filter((v) => v.indexable)
  if (ok.length < 2) return {}
  const mapa: Record<string, string> = {}
  for (const v of ok) mapa[CODIGO[v.lang]] = v.ruta
  const es = ok.find((v) => v.lang === 'es')
  if (es) mapa['x-default'] = es.ruta
  return mapa
}
```

```ts
// src/dominio/orden.ts
import { patrocinioVigente, type Patrocinio } from './patrocinio'

export const MAX_PATROCINIOS_ARRIBA = 2

export type Ordenable = {
  nombre: string
  orden?: number | null
  inicio?: string | null
  patrocinio?: Patrocinio | null
}

const porNombre = (a: Ordenable, b: Ordenable) => a.nombre.localeCompare(b.nombre, 'es')
const tiempo = (v: string | Date | null | undefined) => (v ? new Date(v).getTime() : 0)

// Spec §7, «Orden de los listados».
export function ordenarListado<T extends Ordenable>(items: T[], ahora: Date = new Date(), opciones: { porInicio?: boolean } = {}): T[] {
  const arriba = items
    .filter((i) => patrocinioVigente(i.patrocinio, ahora))
    .sort((a, b) => tiempo(a.patrocinio?.desde) - tiempo(b.patrocinio?.desde) || porNombre(a, b))
    .slice(0, MAX_PATROCINIOS_ARRIBA)
  const resto = items
    .filter((i) => !arriba.includes(i))
    .sort(
      opciones.porInicio
        ? (a, b) => tiempo(a.inicio) - tiempo(b.inicio) || porNombre(a, b)
        : (a, b) => (a.orden ?? 100) - (b.orden ?? 100) || porNombre(a, b),
    )
  return [...arriba, ...resto]
}
```

```ts
// src/dominio/paginacion.ts
export const POR_PAGINA = 24

// Spec §7: paginación con URL real; fuera de rango es 404 (null).
export function paginar<T>(items: T[], pagina: number, porPagina: number = POR_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina))
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > totalPaginas) return null
  return { items: items.slice((pagina - 1) * porPagina, pagina * porPagina), pagina, totalPaginas }
}

export const numeroDePagina = (seg: string): number | null => (/^[1-9]\d*$/.test(seg) ? Number(seg) : null)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit` y `npm run typecheck`
Expected: PASS en toda la suite unitaria, incluidas `diferencias`, `slugs` y `rutas`; typecheck sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/dominio tests/unit src/collections/Lugares.ts src/collections/Eventos.ts src/collections/Articulos.ts
git commit -m "feat: etiquetas de caché, indexabilidad, orden de listados y paginación

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Capa de datos (lecturas, llaves y caché)

**Files:**
- Create: `src/sitio/datos/payload.ts`, `src/sitio/datos/tipos.ts`, `src/sitio/datos/mapeo.ts`, `src/sitio/datos/llaves.ts`, `src/sitio/datos/cacheadas.ts`, `src/sitio/datos/lecturas/publico.ts`, `src/sitio/datos/lecturas/zonas.ts`, `src/sitio/datos/lecturas/categorias.ts`, `src/sitio/datos/lecturas/ajustes.ts`, `src/sitio/datos/lecturas/redirecciones.ts`
- Modify: `src/redirecciones/plugin.ts`, `docs/specs/2026-10-30-guia-baja-design.md` (§6, «Redirecciones»)
- Test: `tests/unit/mapeo.test.ts`, `tests/unit/llaves.test.ts`, `tests/int/sitio-lecturas.int.test.ts`

**Interfaces:**
- Consumes: `etiqueta` (Task 4); `Locale`, `esLocale` (Task 4); tipos generados `Media`, `Zona`, `Categoria`, `AjustesGuia` de `src/payload-types.ts`.
- Produces:
  - Tipos: `Imagen = { src: string; srcset: string; ancho: number | null; alto: number | null; alt: string; credito: string | null; og: string | null }`; `ZonaPublica = { id: number; slug: string; nombre: string; descripcion: string | null; sedeSlug: string | null; coordenadas: [number, number] | null; foto: Imagen | null; orden: number }`; `CategoriaPublica = { id: number; slug: string; nombre: string; grupo: Grupo; claseGrupo: string; aplicaA: 'lugar' | 'evento' | 'ambos'; tipoSchema: string; orden: number }`; `Ajustes = { correoPrivacidad: string | null; formularioActivo: boolean; versionAviso: string | null; avisoVigenteDesde: string | null; avisoPrivacidad: unknown; portadaTitulo: string | null; portadaIntro: string | null }`; `MapaRedirecciones = Record<string, string>`; `Miga = { nombre: string; ruta: string }`.
  - Mapeos: `imagenDe(media: unknown, lang: Locale): Imagen | null`; `zonaDe(z: Zona, lang: Locale): ZonaPublica | null`; `categoriaDe(c: Categoria): CategoriaPublica | null`; `CLASE_GRUPO: Record<Grupo, string>`.
  - Lecturas (reciben `payload`): `zonasActivas(payload, lang)`, `categorias(payload, lang)`, `ajustesPublicos(payload, lang)`, `mapaRedirecciones(payload)`.
  - `type Llave = { llave: string[]; etiquetas: string[] }` y `LLAVES = { zonasActivas(lang), categorias(lang), ajustes(lang), redirecciones() }`.
  - Para las páginas (`cacheadas.ts`): `zonasActivasCacheadas(lang)`, `categoriasCacheadas(lang)`, `ajustesCacheados(lang)`, `mapaRedireccionesCacheado()`, y el ayudante `cachear(lectura, llave)` para que F3b y F3c agreguen las suyas.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/mapeo.test.ts
import { describe, expect, it } from 'vitest'

import { categoriaDe, imagenDe, zonaDe } from '../../src/sitio/datos/mapeo'

const media = {
  id: 1,
  url: '/m/a.jpg',
  width: 3000,
  height: 2000,
  alt: { es: 'Playa', en: 'Beach' },
  credito: 'Ana',
  sizes: {
    s480: { url: '/m/a-480.webp', width: 480 },
    s960: { url: '/m/a-960.webp', width: 960 },
    s1600: { url: '/m/a-1600.webp', width: 1600 },
    og: { url: '/m/a-og.jpg', width: 1200 },
  },
}

describe('mapeos de Payload a tipos del sitio', () => {
  it('imagenDe arma srcset con los tres tamaños y el alt del idioma', () => {
    expect(imagenDe(media, 'en')).toEqual({
      src: '/m/a-960.webp',
      srcset: '/m/a-480.webp 480w, /m/a-960.webp 960w, /m/a-1600.webp 1600w',
      ancho: 3000,
      alto: 2000,
      alt: 'Beach',
      credito: 'Ana',
      og: '/m/a-og.jpg',
    })
  })

  it('imagenDe sin tamaños usa la original; un id suelto o null da null', () => {
    expect(imagenDe({ ...media, sizes: {} }, 'es')?.src).toBe('/m/a.jpg')
    expect(imagenDe(7, 'es')).toBeNull()
    expect(imagenDe(null, 'es')).toBeNull()
  })

  it('zonaDe: null si falta el nombre en el idioma', () => {
    const z = { id: 2, nombre: 'La Paz', slug: 'la-paz', sedeSlug: 'la-paz', coordenadas: [-110.3, 24.1], orden: 1, foto: null } as never
    expect(zonaDe(z, 'es')).toMatchObject({ id: 2, slug: 'la-paz', nombre: 'La Paz', sedeSlug: 'la-paz', coordenadas: [-110.3, 24.1] })
    expect(zonaDe({ ...(z as object), nombre: null } as never, 'en')).toBeNull()
  })

  it('categoriaDe: la clase CSS sale del grupo', () => {
    const c = { id: 3, nombre: 'Playas', slug: 'playas', grupo: 'mar', aplicaA: 'lugar', tipoSchema: 'Beach', orden: 2 } as never
    expect(categoriaDe(c)).toMatchObject({ claseGrupo: 'g-mar', grupo: 'mar', slug: 'playas' })
    expect(categoriaDe({ ...(c as object), grupo: 'comer-y-salir' } as never)?.claseGrupo).toBe('g-comer')
  })
})
```

```ts
// tests/unit/llaves.test.ts
import { describe, expect, it } from 'vitest'

import { LLAVES } from '../../src/sitio/datos/llaves'

describe('llaves y etiquetas de las lecturas cacheadas (spec §10)', () => {
  it('las listas y lecturas por slug llevan etiquetas de colección', () => {
    expect(LLAVES.zonasActivas('es')).toEqual({ llave: ['zonasActivas', 'es'], etiquetas: ['media', 'zonas'] })
    expect(LLAVES.categorias('en')).toEqual({ llave: ['categorias', 'en'], etiquetas: ['categorias'] })
    expect(LLAVES.ajustes('es')).toEqual({ llave: ['ajustes', 'es'], etiquetas: ['ajustes'] })
    expect(LLAVES.redirecciones()).toEqual({ llave: ['redirecciones'], etiquetas: ['redirecciones'] })
  })

  it('cada idioma tiene su llave', () => {
    expect(LLAVES.zonasActivas('es').llave).not.toEqual(LLAVES.zonasActivas('en').llave)
  })
})
```

```ts
// tests/int/sitio-lecturas.int.test.ts
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ajustesPublicos } from '../../src/sitio/datos/lecturas/ajustes'
import { categorias } from '../../src/sitio/datos/lecturas/categorias'
import { mapaRedirecciones } from '../../src/sitio/datos/lecturas/redirecciones'
import { zonasActivas } from '../../src/sitio/datos/lecturas/zonas'
import { crearCategoria, crearZona, limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('lecturas públicas del sitio', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('zonasActivas: solo activas y sin idioma de respaldo', async () => {
    await crearZona(payload, { slug: 'activa-x', nombre: 'Activa', activa: true })
    await crearZona(payload, { slug: 'inactiva-x', nombre: 'Inactiva', activa: false })
    expect((await zonasActivas(payload, 'es')).map((z) => z.slug)).toEqual(['activa-x'])
    // crearZona solo pone el nombre en español: en inglés la zona no tiene nombre y no sale.
    expect(await zonasActivas(payload, 'en')).toEqual([])
  })

  it('categorias: slug y nombre del idioma pedido', async () => {
    await crearCategoria(payload, { es: 'playas-x', en: 'beaches-x', grupo: 'mar' })
    expect((await categorias(payload, 'en')).map((c) => [c.slug, c.claseGrupo])).toEqual([['beaches-x', 'g-mar']])
  })

  it('ajustesPublicos nunca trae correosAviso', async () => {
    await payload.updateGlobal({
      slug: 'ajustes-guia',
      data: { correosAviso: [{ correo: 'equipo@prueba.test' }], correoPrivacidad: 'privacidad@prueba.test' },
      overrideAccess: true,
    })
    const a = await ajustesPublicos(payload, 'es')
    expect(a.correoPrivacidad).toBe('privacidad@prueba.test')
    expect(JSON.stringify(a)).not.toContain('equipo@prueba.test')
  })

  it('mapaRedirecciones: de la ruta vieja a la nueva', async () => {
    await payload.create({
      collection: 'redirects',
      data: { from: '/es/guia/viejo', to: { type: 'custom', url: '/es/guia/nuevo' }, type: '308' },
      overrideAccess: true,
    })
    expect(await mapaRedirecciones(payload)).toEqual({ '/es/guia/viejo': '/es/guia/nuevo' })
  })

  it('una redirección hacia un documento (reference) se rechaza', async () => {
    await expect(
      payload.create({
        collection: 'redirects',
        data: { from: '/es/guia/x', to: { type: 'reference', reference: { relationTo: 'lugares', value: 1 } }, type: '308' },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/solo aceptan una ruta/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/mapeo.test.ts tests/unit/llaves.test.ts` y `npm run test:int -- tests/int/sitio-lecturas.int.test.ts`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/sitio/datos/payload.ts
import { getPayload, type Payload } from 'payload'

import config from '../../payload.config'

// getPayload guarda la instancia: llamarla en cada lectura no reconecta.
export const obtenerPayload = (): Promise<Payload> => getPayload({ config })
```

```ts
// src/sitio/datos/tipos.ts
import type { Grupo } from '../../dominio/grupos'

// Lo que reciben las páginas. Nunca documentos crudos de Payload.
export type Imagen = {
  src: string
  srcset: string
  ancho: number | null
  alto: number | null
  alt: string
  credito: string | null
  og: string | null
}

export type ZonaPublica = {
  id: number
  slug: string
  nombre: string
  descripcion: string | null
  sedeSlug: string | null
  coordenadas: [number, number] | null
  foto: Imagen | null
  orden: number
}

export type CategoriaPublica = {
  id: number
  slug: string
  nombre: string
  grupo: Grupo
  claseGrupo: string
  aplicaA: 'lugar' | 'evento' | 'ambos'
  tipoSchema: string
  orden: number
}

export type Ajustes = {
  correoPrivacidad: string | null
  formularioActivo: boolean
  versionAviso: string | null
  avisoVigenteDesde: string | null
  avisoPrivacidad: unknown
  portadaTitulo: string | null
  portadaIntro: string | null
}

export type MapaRedirecciones = Record<string, string>

export type Miga = { nombre: string; ruta: string }
```

```ts
// src/sitio/datos/mapeo.ts
import type { Grupo } from '../../dominio/grupos'
import type { Locale } from '../../dominio/idioma'
import type { Categoria, Media, Zona } from '../../payload-types'
import type { CategoriaPublica, Imagen, ZonaPublica } from './tipos'

export const CLASE_GRUPO: Record<Grupo, string> = {
  mar: 'g-mar',
  'aire-libre': 'g-aire',
  'comer-y-salir': 'g-comer',
  'lo-local': 'g-local',
}

const TAMANOS = ['s480', 's960', 's1600'] as const

// Spec §4.2: sin optimizador de Next; srcset con los tamaños que genera Payload.
export function imagenDe(media: unknown, lang: Locale): Imagen | null {
  if (!media || typeof media !== 'object') return null
  const m = media as Media
  if (!m.url) return null
  const tamanos = m.sizes ?? {}
  const srcset = TAMANOS.map((k) => tamanos[k])
    .filter((t): t is { url: string; width: number } => Boolean(t?.url && t.width))
    .map((t) => `${t.url} ${t.width}w`)
    .join(', ')
  return {
    src: tamanos.s960?.url ?? m.url,
    srcset,
    ancho: m.width ?? null,
    alto: m.height ?? null,
    alt: m.alt?.[lang] ?? '',
    credito: m.credito ?? null,
    og: tamanos.og?.url ?? null,
  }
}

export function zonaDe(z: Zona, lang: Locale): ZonaPublica | null {
  if (!z.nombre || !z.slug) return null
  return {
    id: z.id,
    slug: z.slug,
    nombre: z.nombre,
    descripcion: z.descripcion ?? null,
    sedeSlug: z.sedeSlug ?? null,
    coordenadas: z.coordenadas ?? null,
    foto: imagenDe(z.foto, lang),
    orden: z.orden ?? 100,
  }
}

export function categoriaDe(c: Categoria): CategoriaPublica | null {
  if (!c.nombre || !c.slug) return null
  return {
    id: c.id,
    slug: c.slug,
    nombre: c.nombre,
    grupo: c.grupo,
    claseGrupo: CLASE_GRUPO[c.grupo],
    aplicaA: c.aplicaA,
    tipoSchema: c.tipoSchema,
    orden: c.orden ?? 100,
  }
}
```

```ts
// src/sitio/datos/lecturas/publico.ts
import type { Locale } from '../../../dominio/idioma'

// Única fuente de las opciones de lectura pública (spec §6 «Regla de idioma», §11): como público, solo
// lo publicado y sin idioma de respaldo.
export const opcionesPublicas = (lang: Locale) =>
  ({ locale: lang, fallbackLocale: false, overrideAccess: false, draft: false }) as const
```

```ts
// src/sitio/datos/lecturas/zonas.ts
import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import { zonaDe } from '../mapeo'
import type { ZonaPublica } from '../tipos'
import { opcionesPublicas } from './publico'

export async function zonasActivas(payload: Payload, lang: Locale): Promise<ZonaPublica[]> {
  const { docs } = await payload.find({
    collection: 'zonas',
    ...opcionesPublicas(lang),
    where: { activa: { equals: true } },
    sort: 'orden',
    depth: 1,
    pagination: false,
  })
  return docs.map((z) => zonaDe(z, lang)).filter((z): z is ZonaPublica => z !== null)
}
```

```ts
// src/sitio/datos/lecturas/categorias.ts
import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import { categoriaDe } from '../mapeo'
import type { CategoriaPublica } from '../tipos'
import { opcionesPublicas } from './publico'

export async function categorias(payload: Payload, lang: Locale): Promise<CategoriaPublica[]> {
  const { docs } = await payload.find({ collection: 'categorias', ...opcionesPublicas(lang), sort: 'orden', depth: 0, pagination: false })
  return docs.map(categoriaDe).filter((c): c is CategoriaPublica => c !== null)
}
```

```ts
// src/sitio/datos/lecturas/ajustes.ts
import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import type { Ajustes } from '../tipos'
import { opcionesPublicas } from './publico'

export async function ajustesPublicos(payload: Payload, lang: Locale): Promise<Ajustes> {
  const g = await payload.findGlobal({ slug: 'ajustes-guia', ...opcionesPublicas(lang), depth: 0 })
  return {
    correoPrivacidad: g.correoPrivacidad ?? null,
    formularioActivo: Boolean(g.formularioActivo),
    versionAviso: g.versionAviso ?? null,
    avisoVigenteDesde: g.avisoVigenteDesde ?? null,
    avisoPrivacidad: g.avisoPrivacidad ?? null,
    portadaTitulo: g.portadaTitulo ?? null,
    portadaIntro: g.portadaIntro ?? null,
  }
}
```

```ts
// src/sitio/datos/lecturas/redirecciones.ts
import type { Payload } from 'payload'

import type { MapaRedirecciones } from '../tipos'

// Toda la tabla en una sola lectura (cacheada con la etiqueta «redirecciones»): una URL inventada no crea
// una entrada de caché nueva. Solo hay redirecciones «custom» (src/redirecciones/plugin.ts).
export async function mapaRedirecciones(payload: Payload): Promise<MapaRedirecciones> {
  const { docs } = await payload.find({ collection: 'redirects', overrideAccess: false, depth: 0, pagination: false })
  const mapa: MapaRedirecciones = {}
  for (const r of docs) if (r.from && r.to?.type === 'custom' && r.to.url) mapa[r.from] = r.to.url
  return mapa
}
```

```ts
// src/sitio/datos/llaves.ts
import { etiqueta } from '../../dominio/etiquetas'
import type { Locale } from '../../dominio/idioma'

export type Llave = { llave: string[]; etiquetas: string[] }

// Llave y etiquetas de cada lectura cacheada (spec §10). Las listas y las lecturas por slug llevan
// etiquetas de colección; `{tipo}:{id}` solo en lecturas por id. F3b y F3c agregan filas aquí.
export const LLAVES = {
  zonasActivas: (lang: Locale): Llave => ({ llave: ['zonasActivas', lang], etiquetas: [etiqueta.media, etiqueta.zonas] }),
  categorias: (lang: Locale): Llave => ({ llave: ['categorias', lang], etiquetas: [etiqueta.categorias] }),
  ajustes: (lang: Locale): Llave => ({ llave: ['ajustes', lang], etiquetas: [etiqueta.ajustes] }),
  redirecciones: (): Llave => ({ llave: ['redirecciones'], etiquetas: [etiqueta.redirecciones] }),
}
```

```ts
// src/sitio/datos/cacheadas.ts
import { unstable_cache } from 'next/cache'
import type { Payload } from 'payload'

import { ajustesPublicos } from './lecturas/ajustes'
import { categorias } from './lecturas/categorias'
import { mapaRedirecciones } from './lecturas/redirecciones'
import { zonasActivas } from './lecturas/zonas'
import { LLAVES, type Llave } from './llaves'
import { obtenerPayload } from './payload'

const REVALIDAR = 3600

// Envoltorio mecánico: la llave y las etiquetas salen de llaves.ts (probado); aquí no hay reglas.
export function cachear<A extends unknown[], R>(
  lectura: (payload: Payload, ...args: A) => Promise<R>,
  llave: (...args: A) => Llave,
): (...args: A) => Promise<R> {
  return (...args: A) => {
    const { llave: partes, etiquetas } = llave(...args)
    return unstable_cache(async () => lectura(await obtenerPayload(), ...args), partes, { tags: etiquetas, revalidate: REVALIDAR })()
  }
}

export const zonasActivasCacheadas = cachear(zonasActivas, LLAVES.zonasActivas)
export const categoriasCacheadas = cachear(categorias, LLAVES.categorias)
export const ajustesCacheados = cachear(ajustesPublicos, LLAVES.ajustes)
export const mapaRedireccionesCacheado = cachear(mapaRedirecciones, LLAVES.redirecciones)
```

En `src/redirecciones/plugin.ts`, agrega el hook que acepta solo rutas `custom` (Task 6 le suma los de revalidación):

```ts
import { APIError, type CollectionBeforeValidateHook } from 'payload'

// El destino de una redirección «reference» depende del idioma y del slug del momento; el mapa cacheado del
// sitio no lo seguiría (plan F3a). Solo rutas: es lo que escriben los hooks y lo que un Admin debe usar.
export const soloRutas: CollectionBeforeValidateHook = ({ data }) => {
  const to = (data as { to?: { type?: string } } | undefined)?.to
  if (to?.type === 'reference') {
    throw new APIError('Las redirecciones solo aceptan una ruta (URL personalizada).', 400, undefined, true)
  }
  return data
}
```

y en `overrides` del plugin agrega `hooks: { beforeValidate: [soloRutas] }`.

En el spec §6, «Redirecciones», cambia «`hacia` (ruta o documento)» por «`hacia` (ruta; las redirecciones a un documento se rechazan porque su destino dependería del idioma y del slug del momento, y la caché del sitio no lo seguiría)».

Nota: una combinación de idioma cruzado se reescribe a `/{lang}/guia/--`, así que nunca se busca una redirección para la ruta cruzada original. Es intencional: esas rutas no existen en ningún idioma.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/unit/mapeo.test.ts tests/unit/llaves.test.ts`, `npm run test:int -- tests/int/sitio-lecturas.int.test.ts tests/int/redirecciones.int.test.ts` y `npm run typecheck`
Expected: PASS; las redirecciones que crean los hooks de F2 (todas `custom`) siguen pasando.

- [ ] **Step 5: Commit**

```bash
git add src/sitio/datos src/redirecciones/plugin.ts docs/specs/2026-10-30-guia-baja-design.md tests/unit/mapeo.test.ts tests/unit/llaves.test.ts tests/int/sitio-lecturas.int.test.ts
git commit -m "feat: capa de datos del sitio público con lecturas cacheadas por etiqueta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Revalidación desde Payload

**Files:**
- Create: `src/revalidacion/revalidar.ts`, `src/revalidacion/hooks.ts`
- Modify: `src/collections/Zonas.ts`, `src/collections/Categorias.ts`, `src/collections/Lugares.ts`, `src/collections/Eventos.ts`, `src/collections/Articulos.ts`, `src/collections/TextosZonaCategoria.ts`, `src/collections/FotosTours.ts`, `src/collections/Media.ts`, `src/globals/AjustesGuia.ts`, `src/redirecciones/plugin.ts`
- Test: `tests/unit/revalidar.test.ts`, `tests/int/revalidacion.int.test.ts`

**Interfaces:**
- Consumes: `etiquetasDeCambio`, `etiqueta`, `ColeccionRevalidable` (Task 4).
- Produces: `revalidar(etiquetas: string[], req: PayloadRequest): void`; `hooksDeRevalidacion(coleccion: ColeccionRevalidable): { afterChange: CollectionAfterChangeHook; afterDelete: CollectionAfterDeleteHook }`; `revalidarAjustes: GlobalAfterChangeHook`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/revalidar.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.fn()
vi.mock('next/cache', () => ({ revalidateTag: (...a: unknown[]) => revalidateTag(...a) }))

const { revalidar } = await import('../../src/revalidacion/revalidar')

const req = (context: Record<string, unknown> = {}) => {
  const error = vi.fn()
  return { r: { context, payload: { logger: { error } } } as never, error }
}

describe('revalidar (spec §10)', () => {
  beforeEach(() => revalidateTag.mockReset())

  it('revalida cada etiqueta con expiración inmediata', () => {
    revalidar(['a', 'b'], req().r)
    expect(revalidateTag.mock.calls).toEqual([
      ['a', { expire: 0 }],
      ['b', { expire: 0 }],
    ])
  })

  it('no revalida con disableRevalidate', () => {
    revalidar(['a'], req({ disableRevalidate: true }).r)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('fuera del runtime de Next no registra nada', () => {
    revalidateTag.mockImplementation(() => {
      throw new Error('Invariant: static generation store missing in revalidateTag a')
    })
    const { r, error } = req()
    expect(() => revalidar(['a'], r)).not.toThrow()
    expect(error).not.toHaveBeenCalled()
  })

  it('cualquier otro error se registra y no rompe el guardado', () => {
    revalidateTag.mockImplementation(() => {
      throw new Error('falla')
    })
    const { r, error } = req()
    expect(() => revalidar(['a', 'b'], r)).not.toThrow()
    expect(error).toHaveBeenCalledTimes(2)
  })
})
```

```ts
// tests/int/revalidacion.int.test.ts
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { crearZona, limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('hooks de revalidación fuera del runtime de Next', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('guardar y borrar no se rompen, con y sin disableRevalidate', async () => {
    const z = await crearZona(payload, { slug: 'zona-rev' })
    await payload.update({ collection: 'zonas', id: z.id, data: { orden: 5 }, overrideAccess: true })
    await payload.update({ collection: 'zonas', id: z.id, data: { orden: 6 }, overrideAccess: true, context: { disableRevalidate: true } })
    await payload.updateGlobal({ slug: 'ajustes-guia', data: { portadaTitulo: 'Hola' }, locale: 'es', overrideAccess: true })
    await payload.delete({ collection: 'zonas', id: z.id, overrideAccess: true })
    expect(await payload.count({ collection: 'zonas', overrideAccess: true })).toMatchObject({ totalDocs: 0 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/revalidar.test.ts`
Expected: FAIL (no existe `src/revalidacion/revalidar`).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/revalidacion/revalidar.ts
import { revalidateTag } from 'next/cache'
import type { PayloadRequest } from 'payload'

// Fuera de Next (payload run, seed, pruebas) revalidateTag lanza este invariante: no hay nada que revalidar.
const FUERA_DE_NEXT = /static generation store missing/i

// Spec §10: nunca rompe el guardado; respeta disableRevalidate (seed, scripts, migraciones).
export function revalidar(etiquetas: string[], req: PayloadRequest): void {
  if (req.context?.disableRevalidate) return
  for (const etiqueta of etiquetas) {
    try {
      revalidateTag(etiqueta, { expire: 0 })
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e)
      if (FUERA_DE_NEXT.test(mensaje)) continue
      req.payload.logger.error({ msg: 'No se pudo revalidar la caché', etiqueta, err: mensaje })
    }
  }
}
```

```ts
// src/revalidacion/hooks.ts
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

import { etiqueta, etiquetasDeCambio, type ColeccionRevalidable } from '../dominio/etiquetas'
import { revalidar } from './revalidar'

export function hooksDeRevalidacion(coleccion: ColeccionRevalidable) {
  const afterChange: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
    revalidar(etiquetasDeCambio(coleccion, doc, previousDoc), req)
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
    revalidar(etiquetasDeCambio(coleccion, doc, null), req)
    return doc
  }
  return { afterChange, afterDelete }
}

export const revalidarAjustes: GlobalAfterChangeHook = ({ doc, req }) => {
  revalidar([etiqueta.ajustes], req)
  return doc
}
```

Registra los hooks **después** de los existentes:

- `Zonas.ts`: `const revalidacion = hooksDeRevalidacion('zonas')` y `hooks: { afterChange: [hooksDeZona().afterChange, revalidacion.afterChange], afterDelete: [revalidacion.afterDelete] }`.
- `Categorias.ts`: `hooksDeRevalidacion('categorias')`; `afterChange: [redireccionCategoria.afterChange, revalidacion.afterChange]`, `afterDelete: [revalidacion.afterDelete]` (conserva `beforeChange`).
- `Lugares.ts`, `Eventos.ts`, `Articulos.ts`: `hooksDeRevalidacion('lugares' | 'eventos' | 'articulos')`; `afterChange: [redireccion.afterChange, revalidacion.afterChange]`, `afterDelete: [redireccion.afterDelete, revalidacion.afterDelete]` (conserva `beforeChange` y `beforeDelete` tal cual).
- `TextosZonaCategoria.ts`, `FotosTours.ts`: `hooks: { afterChange: [revalidacion.afterChange], afterDelete: [revalidacion.afterDelete] }` con `'textos-zona-categoria'` y `'fotos-tours'`.
- `Media.ts`: `hooks: { beforeValidate: [limitarTamano], afterChange: [revalidacion.afterChange], afterDelete: [revalidacion.afterDelete] }` con `'media'`.
- `AjustesGuia.ts`: `hooks: { afterChange: [revalidarAjustes] }`.
- `redirecciones/plugin.ts`: `hooks: { beforeValidate: [soloRutas], afterChange: [revalidacion.afterChange], afterDelete: [revalidacion.afterDelete] }` con `hooksDeRevalidacion('redirects')`.

Import en cada archivo: `import { hooksDeRevalidacion } from '../revalidacion/hooks'` (en `AjustesGuia.ts`, `revalidarAjustes`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/unit/revalidar.test.ts`, `npm run test:int` (suite completa) y `npm run typecheck`
Expected: PASS. La salida de integración no debe mostrar «No se pudo revalidar la caché».

- [ ] **Step 5: Commit**

```bash
git add src/revalidacion src/collections src/globals/AjustesGuia.ts src/redirecciones/plugin.ts tests/unit/revalidar.test.ts tests/int/revalidacion.int.test.ts
git commit -m "feat: revalidación por etiquetas desde los hooks de Payload

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: SEO base (metadatos y JSON-LD)

**Files:**
- Create: `src/sitio/entorno.ts`, `src/sitio/seo/metadatos.ts`, `src/sitio/seo/jsonld.ts`, `src/sitio/ui/JsonLd.tsx`
- Modify: `.env.example`, `docs/specs/2026-10-30-guia-baja-design.md` (§5.5)
- Test: `tests/unit/metadatos.test.ts`, `tests/unit/jsonld.test.ts`

**Interfaces:**
- Consumes: `hreflang`, `VersionIdioma` (Task 4); `Miga` (Task 5).
- Produces: `sitioUrl(): string`; `guiaIndexable(): boolean`; `whatsappNumero(): string`; `type EntradaMetadatos = { lang: Locale; titulo: string; descripcion: string; ruta: string; indexable: boolean; versiones: VersionIdioma[] }`; `metadatos(e: EntradaMetadatos): Metadata`; `migasLd(migas: Miga[], base: string)`; `listaLd(items: { nombre: string; ruta: string }[], base: string)`; `<JsonLd datos={object} />`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/metadatos.test.ts
import { describe, expect, it } from 'vitest'

import { metadatos } from '../../src/sitio/seo/metadatos'

const base = { lang: 'es' as const, titulo: 'La Paz', descripcion: 'Qué hacer', ruta: '/es/guia/la-paz' }
const versiones = [
  { lang: 'es' as const, ruta: '/es/guia/la-paz', indexable: true },
  { lang: 'en' as const, ruta: '/en/guide/la-paz', indexable: true },
]

describe('metadatos (spec §9)', () => {
  it('indexable: canónica, hreflang y robots index', () => {
    const m = metadatos({ ...base, indexable: true, versiones })
    expect(m.alternates).toEqual({
      canonical: '/es/guia/la-paz',
      languages: { 'es-MX': '/es/guia/la-paz', 'en-US': '/en/guide/la-paz', 'x-default': '/es/guia/la-paz' },
    })
    expect(m.robots).toEqual({ index: true, follow: true })
  })

  it('no indexable: noindex y sin hreflang', () => {
    const m = metadatos({ ...base, indexable: false, versiones })
    expect(m.alternates).toEqual({ canonical: '/es/guia/la-paz' })
    expect(m.robots).toEqual({ index: false, follow: true })
  })

  it('Open Graph con el idioma', () => {
    expect(metadatos({ ...base, lang: 'en', indexable: true, versiones }).openGraph).toMatchObject({ locale: 'en_US', title: 'La Paz' })
  })
})
```

```ts
// tests/unit/jsonld.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { listaLd, migasLd } from '../../src/sitio/seo/jsonld'
import { JsonLd } from '../../src/sitio/ui/JsonLd'

const base = 'https://www.salysoltours.com'

describe('JSON-LD de base (spec §9)', () => {
  it('BreadcrumbList con URLs absolutas', () => {
    expect(migasLd([{ nombre: 'Guía', ruta: '/es/guia' }, { nombre: 'La Paz', ruta: '/es/guia/la-paz' }], base)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Guía', item: 'https://www.salysoltours.com/es/guia' },
        { '@type': 'ListItem', position: 2, name: 'La Paz', item: 'https://www.salysoltours.com/es/guia/la-paz' },
      ],
    })
  })

  it('ItemList', () => {
    expect(listaLd([{ nombre: 'A', ruta: '/es/guia/lugares/a' }], base).itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'A', url: 'https://www.salysoltours.com/es/guia/lugares/a' },
    ])
  })

  it('<JsonLd> escapa «<» para que el texto no cierre el script', () => {
    const html = renderToStaticMarkup(createElement(JsonLd, { datos: { name: '</script><b>x' } }))
    expect(html).toBe('<script type="application/ld+json">{"name":"\\u003c/script>\\u003cb>x"}</script>')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/metadatos.test.ts tests/unit/jsonld.test.ts`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/sitio/entorno.ts
// Lectura única de las variables de entorno del sitio público (spec §5.5).
export const sitioUrl = (): string => process.env.SITIO_URL || 'https://www.salysoltours.com'
export const guiaIndexable = (): boolean => process.env.GUIA_INDEXABLE === 'true'
export const whatsappNumero = (): string => (process.env.WHATSAPP_NUMERO ?? '').replace(/\D/g, '')
```

```ts
// src/sitio/seo/metadatos.ts
import type { Metadata } from 'next'

import type { Locale } from '../../dominio/idioma'
import { hreflang, type VersionIdioma } from '../../dominio/indexable'

export type EntradaMetadatos = {
  lang: Locale
  titulo: string
  descripcion: string
  ruta: string
  indexable: boolean
  versiones: VersionIdioma[]
}

// Spec §9. Rutas relativas: metadataBase (= SITIO_URL, en el layout raíz) las vuelve absolutas.
export function metadatos(e: EntradaMetadatos): Metadata {
  const languages = hreflang({ lang: e.lang, ruta: e.ruta, indexable: e.indexable }, e.versiones)
  return {
    title: e.titulo,
    description: e.descripcion,
    alternates: Object.keys(languages).length ? { canonical: e.ruta, languages } : { canonical: e.ruta },
    robots: { index: e.indexable, follow: true },
    openGraph: {
      title: e.titulo,
      description: e.descripcion,
      url: e.ruta,
      locale: e.lang === 'es' ? 'es_MX' : 'en_US',
      type: 'website',
      siteName: 'Guía de la Baja',
    },
  }
}
```

```ts
// src/sitio/seo/jsonld.ts
import type { Miga } from '../datos/tipos'

const absoluta = (ruta: string, base: string) => new URL(ruta, base).toString()

export function migasLd(migas: Miga[], base: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: migas.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.nombre, item: absoluta(m.ruta, base) })),
  }
}

export function listaLd(items: { nombre: string; ruta: string }[], base: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.nombre, url: absoluta(x.ruta, base) })),
  }
}
```

```tsx
// src/sitio/ui/JsonLd.tsx
// «<» escapado: un texto del admin con «</script>» no puede cerrar la etiqueta.
export function JsonLd({ datos }: { datos: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, '\\u003c') }} />
}
```

En `.env.example`, debajo de `SITIO_URL`:

```
# Número de WhatsApp del pie (como el sitio de reservas). Vacío: no se muestra el botón.
WHATSAPP_NUMERO=
```

En la tabla de `docs/specs/2026-10-30-guia-baja-design.md` §5.5, agrega la fila:

```
| `WHATSAPP_NUMERO` | Botón de WhatsApp del pie (el mismo número del sitio de reservas). | Igual. |
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/unit/metadatos.test.ts tests/unit/jsonld.test.ts` y `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sitio/entorno.ts src/sitio/seo src/sitio/ui/JsonLd.tsx tests/unit/metadatos.test.ts tests/unit/jsonld.test.ts .env.example docs/specs/2026-10-30-guia-baja-design.md
git commit -m "feat: metadatos, hreflang y JSON-LD de base del sitio público

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Esqueleto del sitio: layouts, estilos, cabecera, pie y portada mínima

**Files:**
- Create: `src/sitio/textos.ts`, `src/sitio/ui/pie-datos.ts`, `src/sitio/ui/Pie.tsx`, `src/sitio/ui/Cabecera.tsx`, `src/sitio/ui/CabeceraCliente.tsx`, `src/sitio/ui/Migas.tsx`, `src/sitio/estilos/base.css`, `src/sitio/estilos/portada.css`, `src/sitio/fuentes/ConsolaMono-Bold.woff2` (copia), `public/guia-assets/logos/*.svg` y `public/guia-assets/pagos/*.svg` (copias), `src/app/(sitio)/[lang]/layout.tsx`, `src/app/(sitio)/[lang]/guia/layout.tsx`, `src/app/(sitio)/[lang]/guia/page.tsx`
- Modify: `eslint.config.mjs`
- Test: `tests/unit/textos.test.ts`

**Interfaces:**
- Consumes: `zonasActivasCacheadas`, `categoriasCacheadas`, `ajustesCacheados` (Task 5); `metadatos`, `migasLd`, `JsonLd`, `sitioUrl`, `guiaIndexable`, `whatsappNumero` (Task 7); `rutas`.
- Produces:
  - `textos(lang: Locale)`: objeto con las secciones `guia`, `cabecera`, `portada`, `noEncontrado`, `error`, `migas` y `pie`; la misma forma en los dos idiomas.
  - `<Cabecera lang zonas idioma />`: `idioma` es el nodo del slot.
  - `<Pie lang />`.
  - `<Migas lang migas={Miga[]} />`.
  - Layouts de `[lang]` y de `guia`. El de `guia` recibe el slot `idioma` (Task 9) y lo pasa a la cabecera.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/textos.test.ts
import { describe, expect, it } from 'vitest'

import { textos } from '../../src/sitio/textos'

const forma = (o: unknown): unknown =>
  o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'function' ? 'fn' : forma(v)])) : typeof o

describe('textos de la interfaz', () => {
  it('español e inglés tienen exactamente las mismas llaves', () => {
    expect(forma(textos('en'))).toEqual(forma(textos('es')))
  })

  it('el puente nombra la zona', () => {
    expect(textos('es').cabecera.toursEn('La Paz')).toBe('Tours en La Paz')
    expect(textos('en').cabecera.toursEn('La Paz')).toBe('Tours in La Paz')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/textos.test.ts`
Expected: FAIL (no existe `src/sitio/textos`).

- [ ] **Step 3: Write the implementation**

**Recursos (copias sin cambios):**

```bash
mkdir -p src/sitio/fuentes public/guia-assets/logos public/guia-assets/pagos
cp docs/diseno/recursos/fuentes/ConsolaMono-Bold.woff2 src/sitio/fuentes/
cp docs/diseno/recursos/logos/*.svg public/guia-assets/logos/
cp docs/diseno/recursos/pagos/*.svg public/guia-assets/pagos/
```

La licencia de la fuente (SIL OFL 1.1) ya está en `docs/diseno/recursos/fuentes/`. Copia también `OFL.txt` a `src/sitio/fuentes/OFL.txt`.

**Lint:** el sitio público usa `<img>` a propósito, sin el optimizador de Next (spec §4.2). En `eslint.config.mjs`, agrega este bloque antes del de `ignores`:

```js
  {
    // Spec §4.2: imágenes servidas directo de R2 con srcset; /_next/image no lleva el assetPrefix.
    files: ['src/sitio/**', 'src/app/(sitio)/**'],
    rules: { '@next/next/no-img-element': 'off' },
  },
```

**Estilos:**

- `src/sitio/estilos/base.css` es una copia de `docs/diseno/propuestas/c-base.css` con dos cambios:
  1. Borra el bloque `@font-face { … }` del principio, porque la fuente la carga `next/font`.
  2. En `:root`, la variable `--titulo` empieza con la fuente de `next/font`: `--titulo: var(--fuente-titulo), Consolas, "SF Mono", Menlo, ui-monospace, monospace;`.
  El resto del archivo se copia tal cual.
- `src/sitio/estilos/portada.css` es el contenido del `<style>` de `docs/diseno/propuestas/c-portada.html` (de `/* Encabezado` a `.cat span { … }`), sin la etiqueta `<style>`.

```ts
// src/sitio/textos.ts
import type { Locale } from '../dominio/idioma'

// Textos de la interfaz. Sin imports de servidor: lo usan componentes de servidor y de cliente.
const ES = {
  guia: 'Guía de la Baja',
  cabecera: {
    sello: 'Guía de la Baja, de Sun Baja',
    zonas: 'Zonas',
    todaLaBaja: 'Toda la Baja',
    buscar: 'Buscar en la Guía',
    ejemplo: 'Playas, tacos, eventos…',
    cancelar: 'Cancelar',
    idioma: 'Idioma',
    toursEn: (zona: string) => `Tours en ${zona}`,
    toursEnLaBaja: 'Tours en la Baja',
    tours: 'Tours',
  },
  portada: {
    titulo: 'Qué hacer en Baja California Sur',
    intro: 'Lugares, eventos y artículos de la Baja, visitados por el equipo de la Guía.',
    zonas: 'Zonas',
    categorias: 'Categorías',
  },
  noEncontrado: {
    titulo: 'Esta página se fue al mar',
    texto: 'No la encontramos: puede que la hayan movido o que ya no exista. Si llegaste por un link viejo, búscala aquí:',
    buscar: 'Buscar',
    empieza: 'O empieza por aquí',
    portada: 'Portada de la Guía',
    eventos: 'Próximos eventos',
  },
  error: {
    titulo: 'Algo salió mal',
    texto: 'No pudimos cargar esta página. Intenta de nuevo en un momento.',
    reintentar: 'Reintentar',
    portada: 'Ir a la portada de la Guía',
  },
  migas: { etiqueta: 'Estás en', guia: 'Guía' },
  pie: {
    titulo: 'Sal al mar con la gente de Baja Sur',
    reservar: 'Reserva ahora',
    explora: 'Explora',
    mapa: 'Mapa',
    sedes: 'Sedes',
    comoFunciona: 'Cómo funciona',
    empresas: 'Empresas',
    nosotros: 'Sobre nosotros',
    atencion: 'Atención al cliente',
    whatsapp: 'Escríbenos por WhatsApp',
    pagos: 'Formas de pago',
    efectivo: 'Efectivo',
    notaPagos: 'Tarjetas de crédito y débito. Efectivo, para el resto el día del viaje.',
    legal: 'Información legal',
    deslinde: 'Deslinde de responsabilidad',
    privacidad: 'Aviso de privacidad',
    privacidadGuia: 'Aviso de privacidad de la Guía',
    derechos: 'Sun Baja Experience. Todos los derechos reservados.',
    hecho: 'Diseñado y desarrollado por',
  },
}

type Textos = typeof ES

const EN: Textos = {
  guia: 'Baja Guide',
  cabecera: {
    sello: 'Baja Guide, by Sun Baja',
    zonas: 'Areas',
    todaLaBaja: 'All of Baja',
    buscar: 'Search the Guide',
    ejemplo: 'Beaches, tacos, events…',
    cancelar: 'Cancel',
    idioma: 'Language',
    toursEn: (zona: string) => `Tours in ${zona}`,
    toursEnLaBaja: 'Tours in Baja',
    tours: 'Tours',
  },
  portada: {
    titulo: 'Things to do in Baja California Sur',
    intro: 'Places, events and articles from Baja, visited by the Guide team.',
    zonas: 'Areas',
    categorias: 'Categories',
  },
  noEncontrado: {
    titulo: 'This page went out to sea',
    texto: "We couldn't find it: it may have moved or no longer exist. If you followed an old link, search for it here:",
    buscar: 'Search',
    empieza: 'Or start here',
    portada: 'Guide home',
    eventos: 'Upcoming events',
  },
  error: {
    titulo: 'Something went wrong',
    texto: "We couldn't load this page. Please try again in a moment.",
    reintentar: 'Try again',
    portada: 'Go to the Guide home',
  },
  migas: { etiqueta: 'You are here', guia: 'Guide' },
  pie: {
    titulo: 'Head out to sea with the people of Baja Sur',
    reservar: 'Book now',
    explora: 'Explore',
    mapa: 'Map',
    sedes: 'Locations',
    comoFunciona: 'How it works',
    empresas: 'Companies',
    nosotros: 'About us',
    atencion: 'Customer service',
    whatsapp: 'Message us on WhatsApp',
    pagos: 'Payment methods',
    efectivo: 'Cash',
    notaPagos: 'Credit and debit cards. Cash for the balance on the day of the trip.',
    legal: 'Legal information',
    deslinde: 'Liability waiver',
    privacidad: 'Privacy notice',
    privacidadGuia: 'Guide privacy notice',
    derechos: 'Sun Baja Experience. All rights reserved.',
    hecho: 'Designed and developed by',
  },
}

export const textos = (lang: Locale): Textos => (lang === 'es' ? ES : EN)
```

```ts
// src/sitio/ui/pie-datos.ts
// Datos del pie del sitio de reservas, copiados aquí (spec §7, «Navegación»). Si el sitio cambia su pie, se cambia
// aquí a mano. Las rutas de «Explora» salen de la propuesta C; el dueño las confirma contra el pie en producción.
export const RUTAS_PIE = {
  reservar: '/reservar',
  mapa: '/mapa',
  sedes: '/sedes',
  comoFunciona: '#como-funciona',
  empresas: '/empresas',
  nosotros: '#nosotros',
  deslinde: '/deslinde',
  privacidad: '/privacidad',
} as const

export const DIRECCION_PIE = 'La Paz, BCS: C. Toronja 561, Indeco, Donceles 28, 23070'
```

```tsx
// src/sitio/ui/Pie.tsx
import Link from 'next/link'

import type { Locale } from '../../dominio/idioma'
import { rutas } from '../../dominio/rutas'
import { sitioUrl, whatsappNumero } from '../entorno'
import { textos } from '../textos'
import { DIRECCION_PIE, RUTAS_PIE } from './pie-datos'

const ICONO_WHATSAPP =
  'M187.58,144.84l-32-16a8,8,0,0,0-8,.5l-14.69,9.8a40.55,40.55,0,0,1-16-16l9.8-14.69a8,8,0,0,0,.5-8l-16-32A8,8,0,0,0,104,64a40,40,0,0,0-40,40,88.1,88.1,0,0,0,88,88,40,40,0,0,0,40-40A8,8,0,0,0,187.58,144.84ZM128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Z'

// Pie del sitio de reservas (spec §7) más el aviso de privacidad de la Guía. Links al sitio: <a>.
export function Pie({ lang }: { lang: Locale }) {
  const t = textos(lang).pie
  const sitio = (ruta: string) => `${sitioUrl()}/${lang}${ruta}`
  const whatsapp = whatsappNumero()
  const explora = [
    [t.mapa, RUTAS_PIE.mapa],
    [t.sedes, RUTAS_PIE.sedes],
    [t.comoFunciona, RUTAS_PIE.comoFunciona],
    [t.empresas, RUTAS_PIE.empresas],
    [t.nosotros, RUTAS_PIE.nosotros],
  ] as const
  return (
    <footer className="pie-sb" id="contacto">
      <div className="pie-sb__dentro">
        <div className="pie-sb__rejilla">
          <div className="pie-sb__grupo">
            <h2>{t.titulo}</h2>
            <a className="pie-sb__boton" href={sitio(RUTAS_PIE.reservar)}>{t.reservar}</a>
            <nav aria-label={t.explora}>
              <ul className="pie-sb__enlaces">
                {explora.map(([texto, ruta]) => (
                  <li key={ruta}>
                    <a className="enlace" href={sitio(ruta)}>{texto}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="pie-sb__grupo">
            <h3>{t.atencion}</h3>
            {whatsapp && (
              <a className="pie-sb__boton" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener">
                <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d={ICONO_WHATSAPP} /></svg>
                {t.whatsapp}
              </a>
            )}
            <p style={{ marginTop: 8 }}>{DIRECCION_PIE}</p>
          </div>
          <div className="pie-sb__grupo">
            <h3>{t.pagos}</h3>
            <ul className="pie-sb__pagos">
              <li><img src="/guia-assets/pagos/visa.svg" alt="Visa" /></li>
              <li><img src="/guia-assets/pagos/mastercard.svg" alt="Mastercard" /></li>
              <li><img src="/guia-assets/pagos/amex.svg" alt="American Express" /></li>
              <li className="pie-sb__efectivo">{t.efectivo}</li>
            </ul>
            <p style={{ maxWidth: '28ch' }}>{t.notaPagos}</p>
          </div>
          <nav className="pie-sb__legal" aria-label={t.legal}>
            <h3>{t.legal}</h3>
            <a className="enlace" href={sitio(RUTAS_PIE.deslinde)}>{t.deslinde}</a>
            <a className="enlace" href={sitio(RUTAS_PIE.privacidad)}>{t.privacidad}</a>
            <Link className="enlace" href={rutas.privacidad(lang)}>{t.privacidadGuia}</Link>
          </nav>
        </div>
        <div className="pie-sb__logo" role="img" aria-label="Sun Baja Experience">
          <img className="logo-isotipo" src="/guia-assets/logos/logolg-isotipo.svg" alt="" />
          <img className="logo-letras" src="/guia-assets/logos/logolg-letras.svg" alt="" />
        </div>
        <div className="pie-sb__final">
          <span>{t.derechos}</span>
          <span>{t.hecho} <strong>crwncode studios</strong></span>
        </div>
      </div>
    </footer>
  )
}
```

```tsx
// src/sitio/ui/Cabecera.tsx
import type { ReactNode } from 'react'

import type { Locale } from '../../dominio/idioma'
import { rutas } from '../../dominio/rutas'
import type { ZonaPublica } from '../datos/tipos'
import { CabeceraCliente } from './CabeceraCliente'

// Cabecera de la Guía (spec §7, «Navegación»). `idioma` es el slot @idioma: selector ES/EN y puente a reservas
// ya resueltos en el servidor para esta página.
export function Cabecera({ lang, zonas, idioma }: { lang: Locale; zonas: ZonaPublica[]; idioma?: ReactNode }) {
  return (
    <CabeceraCliente
      lang={lang}
      portada={rutas.portada(lang)}
      buscar={rutas.buscar(lang)}
      zonas={zonas.map((z) => ({ slug: z.slug, nombre: z.nombre, ruta: rutas.zona(lang, z.slug) }))}
    >
      {idioma}
    </CabeceraCliente>
  )
}
```

```tsx
// src/sitio/ui/CabeceraCliente.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { Locale } from '../../dominio/idioma'
import { textos } from '../textos'

type ZonaCabecera = { slug: string; nombre: string; ruta: string }

const Lupa = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
)

// Comportamiento de c-base.js (cabecera): borde al bajar, zonas del celular que se esconden y hoja de búsqueda.
// usePathname: solo se lee split('/')[3] (zona); nunca se arma un href con él (plan F3a, «Regla de usePathname»).
export function CabeceraCliente(props: {
  lang: Locale
  portada: string
  buscar: string
  zonas: ZonaCabecera[]
  children: ReactNode
}) {
  const { lang, portada, buscar, zonas, children } = props
  const t = textos(lang).cabecera
  const zonaActual = usePathname().split('/')[3]
  const cabecera = useRef<HTMLElement>(null)
  const botonBuscar = useRef<HTMLButtonElement>(null)
  const campoMovil = useRef<HTMLInputElement>(null)
  const [borde, setBorde] = useState(false)
  const [compacta, setCompacta] = useState(false)
  const [hoja, setHoja] = useState(false)

  useEffect(() => {
    const cab = cabecera.current
    if (!cab) return
    const medir = () => document.documentElement.style.setProperty('--cabecera', `${cab.offsetHeight}px`)
    let ultimo = window.scrollY
    const alMover = () => {
      const y = window.scrollY
      setBorde(y > 4)
      if (y > ultimo + 6 && y > 120) setCompacta(true)
      else if (y < ultimo - 6 || y < 120) setCompacta(false)
      ultimo = y
    }
    medir()
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', alMover, { passive: true })
    return () => {
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', alMover)
    }
  }, [])

  useEffect(() => {
    if (!hoja) return
    document.body.style.overflow = 'hidden'
    const foco = window.setTimeout(() => campoMovil.current?.focus(), 60)
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setHoja(false)
    window.addEventListener('keydown', alTeclear)
    return () => {
      document.body.style.overflow = ''
      window.clearTimeout(foco)
      window.removeEventListener('keydown', alTeclear)
      botonBuscar.current?.focus()
    }
  }, [hoja])

  const enlaces = (
    <>
      <Link className="zona" href={portada} aria-current={zonaActual === undefined ? 'page' : undefined}>
        {t.todaLaBaja}
      </Link>
      {zonas.map((z) => (
        <Link key={z.slug} className="zona" href={z.ruta} aria-current={z.slug === zonaActual ? 'page' : undefined}>
          {z.nombre}
        </Link>
      ))}
    </>
  )

  return (
    <>
      <header ref={cabecera} id="guia-cab" className={`guia-cab${borde ? ' con-borde' : ''}${compacta ? ' compacta' : ''}`}>
        <div className="ancho guia-cab__fila">
          <Link className="sello" href={portada} aria-label={t.sello}>
            <img src="/guia-assets/logos/logosm.svg" width={36} height={36} alt="" />
            <span className="sello__txt" aria-hidden="true">
              <small>Sun Baja</small>
              <b>{textos(lang).guia}</b>
            </span>
          </Link>
          <nav className="guia-cab__zonas" aria-label={t.zonas}>{enlaces}</nav>
          <div className="guia-cab__der">
            <form className="busca" role="search" action={buscar}>
              <Lupa />
              <label className="solo-lector" htmlFor="q">{t.buscar}</label>
              <input id="q" type="search" name="q" placeholder={t.buscar} autoComplete="off" />
            </form>
            <button ref={botonBuscar} className="busca-movil presionable" type="button" aria-label={t.buscar} onClick={() => setHoja(true)}>
              <Lupa />
            </button>
            {children}
          </div>
        </div>
        <div className="guia-cab__zonas-movil">
          <div>
            <nav className="ancho guia-cab__zonas" aria-label={t.zonas}>{enlaces}</nav>
          </div>
        </div>
      </header>
      {/* inert en lugar de hidden: la transición de .busqueda/.abierta de c-base.css sigue funcionando. */}
      <div className={`busqueda${hoja ? ' abierta' : ''}`} role="dialog" aria-modal="true" aria-label={t.buscar} inert={!hoja}>
        <form className="busqueda__cabeza" role="search" action={buscar}>
          <label>
            <Lupa />
            <span className="solo-lector">{t.buscar}</span>
            <input ref={campoMovil} type="search" name="q" placeholder={t.ejemplo} autoComplete="off" />
          </label>
          <button type="button" onClick={() => setHoja(false)}>{t.cancelar}</button>
        </form>
      </div>
    </>
  )
}
```

```tsx
// src/sitio/ui/Migas.tsx
import Link from 'next/link'

import type { Locale } from '../../dominio/idioma'
import type { Miga } from '../datos/tipos'
import { textos } from '../textos'

// Migas visibles (spec §7). La página pasa las mismas migas a migasLd.
export function Migas({ lang, migas }: { lang: Locale; migas: Miga[] }) {
  return (
    <nav className="migas" aria-label={textos(lang).migas.etiqueta}>
      {migas.map((m, i) =>
        i === migas.length - 1 ? (
          <span key={m.ruta} aria-current="page">{m.nombre}</span>
        ) : (
          <span key={m.ruta}>
            <Link href={m.ruta}>{m.nombre}</Link> <span aria-hidden="true">›</span>
          </span>
        ),
      )}
    </nav>
  )
}
```

```tsx
// src/app/(sitio)/[lang]/layout.tsx
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { esLocale, LOCALES } from '../../../dominio/idioma'
import { guiaIndexable, sitioUrl } from '../../../sitio/entorno'
import '../../../sitio/estilos/base.css'

const consola = localFont({ src: '../../../sitio/fuentes/ConsolaMono-Bold.woff2', weight: '700', display: 'swap', variable: '--fuente-titulo' })

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(sitioUrl()),
    title: { template: '%s · Guía de la Baja', default: 'Guía de la Baja' },
    // Spec §9: con GUIA_INDEXABLE distinto de true, ninguna página se indexa (las páginas pueden endurecerlo, no aflojarlo).
    robots: guiaIndexable() ? undefined : { index: false, follow: true },
  }
}

export default async function LayoutRaiz({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  return (
    <html lang={lang} className={consola.variable}>
      <body>{children}</body>
    </html>
  )
}
```

```tsx
// src/app/(sitio)/[lang]/guia/layout.tsx
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { esLocale } from '../../../../dominio/idioma'
import { zonasActivasCacheadas } from '../../../../sitio/datos/cacheadas'
import { Cabecera } from '../../../../sitio/ui/Cabecera'
import { Pie } from '../../../../sitio/ui/Pie'

// Marco de toda página de la guía: así el 404 y el error también salen con cabecera y pie, en su idioma.
// `idioma` es opcional: el slot @idioma llega en la Task 9 y el tipo que Next genera para el build solo incluye los
// slots que existen en disco.
export default async function LayoutGuia(props: { children: ReactNode; idioma?: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await props.params
  if (!esLocale(lang)) notFound()
  const zonas = await zonasActivasCacheadas(lang)
  return (
    <>
      <Cabecera lang={lang} zonas={zonas} idioma={props.idioma} />
      <main id="contenido">{props.children}</main>
      <Pie lang={lang} />
    </>
  )
}
```

```tsx
// src/app/(sitio)/[lang]/guia/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { esLocale, LOCALES } from '../../../../dominio/idioma'
import { rutas } from '../../../../dominio/rutas'
import { ajustesCacheados, categoriasCacheadas, zonasActivasCacheadas } from '../../../../sitio/datos/cacheadas'
import { guiaIndexable, sitioUrl } from '../../../../sitio/entorno'
import '../../../../sitio/estilos/portada.css'
import { migasLd } from '../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../sitio/seo/metadatos'
import { textos } from '../../../../sitio/textos'
import { JsonLd } from '../../../../sitio/ui/JsonLd'

export const revalidate = 3600

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!esLocale(lang)) return {}
  const a = await ajustesCacheados(lang)
  const t = textos(lang).portada
  const indexable = guiaIndexable()
  return metadatos({
    lang,
    titulo: a.portadaTitulo ?? t.titulo,
    descripcion: a.portadaIntro ?? t.intro,
    ruta: rutas.portada(lang),
    indexable,
    versiones: LOCALES.map((l) => ({ lang: l, ruta: rutas.portada(l), indexable })),
  })
}

// Portada mínima de F3a (zonas y categorías de c-portada.html). F3b agrega destacados, eventos y artículos.
export default async function Portada({ params }: Props) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  const [ajustes, zonas, cats] = await Promise.all([ajustesCacheados(lang), zonasActivasCacheadas(lang), categoriasCacheadas(lang)])
  const t = textos(lang)
  return (
    <div className="ancho">
      <section className="encabezado" aria-labelledby="titulo">
        <h1 id="titulo" className="t-pagina">{ajustes.portadaTitulo ?? t.portada.titulo}</h1>
        <p>{ajustes.portadaIntro ?? t.portada.intro}</p>
      </section>
      <section className="seccion" aria-labelledby="t-zonas">
        <div className="seccion__cabeza"><h2 id="t-zonas" className="t-seccion">{t.portada.zonas}</h2></div>
        <div className="zonas-rejilla">
          {zonas.map((z) => (
            <Link key={z.id} className="zona-tarjeta tarjeta presionable" href={rutas.zona(lang, z.slug)}>
              <div className="media">{z.foto && <img src={z.foto.src} srcSet={z.foto.srcset} sizes="(min-width: 720px) 33vw, 100vw" alt="" loading="lazy" />}</div>
              <span className="flecha" aria-hidden="true">→</span>
              <div className="velo-texto">
                <h3>{z.nombre}</h3>
                {z.descripcion && <p>{z.descripcion}</p>}
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="seccion" aria-labelledby="t-cat">
        <div className="seccion__cabeza"><h2 id="t-cat" className="t-seccion">{t.portada.categorias}</h2></div>
        <div className="categorias">
          {cats
            .filter((c) => c.aplicaA !== 'evento')
            .map((c) => (
              <Link key={c.id} className={`cat ${c.claseGrupo} presionable`} href={rutas.categoria(lang, c.slug)}>
                <strong>{c.nombre}</strong>
              </Link>
            ))}
        </div>
      </section>
      <JsonLd datos={migasLd([{ nombre: t.migas.guia, ruta: rutas.portada(lang) }], sitioUrl())} />
    </div>
  )
}
```

- [ ] **Step 4: Run tests and build to verify**

Run: `npm run test:unit -- tests/unit/textos.test.ts`, `npm run typecheck`, `npm run lint` y `npm run build` (con Docker arriba)
Expected: PASS; el build termina y lista las rutas `/[lang]/guia`.

- [ ] **Step 5: Commit**

```bash
git add src/sitio src/app/'(sitio)' public/guia-assets eslint.config.mjs tests/unit/textos.test.ts
git commit -m "feat: esqueleto del sitio público con cabecera, pie y portada mínima

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Idioma y puente por página (slot `@idioma`)

**Files:**
- Create: `src/sitio/contexto.ts`, `src/sitio/ui/SelectorIdioma.tsx`, `src/sitio/ui/Puente.tsx`, `src/app/(sitio)/[lang]/guia/@idioma/page.tsx`, `src/app/(sitio)/[lang]/guia/@idioma/[...resto]/page.tsx`, `src/app/(sitio)/[lang]/guia/@idioma/default.tsx`
- Test: `tests/unit/contexto.test.ts`

**Interfaces:**
- Consumes: `zonasActivasCacheadas`, `categoriasCacheadas` (Task 5); `textos`, `sitioUrl` (Tasks 7, 8).
- Produces:
  - `type Contexto = { alterno: string; zona: ZonaPublica | null }`.
  - `contextoDe(lang: Locale, segmentos: string[]): Promise<Contexto>`. Los segmentos son los del árbol en español, después de `guia`.
  - `DOCUMENTOS`: registro dentro de `contexto.ts` donde F3b agrega `lugares`, `eventos` y `articulos` como `(lang, [slug]) => Promise<Contexto | null>`.
  - `<SelectorIdioma lang alterno />` y `<Puente lang zona />`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/contexto.test.ts
import { describe, expect, it, vi } from 'vitest'

const zona = (id: number, slug: string, nombre: string, sedeSlug: string | null = null) =>
  ({ id, slug, nombre, sedeSlug, descripcion: null, coordenadas: null, foto: null, orden: 1 })
const cat = (id: number, slug: string) => ({ id, slug, nombre: slug, grupo: 'mar', claseGrupo: 'g-mar', aplicaA: 'lugar', tipoSchema: 'Beach', orden: 1 })

vi.mock('../../src/sitio/datos/cacheadas', () => ({
  zonasActivasCacheadas: async (lang: string) =>
    lang === 'es' ? [zona(1, 'la-paz', 'La Paz', 'la-paz'), zona(2, 'solo-es', 'Solo ES')] : [zona(1, 'la-paz', 'La Paz', 'la-paz')],
  categoriasCacheadas: async (lang: string) => (lang === 'es' ? [cat(5, 'playas'), cat(6, 'solo-es')] : [cat(5, 'beaches')]),
}))

const { contextoDe } = await import('../../src/sitio/contexto')

describe('contextoDe (spec §7: cambio de idioma y puente)', () => {
  it('portada y páginas fijas', async () => {
    expect(await contextoDe('es', [])).toEqual({ alterno: '/en/guide', zona: null })
    expect(await contextoDe('en', ['eventos'])).toEqual({ alterno: '/es/guia/eventos', zona: null })
    expect(await contextoDe('es', ['eventos', '--pagina', '2'])).toEqual({ alterno: '/en/guide/events', zona: null })
    expect(await contextoDe('es', ['privacidad'])).toEqual({ alterno: '/en/guide/privacy', zona: null })
  })

  it('zona y zona × categoría, con la zona para el puente', async () => {
    expect(await contextoDe('es', ['la-paz'])).toMatchObject({ alterno: '/en/guide/la-paz', zona: { slug: 'la-paz' } })
    expect((await contextoDe('es', ['la-paz', 'playas'])).alterno).toBe('/en/guide/la-paz/beaches')
    expect((await contextoDe('es', ['la-paz', 'solo-es'])).alterno).toBe('/en/guide/la-paz')
  })

  it('categoría en todas las zonas', async () => {
    expect((await contextoDe('es', ['categoria', 'playas'])).alterno).toBe('/en/guide/category/beaches')
    expect((await contextoDe('es', ['categoria', 'solo-es'])).alterno).toBe('/en/guide')
  })

  it('lo que no existe en el otro idioma va a su portada', async () => {
    expect(await contextoDe('es', ['solo-es'])).toMatchObject({ alterno: '/en/guide' })
    expect(await contextoDe('es', ['no-existe'])).toEqual({ alterno: '/en/guide', zona: null })
    expect(await contextoDe('es', ['--'])).toEqual({ alterno: '/en/guide', zona: null })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/contexto.test.ts`
Expected: FAIL (no existe `src/sitio/contexto`).

- [ ] **Step 3: Write the implementation**

```ts
// src/sitio/contexto.ts
import { otroIdioma, type Locale } from '../dominio/idioma'
import { rutas, SEGMENTOS } from '../dominio/rutas'
import { categoriasCacheadas, zonasActivasCacheadas } from './datos/cacheadas'
import type { ZonaPublica } from './datos/tipos'

export type Contexto = { alterno: string; zona: ZonaPublica | null }
type Resolutor = (lang: Locale, resto: string[]) => Promise<Contexto | null>

// Documentos con slug propio. F3b agrega aquí lugares, eventos y artículos.
const DOCUMENTOS: Partial<Record<string, Resolutor>> = {}

const FIJAS: Record<string, (l: Locale) => string> = {
  [SEGMENTOS.es.eventos]: rutas.eventos,
  [SEGMENTOS.es.negocios]: rutas.negocios,
  [SEGMENTOS.es.privacidad]: rutas.privacidad,
  [SEGMENTOS.es.buscar]: rutas.buscar,
}

const interno = (s: string | undefined) => s === undefined || s.startsWith('--')

async function slugDeCategoriaEn(lang: Locale, slug: string): Promise<string | null> {
  const c = (await categoriasCacheadas(lang)).find((x) => x.slug === slug)
  if (!c) return null
  return (await categoriasCacheadas(otroIdioma(lang))).find((x) => x.id === c.id)?.slug ?? null
}

// Spec §7: «El cambio de idioma lleva al mismo documento en el otro idioma; si no existe, a la portada de la guía
// en ese idioma». También da la zona de la página para el puente a reservas. `segmentos`: árbol en español tras «guia».
export async function contextoDe(lang: Locale, segmentos: string[]): Promise<Contexto> {
  const destino = otroIdioma(lang)
  const portada: Contexto = { alterno: rutas.portada(destino), zona: null }
  const [primero, segundo] = segmentos
  if (interno(primero)) return portada

  const fija = FIJAS[primero]
  if (fija && interno(segundo)) return { alterno: fija(destino), zona: null }

  const documento = DOCUMENTOS[primero]
  if (documento && !interno(segundo)) return (await documento(lang, segmentos.slice(1))) ?? portada

  if (primero === SEGMENTOS.es.categoria) {
    const slug = segundo && !interno(segundo) ? await slugDeCategoriaEn(lang, segundo) : null
    return slug ? { alterno: rutas.categoria(destino, slug), zona: null } : portada
  }

  const zona = (await zonasActivasCacheadas(lang)).find((z) => z.slug === primero) ?? null
  if (!zona) return portada
  const existeEnDestino = (await zonasActivasCacheadas(destino)).some((z) => z.id === zona.id)
  if (!existeEnDestino) return { ...portada, zona }
  if (interno(segundo)) return { alterno: rutas.zona(destino, zona.slug), zona }
  // F3b: si la combinación no tiene lugares en el otro idioma, cae a la zona.
  const slugCat = await slugDeCategoriaEn(lang, segundo)
  return { alterno: slugCat ? rutas.categoriaEnZona(destino, zona.slug, slugCat) : rutas.zona(destino, zona.slug), zona }
}
```

```tsx
// src/sitio/ui/SelectorIdioma.tsx
import { LOCALES, type Locale } from '../../dominio/idioma'
import { textos } from '../textos'

// El link del otro idioma viene resuelto del servidor (contextoDe): el HTML cacheado no depende de JavaScript.
export function SelectorIdioma({ lang, alterno }: { lang: Locale; alterno: string }) {
  return (
    <div className="idiomas" role="group" aria-label={textos(lang).cabecera.idioma}>
      {LOCALES.map((l) =>
        l === lang ? (
          <a key={l} aria-current="true" lang={l}>{l.toUpperCase()}</a>
        ) : (
          <a key={l} href={alterno} lang={l} hrefLang={l}>{l.toUpperCase()}</a>
        ),
      )}
    </div>
  )
}
```

```tsx
// src/sitio/ui/Puente.tsx
import type { Locale } from '../../dominio/idioma'
import type { ZonaPublica } from '../datos/tipos'
import { sitioUrl } from '../entorno'
import { textos } from '../textos'

// Único link a reservas de la cabecera (spec §7): nombra su destino y conoce la zona. Atribución y evento: spec §13.
export function Puente({ lang, zona }: { lang: Locale; zona: ZonaPublica | null }) {
  const t = textos(lang).cabecera
  const conSede = zona?.sedeSlug ? zona : null
  const href = conSede
    ? `${sitioUrl()}/${lang}/sede/${conSede.sedeSlug}?desde=guia&pieza=cabecera`
    : `${sitioUrl()}/${lang}?desde=guia&pieza=cabecera`
  return (
    <a className="puente presionable" href={href} data-evento="tour_clic" data-zona={zona?.slug ?? ''} data-origen="cabecera">
      <span className="puente__largo">{conSede ? t.toursEn(conSede.nombre) : t.toursEnLaBaja}</span>
      <span className="puente__corto">{t.tours}</span>
      <span aria-hidden="true">→</span>
    </a>
  )
}
```

```tsx
// src/app/(sitio)/[lang]/guia/@idioma/page.tsx
import { esLocale } from '../../../../../dominio/idioma'
import { contextoDe } from '../../../../../sitio/contexto'
import { Puente } from '../../../../../sitio/ui/Puente'
import { SelectorIdioma } from '../../../../../sitio/ui/SelectorIdioma'

export default async function IdiomaPortada({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!esLocale(lang)) return null
  const c = await contextoDe(lang, [])
  return (
    <>
      <SelectorIdioma lang={lang} alterno={c.alterno} />
      <Puente lang={lang} zona={c.zona} />
    </>
  )
}
```

```tsx
// src/app/(sitio)/[lang]/guia/@idioma/[...resto]/page.tsx
import { esLocale } from '../../../../../../dominio/idioma'
import { contextoDe } from '../../../../../../sitio/contexto'
import { Puente } from '../../../../../../sitio/ui/Puente'
import { SelectorIdioma } from '../../../../../../sitio/ui/SelectorIdioma'

// Mismo nombre de parámetro que el catch-all de children (validateAppPaths de Next 16). Next lo usa para toda ruta
// de children sin página propia en el slot y le pasa `resto` con los segmentos internos (tras el rewrite del proxy).
export default async function IdiomaResto({ params }: { params: Promise<{ lang: string; resto: string[] }> }) {
  const { lang, resto } = await params
  if (!esLocale(lang)) return null
  const c = await contextoDe(lang, resto)
  return (
    <>
      <SelectorIdioma lang={lang} alterno={c.alterno} />
      <Puente lang={lang} zona={c.zona} />
    </>
  )
}
```

```tsx
// src/app/(sitio)/[lang]/guia/@idioma/default.tsx
import { esLocale, otroIdioma } from '../../../../../dominio/idioma'
import { rutas } from '../../../../../dominio/rutas'
import { Puente } from '../../../../../sitio/ui/Puente'
import { SelectorIdioma } from '../../../../../sitio/ui/SelectorIdioma'

export default async function IdiomaRespaldo({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!esLocale(lang)) return null
  return (
    <>
      <SelectorIdioma lang={lang} alterno={rutas.portada(otroIdioma(lang))} />
      <Puente lang={lang} zona={null} />
    </>
  )
}
```

- [ ] **Step 4: Run tests and build to verify**

Run: `npm run test:unit -- tests/unit/contexto.test.ts`, `npm run typecheck`, `npm run lint` y `npm run build`
Expected: PASS. El build no muestra «You cannot define a route with the same specificity» ni «Ambiguous app routes».

- [ ] **Step 5: Commit**

```bash
git add src/sitio/contexto.ts src/sitio/ui/SelectorIdioma.tsx src/sitio/ui/Puente.tsx src/app/'(sitio)'/'[lang]'/guia/@idioma tests/unit/contexto.test.ts
git commit -m "feat: cambio de idioma y puente a reservas resueltos en el servidor por página

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 404, errores y redirecciones antes del 404

**Files:**
- Create: `src/sitio/redirigir.ts`, `src/sitio/ui/NoEncontrado.tsx`, `src/sitio/ui/ErrorGuia.tsx`, `src/sitio/estilos/no-encontrado.css`, `src/app/(sitio)/[lang]/guia/not-found.tsx`, `src/app/(sitio)/[lang]/guia/error.tsx`, `src/app/(sitio)/[lang]/error.tsx`, `src/app/(sitio)/[lang]/guia/[...resto]/page.tsx`
- Test: `tests/unit/redirigir.test.ts`

**Interfaces:**
- Consumes: `rutaPublicaDesdeArbol` (Task 2); `mapaRedireccionesCacheado` (Task 5); `textos` (Task 8).
- Produces: `noEncontrado(lang: Locale, segmentos: string[]): Promise<never>`. Las páginas de F3b la llaman cuando no encuentran su documento (spec §6, «Redirecciones»).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/redirigir.test.ts
import { describe, expect, it, vi } from 'vitest'

const permanentRedirect = vi.fn((url: string) => {
  throw new Error(`308 ${url}`)
})
const notFound = vi.fn(() => {
  throw new Error('404')
})
vi.mock('next/navigation', () => ({ permanentRedirect: (u: string) => permanentRedirect(u), notFound: () => notFound() }))
vi.mock('../../src/sitio/datos/cacheadas', () => ({
  mapaRedireccionesCacheado: async () => ({ '/en/guide/places/viejo': '/en/guide/places/nuevo' }),
}))

const { noEncontrado } = await import('../../src/sitio/redirigir')

describe('noEncontrado: redirecciones antes del 404 (spec §6)', () => {
  it('arma la ruta pública desde el árbol y redirige 308', async () => {
    await expect(noEncontrado('en', ['lugares', 'viejo'])).rejects.toThrow('308 /en/guide/places/nuevo')
  })

  it('sin redirección, 404', async () => {
    await expect(noEncontrado('es', ['lugares', 'otro'])).rejects.toThrow('404')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/redirigir.test.ts`
Expected: FAIL (no existe `src/sitio/redirigir`).

- [ ] **Step 3: Write the implementation**

```ts
// src/sitio/redirigir.ts
import { notFound, permanentRedirect } from 'next/navigation'

import type { Locale } from '../dominio/idioma'
import { rutaPublicaDesdeArbol } from '../dominio/rutas-publicas'
import { mapaRedireccionesCacheado } from './datos/cacheadas'

// Spec §6: cuando una ruta no encuentra su documento, consulta las Redirecciones antes de dar 404.
// Las redirecciones guardan la ruta pública; las páginas reciben el árbol en español (proxy): se arma la inversa.
export async function noEncontrado(lang: Locale, segmentos: string[]): Promise<never> {
  const destino = (await mapaRedireccionesCacheado())[rutaPublicaDesdeArbol(lang, segmentos)]
  if (destino) permanentRedirect(destino)
  notFound()
}
```

`src/sitio/estilos/no-encontrado.css` es el contenido del `<style>` de `docs/diseno/propuestas/c-404.html` (de `.perdido` a `.salidas div`), sin la etiqueta `<style>`.

```tsx
// src/sitio/ui/NoEncontrado.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { esLocale } from '../../dominio/idioma'
import { rutas } from '../../dominio/rutas'
import '../estilos/no-encontrado.css'
import { textos } from '../textos'

// not-found no recibe props: el idioma sale de split('/')[1] (en el servidor la ruta es la interna; el idioma es el mismo).
export function NoEncontrado() {
  const seg = usePathname().split('/')[1]
  const lang = esLocale(seg) ? seg : 'es'
  const t = textos(lang).noEncontrado
  return (
    <div className="ancho">
      <section className="perdido" aria-labelledby="titulo">
        <p className="cifra404" aria-hidden="true">404</p>
        <div className="texto404">
          <h1 id="titulo">{t.titulo}</h1>
          <p>{t.texto}</p>
          <form className="busca-404" role="search" action={rutas.buscar(lang)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <label className="solo-lector" htmlFor="q404">{textos(lang).cabecera.buscar}</label>
            <input id="q404" name="q" type="search" placeholder={textos(lang).cabecera.ejemplo} />
            <button type="submit">{t.buscar}</button>
          </form>
          <div className="salidas">
            <h2>{t.empieza}</h2>
            <div>
              <Link className="chip presionable" href={rutas.portada(lang)}>{t.portada}</Link>
              <Link className="chip presionable" href={rutas.eventos(lang)}>{t.eventos}</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
```

```tsx
// src/sitio/ui/ErrorGuia.tsx
'use client'

import { usePathname } from 'next/navigation'

import { esLocale } from '../../dominio/idioma'
import { rutas } from '../../dominio/rutas'
import '../estilos/no-encontrado.css'
import { textos } from '../textos'

// Sin datos: si falló la base, esto todavía se pinta.
export function ErrorGuia({ reintentar }: { reintentar: () => void }) {
  const seg = usePathname().split('/')[1]
  const lang = esLocale(seg) ? seg : 'es'
  const t = textos(lang).error
  return (
    <div className="ancho">
      <section className="perdido" role="alert">
        <div className="texto404">
          <h1>{t.titulo}</h1>
          <p>{t.texto}</p>
          <div className="salidas">
            <div>
              <button className="chip presionable" type="button" onClick={reintentar}>{t.reintentar}</button>
              <a className="chip presionable" href={rutas.portada(lang)}>{t.portada}</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
```

```tsx
// src/app/(sitio)/[lang]/guia/not-found.tsx
import { NoEncontrado } from '../../../../sitio/ui/NoEncontrado'

export default function NoEncontradoGuia() {
  return <NoEncontrado />
}
```

```tsx
// src/app/(sitio)/[lang]/guia/error.tsx
'use client'

import { ErrorGuia } from '../../../../sitio/ui/ErrorGuia'

export default function ErrorDeLaGuia({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorGuia reintentar={reset} />
}
```

```tsx
// src/app/(sitio)/[lang]/error.tsx
'use client'

import { ErrorGuia } from '../../../sitio/ui/ErrorGuia'

// Atrapa los errores del layout de guia (p. ej. la base caída con la caché vacía): se pinta sin cabecera.
export default function ErrorDelMarco({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorGuia reintentar={reset} />
}
```

```tsx
// src/app/(sitio)/[lang]/guia/[...resto]/page.tsx
import { notFound } from 'next/navigation'

import { esLocale } from '../../../../../dominio/idioma'
import { noEncontrado } from '../../../../../sitio/redirigir'

// Toda ruta de la guía sin página propia. Dinámica: una URL inventada no crea entradas ISR; solo usa el mapa
// de redirecciones ya cacheado.
export const dynamic = 'force-dynamic'

export default async function Resto({ params }: { params: Promise<{ lang: string; resto: string[] }> }) {
  const { lang, resto } = await params
  if (!esLocale(lang)) notFound()
  return noEncontrado(lang, resto)
}
```

- [ ] **Step 4: Run tests and build to verify**

Run: `npm run test:unit -- tests/unit/redirigir.test.ts`, `npm run typecheck`, `npm run lint` y `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sitio/redirigir.ts src/sitio/ui/NoEncontrado.tsx src/sitio/ui/ErrorGuia.tsx src/sitio/estilos/no-encontrado.css src/app/'(sitio)' tests/unit/redirigir.test.ts
git commit -m "feat: 404 y errores por idioma, y redirecciones antes del 404

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Verificación completa contra un build de producción

**Files:**
- Ninguno nuevo: solo verificación, y corrección si algo falla.

- [ ] **Step 1: Suite completa como en el CI**

```bash
docker compose up -d
npm run generate:types && npm run generate:importmap
git status --short src/payload-types.ts "src/app/(payload)/admin/importMap.js"
npm run typecheck && npm run lint && npm run test:unit && npm run test:int
npx payload migrate:create comprobacion --skip-empty
test -z "$(git status --porcelain -- src/migrations)" && echo "esquema al día"
```

Expected:

- `git status` no muestra cambios en tipos ni en el importMap.
- Todo pasa sin errores.
- Se imprime `esquema al día`; este plan no cambia el esquema.

- [ ] **Step 2: Build y servidor con datos del seed**

```bash
SEED_PERMITIDO=true SEED_CONTRASENA_ADMIN='contrasena-local-larga' npm run seed
npm run build
GUIA_PROXY_SECRET=secreto-local npx next start -p 3100
```

Deja el servidor corriendo (en segundo plano) y, en otra terminal:

```bash
B=http://localhost:3100
curl -sI $B/es/guia | grep -iE '^HTTP/|x-guia-origen|x-robots-tag'
curl -sI -H 'x-guia-proxy: secreto-local' -H 'x-guia-ip: 1.2.3.4' $B/es/guia | grep -iE '^HTTP/|x-guia-origen|x-robots-tag'
curl -s $B/en/guide | grep -o '<html lang="en"'
curl -s $B/es/guia | grep -o 'href="/en/guide"'
curl -s -o /dev/null -w '%{http_code}\n' $B/en/guia
curl -s -o /dev/null -w '%{http_code}\n' $B/es/guia/no-existe/de-verdad
curl -s $B/es/guia/no-existe/de-verdad | grep -o 'Esta página se fue al mar'
curl -sI "$B/es/guia/eventos?pagina=1" | grep -iE '^HTTP/|^location'
curl -sI $B/admin | grep -i x-robots-tag
```

Expected, en orden:

1. `200`, `x-guia-origen: directo` y `X-Robots-Tag: noindex`.
2. `200` y `x-guia-origen: publico`, sin `X-Robots-Tag`.
3. `<html lang="en"`.
4. `href="/en/guide"` (el selector de idioma).
5. `404`.
6. `404`.
7. `Esta página se fue al mar`.
8. `308` con `location: /es/guia/eventos`.
9. `X-Robots-Tag: noindex`.

Detén el servidor al terminar.

- [ ] **Step 3: Commit (solo si hubo correcciones)**

```bash
git add -A src tests
git commit -m "fix: ajustes de la verificación de la base del sitio público

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<!-- plan-review: APPROVED (2026-11-04) -->
