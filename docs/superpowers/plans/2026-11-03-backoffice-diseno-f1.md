# Backoffice para el diseño de F1: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el backoffice guarde todo lo que muestran las pantallas aprobadas de F1 (propuesta C).

**Architecture:** Cambios de esquema en Payload sobre las colecciones de F2: campos nuevos en Categorías,
Lugares, Eventos, Artículos y el Global, dos colecciones nuevas (Textos de zona × categoría y Fotos de tours),
dos hooks de Artículos (fechas de publicación y `lugaresCitados`) y la ruta de búsqueda. Las listas cerradas y
la lectura del cuerpo Lexical viven en `src/dominio/` (puras, con pruebas unitarias). Como no hay deploy a
producción, cada tarea rehace la única migración `inicial`.

**Tech Stack:** Payload 3.92.1, Next.js 16.4.3, Postgres 17 + PostGIS (Docker, puerto 5433), Vitest, TypeScript.

**Spec:** `docs/specs/2026-10-30-guia-baja-design.md` (secciones 2, 6, 7, 8.1, 10, 12 y 13, actualizadas el
2026-11-03) y `docs/diseno/decisiones-frontend-backoffice.md`.

## Global Constraints

- Node 24.x desde 24.22.1, npm. Payload 3.92.1, Next.js 16.4.3. Versiones exactas en `package.json`; ninguna dependencia nueva.
- Hasta el primer deploy a producción hay **una sola** migración, `inicial`: `npm run migracion:regenerar -- --no-hay-deploy`.
- Nunca `push` de esquema; el adaptador va con `push: false`.
- Acceso negado por defecto: toda colección y campo sensible usa reglas de `src/acceso/reglas.ts`.
- Hooks: nunca llamar a la Local API pasando el `req` de la operación con otro `locale`. Lecturas por idioma: `req.payload.db.*`.
- URLs públicas solo desde `src/dominio/rutas.ts`.
- Importaciones dentro de `src/` relativas (no `@/`).
- Nunca datos reales en local, CI ni previews.
- Commits en español, terminados con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Antes de las pruebas de integración: `docker compose up -d` (Postgres en 5433, base `guia_test`).

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/dominio/rutas.ts` | Modificar | Segmento `buscar`/`search` y `rutas.buscar(l)` |
| `src/dominio/slugs.ts` | Modificar | `buscar` y `search` en `SLUGS_RESERVADOS_ZONA` |
| `src/dominio/grupos.ts` | Crear | Lista cerrada de grupos de color (`mar`, `aire-libre`, `comer-y-salir`, `lo-local`) |
| `src/dominio/caracteristicas.ts` | Crear | Lista cerrada de características de lugares |
| `src/dominio/lexical.ts` | Crear | `lugaresEnCuerpo(cuerpo)`: ids de lugares en bloques «Tarjeta de lugar» |
| `src/campos/destacado.ts` | Crear | `camposDestacado()`: `destacadoEnPortada` + `ordenDestacado` |
| `src/hooks/articulos.ts` | Crear | `fechasDePublicacion` y `llenarLugaresCitados` (hooks beforeChange) |
| `src/collections/Categorias.ts` | Modificar | Campo `grupo` (obligatorio) |
| `src/collections/Lugares.ts` | Modificar | `caracteristicas`, `camposDestacado()` |
| `src/collections/Eventos.ts` | Modificar | `categorias` obligatoria, `camposDestacado()` |
| `src/collections/Articulos.ts` | Modificar | `categorias`, `lugaresCitados`, `camposDestacado()`, hooks de fechas |
| `src/collections/TextosZonaCategoria.ts` | Crear | Colección `textos-zona-categoria` (índice único zona+categoría) |
| `src/collections/FotosTours.ts` | Crear | Colección `fotos-tours` (índice único sedeSlug+tipo+slug) |
| `src/globals/AjustesGuia.ts` | Modificar | `avisoPrivacidad`, `avisoVigenteDesde`; `correoPrivacidad` público |
| `src/payload.config.ts` | Modificar | Registrar las dos colecciones nuevas |
| `src/seed/vaciar.ts` | Modificar | Vaciar las colecciones nuevas antes que sus referencias |
| `src/seed/datos.ts` | Modificar | `grupo` en las categorías del seed |
| `src/migrations/*` | Regenerar | Única migración `inicial` |
| `src/payload-types.ts`, `src/app/(payload)/admin/importMap.js` | Regenerar | Tipos e importMap |
| `tests/int/utils.ts` | Modificar | `crearCategoria` con `grupo` |
| `tests/unit/rutas.test.ts`, `tests/unit/slugs.test.ts` | Modificar | Ruta de búsqueda y vínculo segmentos ↔ reservados |
| `tests/unit/lexical.test.ts` | Crear | `lugaresEnCuerpo` |
| `tests/int/diseno-f1.int.test.ts` | Crear | Integración de todos los campos, colecciones y hooks nuevos |
| `tests/int/articulos-solicitudes.int.test.ts` | Modificar | `correoPrivacidad` ahora es público |

<!-- arch-critic: APPROVED (revisión adversarial hecha en línea: dependencias hacia src/dominio sin ciclos;
hooks sin Local API con otro locale; índices compuestos en BD para las dos colecciones nuevas; vaciar.ts y
seed actualizados para los campos obligatorios nuevos; revalidación de lugares citados anotada para F3) -->

## Notas para F3 (no se implementan aquí)

- Al publicar o borrar un artículo hay que revalidar `lugar:{id}` de los `lugaresCitados` viejos y nuevos.
- Las etiquetas de caché `textos:{zona}:{categoria}` y `tours-fotos` (spec §10) se revalidan desde hooks de
  las dos colecciones nuevas cuando exista la revalidación de F3.

---

### Task 1: Ruta de búsqueda y slugs reservados

**Files:**
- Modify: `src/dominio/rutas.ts`
- Modify: `src/dominio/slugs.ts`
- Test: `tests/unit/rutas.test.ts`, `tests/unit/slugs.test.ts`

**Interfaces:**
- Produces: `rutas.buscar(l: Locale): string` → `/es/guia/buscar`, `/en/guide/search`; `SEGMENTOS[l].buscar`.

- [ ] **Step 1: Write the failing tests**

En `tests/unit/rutas.test.ts`, dentro del `it.each([...])`, después de `[rutas.privacidad('en'), '/en/guide/privacy'],` agrega:

```ts
    [rutas.buscar('es'), '/es/guia/buscar'],
    [rutas.buscar('en'), '/en/guide/search'],
```

Al final de `tests/unit/slugs.test.ts` agrega:

```ts
import { SEGMENTOS } from '../../src/dominio/rutas'
import { SLUGS_RESERVADOS_ZONA } from '../../src/dominio/slugs'

describe('segmentos de la guía y slugs reservados de zona', () => {
  it('ningún segmento de la guía puede ser el slug de una zona', () => {
    for (const idioma of ['es', 'en'] as const) {
      for (const [clave, segmento] of Object.entries(SEGMENTOS[idioma])) {
        if (clave === 'guia') continue
        expect(SLUGS_RESERVADOS_ZONA, `${idioma}.${clave}`).toContain(segmento)
      }
    }
  })
})
```

(Si `describe`, `expect` o `it` ya se importan arriba del archivo, no los repitas; mueve los dos `import` nuevos al bloque de imports.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/rutas.test.ts tests/unit/slugs.test.ts`
Expected: FAIL (`rutas.buscar is not a function`).

- [ ] **Step 3: Implement**

En `src/dominio/rutas.ts`, agrega `buscar` a los dos idiomas de `SEGMENTOS`:

```ts
  es: {
    guia: 'guia', lugares: 'lugares', eventos: 'eventos', articulos: 'articulos',
    categoria: 'categoria', negocios: 'aparece-en-la-guia', privacidad: 'privacidad', buscar: 'buscar',
  },
  en: {
    guia: 'guide', lugares: 'places', eventos: 'events', articulos: 'articles',
    categoria: 'category', negocios: 'get-listed', privacidad: 'privacy', buscar: 'search',
  },
```

y en el objeto `rutas`, después de `privacidad`:

```ts
  buscar: (l: Locale) => `${base(l)}/${SEGMENTOS[l].buscar}`,
```

En `src/dominio/slugs.ts`:

```ts
export const SLUGS_RESERVADOS_ZONA = [
  'lugares', 'places', 'eventos', 'events', 'articulos', 'articles', 'categoria', 'category',
  'aparece-en-la-guia', 'get-listed', 'privacidad', 'privacy', 'buscar', 'search',
] as const
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/unit/rutas.test.ts tests/unit/slugs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dominio/rutas.ts src/dominio/slugs.ts tests/unit/rutas.test.ts tests/unit/slugs.test.ts
git commit -m "feat: ruta de búsqueda y sus slugs reservados de zona

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Grupo de color en Categorías

**Files:**
- Create: `src/dominio/grupos.ts`
- Modify: `src/collections/Categorias.ts`, `src/seed/datos.ts`, `tests/int/utils.ts`
- Create: `tests/int/diseno-f1.int.test.ts`
- Regenerate: `src/migrations/*`, `src/payload-types.ts`, importMap

**Interfaces:**
- Produces: `GRUPOS` (lista `{ valor, es, en }`), `type Grupo = 'mar' | 'aire-libre' | 'comer-y-salir' | 'lo-local'`; campo `categorias.grupo` obligatorio; `crearCategoria(payload, { es?, en?, grupo? })` (grupo por defecto `'mar'`).

- [ ] **Step 1: Write the failing test**

Crea `tests/int/diseno-f1.int.test.ts`:

```ts
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { crearCategoria, limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('Backoffice del diseño de F1', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  describe('Categorías: grupo de color', () => {
    it('guarda el grupo y el público lo lee', async () => {
      const c = await crearCategoria(payload, { grupo: 'comer-y-salir' })
      const publica = await payload.findByID({ collection: 'categorias', id: c.id, overrideAccess: false })
      expect(publica.grupo).toBe('comer-y-salir')
    })

    it('el grupo es obligatorio', async () => {
      await expect(
        payload.create({
          collection: 'categorias',
          locale: 'es',
          data: { nombre: 'Sin grupo', aplicaA: 'lugar', tipoSchema: 'LocalBusiness' } as never,
          overrideAccess: true,
        }),
      ).rejects.toThrow()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts`
Expected: FAIL (el grupo no existe / la creación sin grupo no falla).

- [ ] **Step 3: Implement**

Crea `src/dominio/grupos.ts`:

```ts
// Grupos de color de las categorías (docs/diseno/lineamientos.md, «Color por grupo de categorías»).
export const GRUPOS = [
  { valor: 'mar', es: 'Mar', en: 'Sea' },
  { valor: 'aire-libre', es: 'Aire libre', en: 'Outdoors' },
  { valor: 'comer-y-salir', es: 'Comer y salir', en: 'Eat and go out' },
  { valor: 'lo-local', es: 'Lo local', en: 'Local' },
] as const

export type Grupo = (typeof GRUPOS)[number]['valor']
```

En `src/collections/Categorias.ts`, importa `import { GRUPOS } from '../dominio/grupos'` y agrega después del campo `tipoSchema`:

```ts
    {
      name: 'grupo',
      type: 'select',
      required: true,
      options: GRUPOS.map((g) => ({ label: { es: g.es, en: g.en }, value: g.valor })),
      admin: { description: 'Decide el color de la categoría en el sitio.' },
    },
```

Agrega `'grupo'` a `admin.defaultColumns`: `['nombre', 'slug', 'grupo', 'aplicaA', 'orden']`.

En `tests/int/utils.ts`, cambia `crearCategoria`:

```ts
export async function crearCategoria(
  payload: Payload,
  datos: { es?: string; en?: string; grupo?: 'mar' | 'aire-libre' | 'comer-y-salir' | 'lo-local' } = {},
) {
  const sufijo = randomUUID().slice(0, 8)
  const es = datos.es ?? `categoria-${sufijo}`
  const en = datos.en ?? `category-${sufijo}`
  const doc = await payload.create({
    collection: 'categorias',
    locale: 'es',
    data: { nombre: es, slug: es, aplicaA: 'ambos', tipoSchema: 'LocalBusiness', grupo: datos.grupo ?? 'mar' },
    overrideAccess: true,
  })
  return payload.update({
    collection: 'categorias',
    id: doc.id,
    locale: 'en',
    data: { nombre: en, slug: en },
    overrideAccess: true,
  })
}
```

En `src/seed/datos.ts`, agrega `grupo` a cada categoría de `CATEGORIAS`:

```ts
const CATEGORIAS = [
  { es: 'Restaurantes', en: 'Restaurants', tipo: 'Restaurant', aplica: 'lugar', grupo: 'comer-y-salir' },
  { es: 'Cafés y bares', en: 'Cafes and bars', tipo: 'CafeOrCoffeeShop', aplica: 'lugar', grupo: 'comer-y-salir' },
  { es: 'Actividades', en: 'Activities', tipo: 'TouristAttraction', aplica: 'ambos', grupo: 'aire-libre' },
  { es: 'Playas', en: 'Beaches', tipo: 'Beach', aplica: 'lugar', grupo: 'mar' },
  { es: 'Tiendas locales', en: 'Local shops', tipo: 'Store', aplica: 'lugar', grupo: 'lo-local' },
  { es: 'Mercados', en: 'Markets', tipo: 'LocalBusiness', aplica: 'ambos', grupo: 'lo-local' },
  { es: 'Cultura', en: 'Culture', tipo: 'TouristAttraction', aplica: 'ambos', grupo: 'lo-local' },
] as const
```

y en el `payload.create` de categorías: `data: { nombre: c.es, aplicaA: c.aplica, tipoSchema: c.tipo, grupo: c.grupo, orden: i + 1 },`.

- [ ] **Step 4: Regenerate migration, types and importMap**

```bash
npm run migracion:regenerar -- --no-hay-deploy
npm run generate:types
npm run generate:importmap
npm run typecheck
```
Expected: `typecheck` sin errores.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts tests/int/seed.int.test.ts tests/int/zonas-categorias.int.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/dominio/grupos.ts src/collections/Categorias.ts src/seed/datos.ts tests/int/utils.ts tests/int/diseno-f1.int.test.ts src/migrations src/payload-types.ts "src/app/(payload)/admin/importMap.js"
git commit -m "feat: grupo de color obligatorio en Categorías

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Características de lugares y «destacar en portada»

**Files:**
- Create: `src/dominio/caracteristicas.ts`, `src/campos/destacado.ts`
- Modify: `src/collections/Lugares.ts`, `src/collections/Eventos.ts`, `src/collections/Articulos.ts`
- Test: `tests/int/diseno-f1.int.test.ts`
- Regenerate: migración, tipos, importMap

**Interfaces:**
- Consumes: `crearCategoria`, `crearZona`, `crearImagen`, `crearLugar`, `lexical` de `tests/int/utils.ts`.
- Produces: `CARACTERISTICAS` (lista `{ valor, es, en }`), `type Caracteristica`; campo `lugares.caracteristicas` (select hasMany); `camposDestacado(): Field[]` → `destacadoEnPortada` (checkbox, índice) y `ordenDestacado` (number, por defecto 100) en Lugares, Eventos y Artículos.

- [ ] **Step 1: Write the failing tests**

En `tests/int/diseno-f1.int.test.ts`, cambia el import de utils a
`import { crearCategoria, crearImagen, crearLugar, crearUsuario, crearZona, lexical, limpiar, obtenerPayload } from './utils'`
y agrega dentro del `describe` principal:

```ts
  describe('Lugares: características y destacados', () => {
    it('guarda varias características y filtra por una', async () => {
      const zona = await crearZona(payload)
      const cat = await crearCategoria(payload)
      const foto = await crearImagen(payload)
      const l = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'playa-uno' })
      await payload.update({
        collection: 'lugares', id: l.id, locale: 'es',
        data: { caracteristicas: ['para-ninos', 'con-comida'] },
        overrideAccess: true, context: { sinRedirecciones: true },
      })
      const conComida = await payload.find({
        collection: 'lugares', locale: 'es', overrideAccess: false,
        where: { caracteristicas: { in: ['con-comida'] } },
      })
      expect(conComida.docs.map((d) => d.id)).toEqual([l.id])
    })

    it('rechaza una característica que no está en la lista', async () => {
      const zona = await crearZona(payload)
      const cat = await crearCategoria(payload)
      const foto = await crearImagen(payload)
      const l = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'playa-dos' })
      await expect(
        payload.update({
          collection: 'lugares', id: l.id, locale: 'es',
          data: { caracteristicas: ['con-alberca'] as never },
          overrideAccess: true, context: { sinRedirecciones: true },
        }),
      ).rejects.toThrow()
    })

    it('el público lee los destacados por su orden', async () => {
      const zona = await crearZona(payload)
      const cat = await crearCategoria(payload)
      const foto = await crearImagen(payload)
      const a = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'lugar-a' })
      const b = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'lugar-b' })
      await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'lugar-c' })
      for (const [id, orden] of [[a.id, 2], [b.id, 1]] as const) {
        await payload.update({
          collection: 'lugares', id, locale: 'es',
          data: { destacadoEnPortada: true, ordenDestacado: orden },
          overrideAccess: true, context: { sinRedirecciones: true },
        })
      }
      const destacados = await payload.find({
        collection: 'lugares', locale: 'es', overrideAccess: false,
        where: { destacadoEnPortada: { equals: true } }, sort: 'ordenDestacado',
      })
      expect(destacados.docs.map((d) => d.id)).toEqual([b.id, a.id])
    })

    it('eventos y artículos también se pueden destacar', async () => {
      const editor = await crearUsuario(payload, 'editor')
      const portada = await crearImagen(payload)
      const art = await payload.create({
        collection: 'articulos', locale: 'es',
        data: { titulo: 'Destacado', portada: portada.id, autor: editor.id, resumen: 'r', cuerpo: lexical('c'), destacadoEnPortada: true, _status: 'published' },
        overrideAccess: true,
      })
      expect(art.destacadoEnPortada).toBe(true)
      expect(art.ordenDestacado).toBe(100)
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts`
Expected: FAIL (campos inexistentes).

- [ ] **Step 3: Implement**

Crea `src/dominio/caracteristicas.ts`:

```ts
// Características de los lugares para el filtro ?caracteristica= (spec §6 y §7). Lista cerrada en código.
export const CARACTERISTICAS = [
  { valor: 'para-ninos', es: 'Para niños', en: 'Kid-friendly' },
  { valor: 'con-comida', es: 'Con comida', en: 'Food available' },
  { valor: 'solo-con-tour', es: 'Solo con tour', en: 'Tour only' },
] as const

export type Caracteristica = (typeof CARACTERISTICAS)[number]['valor']
```

Crea `src/campos/destacado.ts`:

```ts
import type { Field } from 'payload'

// «Destacar en portada» (spec §6, Reglas comunes): la portada muestra los destacados por ordenDestacado.
export function camposDestacado(): Field[] {
  return [
    {
      name: 'destacadoEnPortada',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', description: 'Sale en los destacados de la portada de la Guía.' },
    },
    {
      name: 'ordenDestacado',
      type: 'number',
      defaultValue: 100,
      admin: { position: 'sidebar', condition: (datos) => Boolean(datos?.destacadoEnPortada) },
    },
  ]
}
```

En `src/collections/Lugares.ts`: importa `CARACTERISTICAS` y `camposDestacado`; después de `notaHorario` agrega

```ts
    {
      name: 'caracteristicas',
      type: 'select',
      hasMany: true,
      options: CARACTERISTICAS.map((c) => ({ label: { es: c.es, en: c.en }, value: c.valor })),
    },
```

y después del campo `orden`: `...camposDestacado(),`.

En `src/collections/Eventos.ts` y `src/collections/Articulos.ts`: importa `camposDestacado` de `'../campos/destacado'` y agrega `...camposDestacado(),` justo antes de `camposSeo()` (en Artículos, antes de `camposSeo()` también).

- [ ] **Step 4: Regenerate migration, types and importMap**

```bash
npm run migracion:regenerar -- --no-hay-deploy
npm run generate:types
npm run generate:importmap
npm run typecheck
```
Expected: sin errores.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/dominio/caracteristicas.ts src/campos/destacado.ts src/collections/Lugares.ts src/collections/Eventos.ts src/collections/Articulos.ts tests/int/diseno-f1.int.test.ts src/migrations src/payload-types.ts "src/app/(payload)/admin/importMap.js"
git commit -m "feat: características de lugares y casilla «destacar en portada»

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Categorías en Artículos y obligatorias en Eventos

**Files:**
- Modify: `src/collections/Articulos.ts`, `src/collections/Eventos.ts`
- Test: `tests/int/diseno-f1.int.test.ts`
- Regenerate: migración, tipos, importMap

**Interfaces:**
- Produces: `articulos.categorias` (relación hasMany opcional a Categorías); `eventos.categorias` obligatoria (al menos 1).

- [ ] **Step 1: Write the failing tests**

Agrega dentro del `describe` principal de `tests/int/diseno-f1.int.test.ts`:

```ts
  describe('Categorías en artículos y eventos', () => {
    it('un artículo guarda sus categorías', async () => {
      const editor = await crearUsuario(payload, 'editor')
      const portada = await crearImagen(payload)
      const cat = await crearCategoria(payload, { grupo: 'comer-y-salir' })
      const art = await payload.create({
        collection: 'articulos', locale: 'es',
        data: { titulo: 'Pescado del día', portada: portada.id, autor: editor.id, resumen: 'r', cuerpo: lexical('c'), categorias: [cat.id], _status: 'published' },
        overrideAccess: true,
      })
      const leido = await payload.findByID({ collection: 'articulos', id: art.id, locale: 'es', depth: 0, overrideAccess: false })
      expect(leido.categorias).toEqual([cat.id])
    })

    it('un evento sin categoría no se guarda', async () => {
      const zona = await crearZona(payload)
      const foto = await crearImagen(payload)
      await expect(
        payload.create({
          collection: 'eventos', locale: 'es',
          data: {
            nombre: 'Sin categoría', zona: zona.id, direccionLibre: 'Malecón',
            inicio: '2026-11-14T18:00:00-07:00', inicio_tz: 'America/Mazatlan',
            fotos: [foto.id], resumen: 'r', cuerpo: lexical('c'), _status: 'published',
          } as never,
          overrideAccess: true,
        }),
      ).rejects.toThrow()
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

En `src/collections/Articulos.ts`, después del campo `zonas`:

```ts
    {
      name: 'categorias',
      type: 'relationship',
      relationTo: 'categorias',
      hasMany: true,
      admin: { description: 'La primera da la etiqueta y el color del artículo.' },
    },
```

En `src/collections/Eventos.ts`, reemplaza el campo `categorias` por:

```ts
    {
      name: 'categorias',
      type: 'relationship',
      relationTo: 'categorias',
      hasMany: true,
      required: true,
      minRows: 1,
      admin: { description: 'La primera da la etiqueta y el color del evento.' },
      filterOptions: { aplicaA: { in: ['evento', 'ambos'] } },
    },
```

- [ ] **Step 4: Regenerate migration, types and importMap**

```bash
npm run migracion:regenerar -- --no-hay-deploy
npm run generate:types
npm run generate:importmap
npm run typecheck
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts tests/int/lugares-eventos.int.test.ts tests/int/seed.int.test.ts tests/int/redirecciones.int.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/collections/Articulos.ts src/collections/Eventos.ts tests/int/diseno-f1.int.test.ts src/migrations src/payload-types.ts "src/app/(payload)/admin/importMap.js"
git commit -m "feat: categorías en artículos y obligatorias en eventos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Fechas de publicación de los artículos

**Files:**
- Create: `src/hooks/articulos.ts`
- Modify: `src/collections/Articulos.ts`
- Test: `tests/int/diseno-f1.int.test.ts`
- Regenerate: migración, tipos

**Interfaces:**
- Produces: `fechasDePublicacion: CollectionBeforeChangeHook` en `src/hooks/articulos.ts`. Regla: al guardar con `_status: 'published'`, `publicadoEl` se conserva si ya existe (o se fija ahora) y `actualizadoEl` = ahora. Un guardado como borrador no toca ninguna de las dos.

- [ ] **Step 1: Write the failing tests**

Agrega dentro del `describe` principal:

```ts
  describe('Artículos: fechas de publicación', () => {
    async function borrador() {
      const editor = await crearUsuario(payload, 'editor')
      const portada = await crearImagen(payload)
      return payload.create({
        collection: 'articulos', locale: 'es',
        data: { titulo: `Fechas ${Date.now()}`, portada: portada.id, autor: editor.id, resumen: 'r', cuerpo: lexical('c'), _status: 'draft' },
        overrideAccess: true,
      })
    }

    it('un borrador no tiene fechas de publicación', async () => {
      const a = await borrador()
      expect(a.publicadoEl ?? null).toBeNull()
      expect(a.actualizadoEl ?? null).toBeNull()
    })

    it('publicar fija las dos fechas; publicar un cambio solo mueve actualizadoEl', async () => {
      const a = await borrador()
      const pub = await payload.update({ collection: 'articulos', id: a.id, locale: 'es', data: { _status: 'published' }, overrideAccess: true })
      expect(pub.publicadoEl).toBeTruthy()
      expect(pub.actualizadoEl).toBeTruthy()
      await new Promise((r) => setTimeout(r, 20))
      const cambio = await payload.update({ collection: 'articulos', id: a.id, locale: 'es', data: { resumen: 'nuevo', _status: 'published' }, overrideAccess: true })
      expect(cambio.publicadoEl).toBe(pub.publicadoEl)
      expect(new Date(cambio.actualizadoEl as string).getTime()).toBeGreaterThan(new Date(pub.actualizadoEl as string).getTime())
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts`
Expected: FAIL (el borrador ya trae fechas por el `defaultValue`).

- [ ] **Step 3: Implement**

Crea `src/hooks/articulos.ts`:

```ts
import type { CollectionBeforeChangeHook } from 'payload'

// publicadoEl: la primera vez que se publica. actualizadoEl: cada vez que se publica un cambio (spec §6).
// Un guardado como borrador no toca ninguna de las dos.
export const fechasDePublicacion: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (data?._status !== 'published') return data
  const ahora = new Date().toISOString()
  return {
    ...data,
    publicadoEl: data.publicadoEl ?? originalDoc?.publicadoEl ?? ahora,
    actualizadoEl: ahora,
  }
}
```

En `src/collections/Articulos.ts`: importa `import { fechasDePublicacion } from '../hooks/articulos'`; cambia
`beforeChange: [copiarNombreAutor, redireccion.beforeChange]` por
`beforeChange: [copiarNombreAutor, fechasDePublicacion, redireccion.beforeChange]`; y reemplaza los dos campos de fecha por:

```ts
    { name: 'publicadoEl', type: 'date', admin: { position: 'sidebar', description: 'Se fija al publicar por primera vez.' } },
    { name: 'actualizadoEl', type: 'date', admin: { position: 'sidebar', readOnly: true, description: 'Se actualiza cada vez que se publica un cambio.' } },
```

- [ ] **Step 4: Regenerate migration and types**

```bash
npm run migracion:regenerar -- --no-hay-deploy
npm run generate:types
npm run typecheck
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts tests/int/articulos-solicitudes.int.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/articulos.ts src/collections/Articulos.ts tests/int/diseno-f1.int.test.ts src/migrations src/payload-types.ts
git commit -m "fix: publicadoEl y actualizadoEl de los artículos siguen a la publicación

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Lugares citados en los artículos

**Files:**
- Create: `src/dominio/lexical.ts`, `tests/unit/lexical.test.ts`
- Modify: `src/hooks/articulos.ts`, `src/collections/Articulos.ts`
- Test: `tests/int/diseno-f1.int.test.ts`
- Regenerate: migración, tipos

**Interfaces:**
- Consumes: `fechasDePublicacion` (Task 5) ya registrado en Artículos.
- Produces: `lugaresEnCuerpo(cuerpo: unknown): number[]` (ids sin repetir, en orden de aparición); `llenarLugaresCitados: CollectionBeforeChangeHook`; campo `articulos.lugaresCitados` (relación hasMany a Lugares, oculta en el admin).

- [ ] **Step 1: Write the failing unit test**

Crea `tests/unit/lexical.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { lugaresEnCuerpo } from '../../src/dominio/lexical'

const bloque = (blockType: string, extra: Record<string, unknown>) => ({ type: 'block', version: 2, format: '', fields: { id: 'x', blockName: '', blockType, ...extra } })
const cuerpo = (...hijos: unknown[]) => ({ root: { type: 'root', children: hijos } })

describe('lugaresEnCuerpo', () => {
  it('saca los ids de las tarjetas de lugar, sin repetir y en orden', () => {
    const c = cuerpo(bloque('tarjetaLugar', { lugar: 7 }), { type: 'paragraph', children: [] }, bloque('tarjetaLugar', { lugar: { id: 3 } }), bloque('tarjetaLugar', { lugar: 7 }))
    expect(lugaresEnCuerpo(c)).toEqual([7, 3])
  })

  it('ignora otros bloques y nodos anidados sin lugar', () => {
    const c = cuerpo(bloque('tarjetaEvento', { evento: 9 }), { type: 'list', children: [{ type: 'listitem', children: [bloque('tarjetaLugar', { lugar: 4 })] }] })
    expect(lugaresEnCuerpo(c)).toEqual([4])
  })

  it('devuelve vacío con un cuerpo vacío o raro', () => {
    expect(lugaresEnCuerpo(null)).toEqual([])
    expect(lugaresEnCuerpo({})).toEqual([])
    expect(lugaresEnCuerpo(cuerpo(bloque('tarjetaLugar', { lugar: null })))).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:unit -- tests/unit/lexical.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement `lugaresEnCuerpo`**

Crea `src/dominio/lexical.ts`:

```ts
type Nodo = { type?: string; fields?: { blockType?: string; lugar?: unknown }; children?: Nodo[] }

const idDe = (valor: unknown): number | null => {
  if (typeof valor === 'number') return valor
  if (valor && typeof valor === 'object' && typeof (valor as { id?: unknown }).id === 'number') return (valor as { id: number }).id
  return null
}

// Ids de los lugares de los bloques «Tarjeta de lugar» de un cuerpo Lexical, sin repetir y en orden.
export function lugaresEnCuerpo(cuerpo: unknown): number[] {
  const ids: number[] = []
  const visitar = (nodo: Nodo | undefined) => {
    if (!nodo || typeof nodo !== 'object') return
    if (nodo.type === 'block' && nodo.fields?.blockType === 'tarjetaLugar') {
      const id = idDe(nodo.fields.lugar)
      if (id !== null && !ids.includes(id)) ids.push(id)
    }
    if (Array.isArray(nodo.children)) nodo.children.forEach(visitar)
  }
  visitar((cuerpo as { root?: Nodo } | null)?.root)
  return ids
}
```

Run: `npm run test:unit -- tests/unit/lexical.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing integration test**

Agrega dentro del `describe` principal de `tests/int/diseno-f1.int.test.ts`:

```ts
  describe('Artículos: lugares citados', () => {
    const conTarjeta = (lugar: number) => ({
      root: {
        type: 'root', format: '' as const, indent: 0, version: 1, direction: 'ltr' as const,
        children: [{ type: 'block', version: 2, format: '', fields: { id: `b${lugar}`, blockName: '', blockType: 'tarjetaLugar', lugar } }],
      },
    })

    it('junta los lugares de los dos idiomas y suelta los que se quitan', async () => {
      const zona = await crearZona(payload)
      const cat = await crearCategoria(payload)
      const foto = await crearImagen(payload)
      const a = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'lugar-es' })
      const b = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: foto.id, slugEs: 'lugar-en' })
      const editor = await crearUsuario(payload, 'editor')
      const art = await payload.create({
        collection: 'articulos', locale: 'es',
        data: { titulo: 'Con tarjetas', portada: foto.id, autor: editor.id, resumen: 'r', cuerpo: conTarjeta(a.id) as never, _status: 'published' },
        overrideAccess: true,
      })
      expect(art.lugaresCitados?.map((l) => (typeof l === 'number' ? l : l.id))).toEqual([a.id])

      const en = await payload.update({
        collection: 'articulos', id: art.id, locale: 'en',
        data: { titulo: 'With cards', resumen: 'r', cuerpo: conTarjeta(b.id) as never, _status: 'published' },
        overrideAccess: true,
      })
      expect(new Set(en.lugaresCitados?.map((l) => (typeof l === 'number' ? l : l.id)))).toEqual(new Set([a.id, b.id]))

      const sinA = await payload.update({
        collection: 'articulos', id: art.id, locale: 'es',
        data: { cuerpo: lexical('ya sin tarjeta'), _status: 'published' },
        overrideAccess: true,
      })
      expect(sinA.lugaresCitados?.map((l) => (typeof l === 'number' ? l : l.id))).toEqual([b.id])
    })
  })
```

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts`
Expected: FAIL (`lugaresCitados` no existe).

- [ ] **Step 5: Implement the hook and the field**

Agrega a `src/hooks/articulos.ts`:

```ts
import { lugaresEnCuerpo } from '../dominio/lexical'

// lugaresCitados: los lugares de las «Tarjetas de lugar» del cuerpo en todos los idiomas (spec §6).
// El cuerpo del idioma que se guarda viene en data; los demás se leen con el adaptador de base, no con la
// Local API, para no tocar req.locale (regla de hooks).
export const llenarLugaresCitados: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data) return data
  const actual = req.locale
  const ids = new Set<number>()
  const cuerpoActual = 'cuerpo' in data ? data.cuerpo : originalDoc?.cuerpo
  lugaresEnCuerpo(cuerpoActual).forEach((id) => ids.add(id))
  const localizacion = req.payload.config.localization
  const otros = localizacion ? localizacion.localeCodes.filter((codigo) => codigo !== actual) : []
  if (originalDoc?.id) {
    for (const locale of otros) {
      const doc = await req.payload.db.findOne<{ cuerpo?: unknown }>({
        collection: 'articulos',
        where: { id: { equals: originalDoc.id } },
        locale,
        req,
      })
      lugaresEnCuerpo(doc?.cuerpo).forEach((id) => ids.add(id))
    }
  }
  return { ...data, lugaresCitados: [...ids] }
}
```

(Junta el `import` nuevo con el `import type` que ya está arriba del archivo.)

En `src/collections/Articulos.ts`: importa `llenarLugaresCitados` junto con `fechasDePublicacion`; usa
`beforeChange: [copiarNombreAutor, fechasDePublicacion, llenarLugaresCitados, redireccion.beforeChange]`; y agrega después de `cuerpo`:

```ts
    {
      name: 'lugaresCitados',
      type: 'relationship',
      relationTo: 'lugares',
      hasMany: true,
      admin: { hidden: true },
    },
```

- [ ] **Step 6: Regenerate migration and types**

```bash
npm run migracion:regenerar -- --no-hay-deploy
npm run generate:types
npm run typecheck
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm run test:unit -- tests/unit/lexical.test.ts && npm run test:int -- tests/int/diseno-f1.int.test.ts tests/int/articulos-solicitudes.int.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/dominio/lexical.ts tests/unit/lexical.test.ts src/hooks/articulos.ts src/collections/Articulos.ts tests/int/diseno-f1.int.test.ts src/migrations src/payload-types.ts
git commit -m "feat: lugaresCitados en artículos, llenado al guardar en todos los idiomas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Colección «Textos de zona × categoría»

**Files:**
- Create: `src/collections/TextosZonaCategoria.ts`
- Modify: `src/payload.config.ts`, `src/seed/vaciar.ts`
- Test: `tests/int/diseno-f1.int.test.ts`
- Regenerate: migración, tipos, importMap

**Interfaces:**
- Produces: colección `textos-zona-categoria` con `zona` (rel. Zonas, obligatoria), `categoria` (rel. Categorías de lugares, obligatoria), `introduccion` (textarea es/en, obligatoria); índice único (`zona`, `categoria`); lectura pública, escritura solo personal.

- [ ] **Step 1: Write the failing tests**

Agrega dentro del `describe` principal:

```ts
  describe('Textos de zona × categoría', () => {
    it('el público lee la introducción; un par no se repite', async () => {
      const zona = await crearZona(payload)
      const cat = await crearCategoria(payload)
      await payload.create({
        collection: 'textos-zona-categoria', locale: 'es',
        data: { zona: zona.id, categoria: cat.id, introduccion: 'De la playa de la ciudad a las bahías turquesa.' },
        overrideAccess: true,
      })
      const publico = await payload.find({
        collection: 'textos-zona-categoria', locale: 'es', overrideAccess: false,
        where: { and: [{ zona: { equals: zona.id } }, { categoria: { equals: cat.id } }] },
      })
      expect(publico.docs[0]?.introduccion).toBe('De la playa de la ciudad a las bahías turquesa.')
      await expect(
        payload.create({
          collection: 'textos-zona-categoria', locale: 'es',
          data: { zona: zona.id, categoria: cat.id, introduccion: 'Otra' },
          overrideAccess: true,
        }),
      ).rejects.toThrow()
    })

    it('el público no escribe', async () => {
      const zona = await crearZona(payload)
      const cat = await crearCategoria(payload)
      await expect(
        payload.create({
          collection: 'textos-zona-categoria', locale: 'es',
          data: { zona: zona.id, categoria: cat.id, introduccion: 'x' },
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts`
Expected: FAIL (colección inexistente).

- [ ] **Step 3: Implement**

Crea `src/collections/TextosZonaCategoria.ts`:

```ts
import type { CollectionConfig } from 'payload'

import { lecturaPublica, soloPersonal } from '../acceso/reglas'

// Introducción de la página «Categoría en zona» (spec §6 y §7). Un registro por par zona × categoría.
export const TextosZonaCategoria: CollectionConfig = {
  slug: 'textos-zona-categoria',
  labels: { singular: 'Texto de zona × categoría', plural: 'Textos de zona × categoría' },
  admin: { defaultColumns: ['zona', 'categoria', 'updatedAt'] },
  access: { read: lecturaPublica, create: soloPersonal, update: soloPersonal, delete: soloPersonal },
  indexes: [{ fields: ['zona', 'categoria'], unique: true }],
  fields: [
    { name: 'zona', type: 'relationship', relationTo: 'zonas', required: true },
    {
      name: 'categoria',
      type: 'relationship',
      relationTo: 'categorias',
      required: true,
      filterOptions: { aplicaA: { in: ['lugar', 'ambos'] } },
    },
    { name: 'introduccion', type: 'textarea', localized: true, required: true },
  ],
}
```

En `src/payload.config.ts`: `import { TextosZonaCategoria } from './collections/TextosZonaCategoria'` y
`collections: [Users, Media, Zonas, Categorias, Lugares, Eventos, Articulos, Solicitudes, TextosZonaCategoria],`.

En `src/seed/vaciar.ts`, agrega `'textos-zona-categoria',` en `ORDEN` justo después de `'solicitudes',`.

- [ ] **Step 4: Regenerate migration, types and importMap**

```bash
npm run migracion:regenerar -- --no-hay-deploy
npm run generate:types
npm run generate:importmap
npm run typecheck
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts tests/int/seed.int.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/collections/TextosZonaCategoria.ts src/payload.config.ts src/seed/vaciar.ts tests/int/diseno-f1.int.test.ts src/migrations src/payload-types.ts "src/app/(payload)/admin/importMap.js"
git commit -m "feat: colección de introducciones por zona y categoría

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Colección «Fotos de tours»

**Files:**
- Create: `src/collections/FotosTours.ts`
- Modify: `src/payload.config.ts`, `src/seed/vaciar.ts`
- Test: `tests/int/diseno-f1.int.test.ts`
- Regenerate: migración, tipos, importMap

**Interfaces:**
- Produces: colección `fotos-tours` con `sedeSlug` (texto, slug válido), `tipo` (`servicio` | `paquete`), `slug` (texto, slug válido), `foto` (Media, obligatoria) y `temporada` (texto es/en, opcional); índice único (`sedeSlug`, `tipo`, `slug`); lectura pública, escritura solo personal.

- [ ] **Step 1: Write the failing tests**

Agrega dentro del `describe` principal:

```ts
  describe('Fotos de tours', () => {
    it('guarda foto y temporada por tour; un tour no se repite', async () => {
      const foto = await crearImagen(payload)
      const datos = { sedeSlug: 'la-paz', tipo: 'servicio' as const, slug: 'ballenas-bahia-magdalena', foto: foto.id, temporada: 'enero a marzo' }
      await payload.create({ collection: 'fotos-tours', locale: 'es', data: datos, overrideAccess: true })
      const publico = await payload.find({
        collection: 'fotos-tours', locale: 'es', overrideAccess: false,
        where: { sedeSlug: { equals: 'la-paz' } },
      })
      expect(publico.docs[0]?.temporada).toBe('enero a marzo')
      await expect(payload.create({ collection: 'fotos-tours', locale: 'es', data: datos, overrideAccess: true })).rejects.toThrow()
    })

    it('rechaza slugs inválidos y al público', async () => {
      const foto = await crearImagen(payload)
      await expect(
        payload.create({ collection: 'fotos-tours', data: { sedeSlug: 'La Paz', tipo: 'servicio', slug: 'x', foto: foto.id }, overrideAccess: true }),
      ).rejects.toThrow()
      await expect(
        payload.create({ collection: 'fotos-tours', data: { sedeSlug: 'la-paz', tipo: 'paquete', slug: 'x', foto: foto.id }, overrideAccess: false }),
      ).rejects.toThrow()
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Crea `src/collections/FotosTours.ts`:

```ts
import type { CollectionConfig, TextField } from 'payload'

import { lecturaPublica, soloPersonal } from '../acceso/reglas'
import { esSlugValido } from '../dominio/slugs'

const slugDelCatalogo = (name: string, description: string): TextField => ({
  name,
  type: 'text',
  required: true,
  admin: { description },
  validate: (v: unknown) => (typeof v === 'string' && esSlugValido(v) ? true : 'Slug inválido (minúsculas, números y guiones).'),
})

// Foto y temporada de un tour del catálogo (spec §6 y §8.1): el catálogo no las manda.
export const FotosTours: CollectionConfig = {
  slug: 'fotos-tours',
  labels: { singular: 'Foto de tour', plural: 'Fotos de tours' },
  admin: { useAsTitle: 'slug', defaultColumns: ['slug', 'sedeSlug', 'tipo', 'updatedAt'] },
  access: { read: lecturaPublica, create: soloPersonal, update: soloPersonal, delete: soloPersonal },
  indexes: [{ fields: ['sedeSlug', 'tipo', 'slug'], unique: true }],
  fields: [
    slugDelCatalogo('sedeSlug', 'Sede del sitio de reservas (la-paz, la-ventana, puerto-chale).'),
    {
      name: 'tipo',
      type: 'select',
      required: true,
      options: [
        { label: 'Servicio', value: 'servicio' },
        { label: 'Paquete', value: 'paquete' },
      ],
    },
    slugDelCatalogo('slug', 'Slug del servicio o paquete en el catálogo.'),
    { name: 'foto', type: 'upload', relationTo: 'media', required: true },
    { name: 'temporada', type: 'text', localized: true, admin: { description: 'Opcional, p. ej. «enero a marzo».' } },
  ],
}
```

En `src/payload.config.ts`: `import { FotosTours } from './collections/FotosTours'` y agrega `FotosTours` al final de `collections`.

En `src/seed/vaciar.ts`, agrega `'fotos-tours',` en `ORDEN` justo después de `'textos-zona-categoria',` (antes de `'media'`).

- [ ] **Step 4: Regenerate migration, types and importMap**

```bash
npm run migracion:regenerar -- --no-hay-deploy
npm run generate:types
npm run generate:importmap
npm run typecheck
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts tests/int/seed.int.test.ts tests/int/media.int.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/collections/FotosTours.ts src/payload.config.ts src/seed/vaciar.ts tests/int/diseno-f1.int.test.ts src/migrations src/payload-types.ts "src/app/(payload)/admin/importMap.js"
git commit -m "feat: colección de fotos y temporada por tour del catálogo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Aviso de privacidad en «Ajustes de la guía»

**Files:**
- Modify: `src/globals/AjustesGuia.ts`, `tests/int/articulos-solicitudes.int.test.ts`
- Test: `tests/int/diseno-f1.int.test.ts`
- Regenerate: migración, tipos, importMap

**Interfaces:**
- Produces: `avisoPrivacidad` (richText es/en), `avisoVigenteDesde` (fecha, solo día) en el Global; `correoPrivacidad` de lectura pública; `correosAviso` sigue solo para personal.

- [ ] **Step 1: Write the failing tests**

En `tests/int/articulos-solicitudes.int.test.ts`, en la prueba «el Global: el público lee lo público y nunca los correos…», cambia
`expect(publico.correoPrivacidad).toBeUndefined()` por `expect(publico.correoPrivacidad).toBe('privacidad@prueba.test')`
y el nombre de la prueba a `'el Global: el público lee lo público y el correo de privacidad, nunca los correos de aviso; un editor no lo edita'`.

Agrega dentro del `describe` principal de `tests/int/diseno-f1.int.test.ts`:

```ts
  describe('Ajustes: aviso de privacidad', () => {
    it('el público lee el aviso, su versión, su vigencia y el correo de privacidad', async () => {
      const admin = await crearUsuario(payload, 'admin')
      await payload.updateGlobal({
        slug: 'ajustes-guia', locale: 'es',
        data: { avisoPrivacidad: lexical('Texto del aviso.'), versionAviso: '2026-11', avisoVigenteDesde: '2026-11-01T00:00:00.000Z', correoPrivacidad: 'privacidad@prueba.test' },
        overrideAccess: false, user: admin,
      })
      const publico = await payload.findGlobal({ slug: 'ajustes-guia', locale: 'es', overrideAccess: false })
      expect(JSON.stringify(publico.avisoPrivacidad)).toContain('Texto del aviso.')
      expect(publico.versionAviso).toBe('2026-11')
      expect(publico.avisoVigenteDesde).toBeTruthy()
      expect(publico.correoPrivacidad).toBe('privacidad@prueba.test')
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts tests/int/articulos-solicitudes.int.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

En `src/globals/AjustesGuia.ts`, reemplaza el campo `correoPrivacidad` por:

```ts
    // Público: el aviso de privacidad lo muestra para los derechos ARCO (spec §12).
    { name: 'correoPrivacidad', type: 'email' },
```

y agrega después de `versionAviso`:

```ts
    {
      name: 'avisoVigenteDesde',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' }, description: 'Desde cuándo rige la versión vigente del aviso.' },
    },
    {
      name: 'avisoPrivacidad',
      type: 'richText',
      localized: true,
      admin: { description: 'Texto del aviso de privacidad de la Guía. Al cambiarlo, sube la versión.' },
    },
```

- [ ] **Step 4: Regenerate migration, types and importMap**

```bash
npm run migracion:regenerar -- --no-hay-deploy
npm run generate:types
npm run generate:importmap
npm run typecheck
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:int -- tests/int/diseno-f1.int.test.ts tests/int/articulos-solicitudes.int.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/globals/AjustesGuia.ts tests/int/articulos-solicitudes.int.test.ts tests/int/diseno-f1.int.test.ts src/migrations src/payload-types.ts "src/app/(payload)/admin/importMap.js"
git commit -m "feat: aviso de privacidad en Ajustes de la guía y correo de privacidad público

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Verificación completa como en el CI

**Files:**
- Ninguno nuevo; solo verificación (y corrección si algo falla).

- [ ] **Step 1: Run the full suite**

```bash
docker compose up -d
npm run generate:types && npm run generate:importmap
git status --short src/payload-types.ts "src/app/(payload)/admin/importMap.js"
npm run typecheck
npm run lint
npm run test:unit
npm run test:int
npm run build
```
Expected: `git status` sin cambios en tipos ni importMap (ya estaban al día), y todo lo demás sin errores.

- [ ] **Step 2: Comprobar que el esquema no tiene cambios sin migración**

Es el mismo paso del CI («Sin cambios de esquema sin migración»):

```bash
npx payload migrate:create comprobacion --skip-empty
test -z "$(git status --porcelain -- src/migrations)" && echo "esquema al día"
```
Expected: imprime `esquema al día` y no crea ningún archivo en `src/migrations`.

- [ ] **Step 3: Seed contra la base local**

```bash
SEED_PERMITIDO=true SEED_CONTRASENA_ADMIN='contrasena-local-larga' npm run seed
```
Expected: termina sin errores; las categorías del seed tienen grupo.

- [ ] **Step 4: Commit (solo si hubo correcciones)**

```bash
git add -A src tests
git commit -m "fix: ajustes de la verificación completa del backoffice de F1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
