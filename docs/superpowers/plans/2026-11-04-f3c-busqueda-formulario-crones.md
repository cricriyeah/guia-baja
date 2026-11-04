# F3c Búsqueda, formulario, aviso, crones, sitemap, OG y analítica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el sitio público de F3 sobre F3a y F3b:

- búsqueda de texto libre por idioma (página y sugerencias de la cabecera);
- aviso de privacidad;
- formulario «Aparece en la guía» con Turnstile, límite por IP y aviso por correo;
- publicación programada y crones (cola de Payload, ventana de patrocinios y fechas, conservación de Solicitudes);
- acción de anonimizar en el admin;
- sitemap;
- imágenes Open Graph;
- eventos de analítica.

**Architecture:**

- **Búsqueda (decisión 13).** Una colección oculta, `indice-busqueda`, guarda una fila por documento e idioma. Solo hay fila si el documento está publicado (o la zona activa) y existe en ese idioma. La mantienen hooks `afterChange`/`afterDelete` que leen con `req.payload.db.*`. La consulta es SQL de full-text (`websearch_to_tsquery` con `spanish`/`english`, `unaccent` y `ts_rank`) sobre esa tabla. La extensión, la función inmutable y los índices GIN van en la migración escrita a mano `busqueda`, que `migracion:regenerar` vuelve a crear después de `inicial`.
- **Formulario.** Server Action. Valida con funciones puras de `src/dominio/`. La IP sale de `origenReenviado(headers())`. Turnstile y Resend están detrás de módulos pequeños con un tiempo límite, así que en las pruebas se pueden reemplazar.
- **Crones.** Dos rutas `/api/cron/*` protegidas con `CRON_SECRET`. Las decisiones (qué ventana revalidar, qué anonimizar) son puras y tienen pruebas.
- **Sitemap y OG.** Rutas que reutilizan las listas cacheadas de F3b y las reglas de indexabilidad de F3a. Las imágenes OG viven bajo `/guia-assets/og/…`, porque esa ruta sí la reescribe el sitio de reservas: la ruta interna en inglés (`/en/guia/…`) daría 404 por el proxy.
- **Analítica (§13).** Un solo `track()` con un adaptador que no hace nada. Un listener delegado convierte los `data-evento` que ya puso F3b en eventos.

**Tech Stack:** Next.js 16.4.3 (Server Actions, route handlers, `next/og`), Payload 3.92.1 (Local API, jobs, `schedulePublish`, `@payloadcms/email-resend` 3.92.1, adaptador Postgres con `sql`), Cloudflare Turnstile, Vitest 4.0.18.

**Spec:** `docs/specs/2026-10-30-guia-baja-design.md` (§4.1, §6 Solicitudes y Global, §7 Búsqueda y Negocios, §9 sitemap y OG, §10 crones, §11 formulario, §12, §13). Índice: `docs/superpowers/plans/2026-11-04-f3-sitio-publico.md`. Requiere F3a y F3b completos.

## Global Constraints

- Todo lo de F3a y F3b sigue en pie.
- **Dependencia nueva:** solo `@payloadcms/email-resend` 3.92.1, la misma versión que Payload. Se justifica en el PR: es el adaptador oficial de Payload para Resend (spec §5.2). Turnstile y la analítica no necesitan dependencias.
- **Migraciones:**
  - `migracion:regenerar` rehace `inicial` y después `busqueda`.
  - El esquema de Payload cambia en cuatro puntos: la colección `indice-busqueda`, `schedulePublish`, la tabla de jobs y `estadoCambiadoEl` en Solicitudes.
  - El CI sigue comprobando que no haya cambios de esquema sin migración.
  - Nunca `push`.
- **Origen:** la Server Action lee la IP con `origenReenviado(headers())` (F3a). Las páginas siguen sin leer `headers()`.
- **Formulario (spec §11, §12):**
  - Validación en el servidor y casilla de aceptación del aviso, con la versión guardada.
  - Correo **o** teléfono, al menos uno (decisiones, notas de F1).
  - Turnstile verificado en el servidor, con `remoteip`.
  - Máximo 5 envíos por `ipHash` por hora. `ipHash` = SHA-256 de la IP con `IP_HASH_SALT`.
  - Solo funciona con `formularioActivo`.
  - Si el correo falla, la Solicitud queda guardada y el error va a los logs.
  - **Los logs nunca llevan correo, teléfono ni IP.**
- **Conservación (spec §12):**
  - `ipHash` se borra a las 24 h.
  - Se anonimiza una Solicitud `rechazada`, o una sin cambio de estado en 12 meses que no esté `aceptada`: se borran `contactoNombre`, `correo`, `telefono`, `webOInstagram` y `mensaje`, y se llena `anonimizadaEl`.
  - Una `aceptada` la anonimiza un Admin con la acción del admin.
- **Crones (spec §10):**
  - Vercel Cron a la hora, en el minuto 5, protegido con `CRON_SECRET`.
  - Corre la cola de Payload y luego revalida lugares y eventos cuyo `patrocinio.desde`, `patrocinio.hasta`, `inicio` o `fin` cayó en los últimos 65 minutos.
  - Las fechas de patrocinio son de solo día y se interpretan con `inicioDelDiaGuardado`.
- **Búsqueda (spec §7):**
  - Busca en lugares, eventos próximos, artículos, zonas activas y categorías, por idioma y con la regla de idioma.
  - Los resultados van agrupados por tipo. En cada grupo suben hasta 2 patrocinios vigentes, con su etiqueta; el resto va por relevancia.
  - Filtros `?tipo=` y `?zona=`, con links. Paginación.
  - La página lleva `noindex` y no entra al sitemap.
  - El término se muestra siempre como texto.
  - Las sugerencias de la cabecera salen de una ruta interna de la Guía que no es parte del contrato `v1`.
- **Excepción a §10 (decisión de este plan):** las sugerencias de la cabecera no pasan por `unstable_cache`. Cada prefijo tecleado crearía una entrada de caché con texto libre del visitante, y la consulta indexada sobre cientos de filas cuesta menos que eso.
- **Sitemap (spec §9):** `/guia-sitemap.xml` con todas las URLs indexables de los dos idiomas y sus alternos indexables. Da 404 si `GUIA_INDEXABLE !== 'true'`.
- **OG (spec §9):** la genera `next/og` por página (marca + título sobre el tamaño 1200×630 de su foto principal; sin foto, fondo de marca). La URL es absoluta, vía `metadataBase`.
- **Analítica (§13):**
  - Los eventos son `tour_clic` (`zona`, `origen`), `contacto_lugar` (`lugar`, `canal`), `boletos_clic` (`evento`) y `solicitud_enviada` (`zona`).
  - Cada evento lleva como máximo 2 propiedades.
  - La herramienta no está confirmada, así que el adaptador no hace nada.
- Commits en español con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nunca `push`. No tocar `.great_cto/` ni `shared/`.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/collections/IndiceBusqueda.ts` | Crear | Colección oculta `indice-busqueda`. Campos: `tipo`, `docId`, `idioma`, `slug`, `titulo`, `texto`, `zonaIds` y `categoriaIds` (`json`, arreglos: un artículo tiene varias zonas y un lugar varias categorías; se consultan con `@>`), `inicio`, `fin`, `patrocinioActivo`/`Desde`/`Hasta`. Índice único por (`tipo`, `docId`, `idioma`). Acceso: `nadie` para el público; solo la escriben los hooks (`overrideAccess`). |
| `src/busqueda/filas.ts` | Crear | Puro: `filasDe(tipo, docTodosLosIdiomas)` → filas por idioma. Aplica la regla de idioma, el estado publicado (o `activa` en zonas) y saca el texto plano del cuerpo. |
| `src/busqueda/indexar.ts` | Crear | `indexar(req, tipo, id)` lee la tabla principal con `req.payload.db.findOne({ locale: 'all', req })` (con `req`, ve la fila recién escrita) y calcula las filas. **Escribe con SQL dentro de un SAVEPOINT sobre la transacción del `req`**: `const db = (req.transactionID && payload.db.sessions[await req.transactionID]?.db) || payload.db.drizzle` y luego `await db.transaction(async (sp) => …)`. `getTransaction` de `@payloadcms/drizzle` no se exporta. Con una transacción abierta, eso crea un savepoint; si no hay transacción, una propia. Usa `INSERT … ON CONFLICT (tipo, doc_id, idioma) DO UPDATE` y un `DELETE` de los idiomas que ya no aplican. Si la SQL falla, se revierte solo el savepoint y el guardado del documento sigue. El error se atrapa y se registra. `reindexarTodo(payload)` recorre todo. |
| `src/busqueda/hooks.ts` | Crear | `hooksDeIndice(tipo)` → `afterChange`/`afterDelete`. Respetan `req.context.sinIndice`. El seed **no** pone `sinIndice`: sus guardados indexan solos, así que previews y E2E tienen búsqueda. |
| `src/busqueda/reindexar.ts` | Crear | Script de `payload run` (`npm run busqueda:reindexar`) que vuelve a llenar el índice si cambia `filasDe` o después de restaurar un respaldo. Documentado en `docs/operacion.md`. |
| `src/seed/vaciar.ts` | Modificar | `ORDEN` incluye `indice-busqueda` y `payload-jobs`. |
| `package.json` | Modificar | Script `busqueda:reindexar` y dependencia `@payloadcms/email-resend`. |
| `src/collections/{Lugares,Eventos,Articulos,Zonas,Categorias}.ts` | Modificar | Registran los hooks del índice, después de los de revalidación. Lugares, Eventos y Artículos agregan `versions.drafts.schedulePublish: true`. |
| `src/payload.config.ts` | Modificar | Registra `IndiceBusqueda` y `jobs`, la cola de la publicación programada (`autoRun` apagado: la corre el cron). El correo pasa a `@payloadcms/email-resend` si existe `RESEND_API_KEY`; si no, sigue `correoSilencioso`. |
| `scripts/regenerar-migracion.mjs` | Modificar | Después de `inicial`, corre un **segundo** `payload migrate:create busqueda --force-accept-warning`. Así la fecha queda posterior y se generan `index.ts` y `.json`. Luego reemplaza el cuerpo del `.ts` con `scripts/migraciones/busqueda.ts.txt`. Falla si en `index.ts` `inicial` no queda antes que `busqueda`. |
| `scripts/migraciones/busqueda.ts.txt` | Crear | Plantilla de la migración a mano: `CREATE EXTENSION IF NOT EXISTS unaccent`; `CREATE OR REPLACE FUNCTION guia_unaccent(text)` inmutable, que llama `public.unaccent('public.unaccent', $1)` calificado para no depender del `search_path`; y dos índices GIN de expresión, `spanish` para `idioma = 'es'` y `english` para `'en'`. `down` los borra. |
| `AGENTS.md` | Modificar | «Hasta el primer deploy hay dos migraciones: `inicial` y `busqueda` (esta última escrita a mano). `migracion:regenerar` rehace las dos.» |
| `docs/operacion.md` | Modificar | Cómo reindexar la búsqueda. Cómo rehacer la base `preview` (`migrate:fresh` + seed) cuando un PR rehace `inicial`. |
| `src/migrations/*` | Regenerar | `inicial` + `busqueda`. |
| `src/busqueda/consulta.ts` | Crear | Dos consultas, ambas con `sql` de `@payloadcms/db-postgres` y parámetros (nunca concatenación): <ul><li>`coincidencias(payload, { q, lang, tipo?, zonaId? })`: todas las coincidencias, hasta 500, como JSON puro (`rank`, fechas ISO, patrocinio), con `websearch_to_tsquery` sobre `guia_unaccent`.</li><li>`sugerencias(payload, { q, lang })`: hasta 8, por prefijo, con `to_tsquery(consultaPrefijo(q))`.</li></ul>La página, **fuera** de la caché, quita los eventos pasados, ordena y pagina. |
| `src/dominio/busqueda.ts` | Crear | Puro: <ul><li>`limpiarTermino(q)`: recorta, pasa a minúsculas y limita a 100 caracteres; es la llave de caché.</li><li>`consultaPrefijo(q)`: tokens `[\p{L}\p{N}]+` unidos con `&`, el último con `:*`. Nunca deja en el `tsquery` la sintaxis que escribió el visitante.</li><li>`TIPOS_BUSQUEDA` y `leerConsultaBusqueda(params)`.</li><li>`ordenarGrupo(filas, ahora)`: hasta 2 patrocinios vigentes arriba y el resto por relevancia. Se aplica a todo el grupo, antes de paginar.</li><li>`partesResaltadas(texto, termino)` → `{ texto, coincide }[]`.</li></ul> |
| `src/sitio/datos/llaves.ts`, `cacheadas.ts` | Modificar | `coincidencias` cacheada con llave `{ término limpio, lang, tipo, zona }` (sin `ahora` ni `pagina`) y etiquetas `listados`, `zonas` y `categorias`. Las sugerencias **no** se cachean: es un query indexado sobre cientos de filas. Solo se piden con 2 o más caracteres. |
| `src/dominio/rutas.ts` | Modificar | `rutas.sugerencias(lang)` (`/es/guia/buscar/sugerencias`, `/en/guide/search/sugerencias`). La búsqueda arma `?q=`, `?tipo=` y `?zona=` con `conConsulta`. |
| `src/app/(sitio)/[lang]/guia/buscar/page.tsx` | Crear | Resultados (`c-busqueda.html`). Dinámica, `noindex`. Agrupa por tipo, resalta coincidencias (React escapa el término), filtra por tipo y zona, pagina y tiene estado vacío. |
| `src/app/(sitio)/[lang]/guia/buscar/sugerencias/route.ts` | Crear | `GET ?q=` → JSON de sugerencias para la cabecera. Es ruta interna de la Guía, fuera de `v1`. Público: `/es/guia/buscar/sugerencias` y `/en/guide/search/sugerencias`. |
| `src/sitio/ui/CabeceraCliente.tsx` | Modificar | Sugerencias mientras se escribe (con espera de 200 ms y cancelación), en la barra y en la hoja del celular. |
| `src/sitio/estilos/busqueda.css`, `privacidad.css`, `aparece.css` | Crear | `<style>` de cada propuesta. |
| `src/app/(sitio)/[lang]/guia/privacidad/page.tsx` | Crear | Aviso de privacidad (`c-privacidad.html`): texto del Global con `CuerpoRico`, índice, versión, «vigente desde» (día guardado, `inicioDelDiaGuardado`) y `correoPrivacidad` con «Copiar correo». Sin aviso en el idioma: `noEncontrado`. |
| `src/sitio/ui/CopiarCorreo.tsx` | Crear | `'use client'`: copia el correo con confirmación. |
| `src/collections/Solicitudes.ts` | Modificar | Campo `estadoCambiadoEl` (fecha, solo lectura) y `beforeChange` que lo llena al crear y cada vez que cambia `estado`. Así la conservación no se reinicia con una nota interna (spec §12). |
| `src/dominio/solicitud.ts` | Crear | Puro: `validarSolicitud(form)` → `{ ok: true, datos }` o `{ ok: false, errores }` (largos, formato de correo y teléfono, correo **o** teléfono, aceptación). `LIMITE_POR_HORA = 5`. |
| `src/dominio/ip-hash.ts` | Crear | `ipHash(ip, sal)` con SHA-256 en hex. Puro. |
| `src/formulario/turnstile.ts` | Crear | `verificarTurnstile(token, ip, secreto, fetch?)` contra `siteverify`, con 3 s de límite. Devuelve `false` si falla, sin lanzar. |
| `src/formulario/avisar.ts` | Crear | `avisarSolicitud(payload, solicitud, correos)` con `payload.sendEmail`. Atrapa los errores y registra **solo** `{ solicitudId, nombre: err.name, estado: err.status }`. Nunca registra el `message`, porque puede citar direcciones de correo. |
| `src/formulario/enviar.ts` | Crear | `enviarSolicitud(payload, form, origen, deps)`: el caso de uso completo. Revisa `formularioActivo`, valida, verifica Turnstile y revisa el límite. **Sin IP** (desarrollo local o plan B del spec §10), el límite pasa a contar por correo y teléfono (5 por hora) y Turnstile no recibe `remoteip`. Crea la Solicitud (`overrideAccess`, `versionAviso`) y avisa. Sin Next: se prueba contra Postgres con dependencias simuladas. Contar y crear no es atómico, así que con envíos en paralelo podría pasar un sexto. Es un costo aceptado y queda anotado en el código. |
| `src/formulario/accion.ts` | Crear | `'use server'`: Server Action delgada que llama a `enviarSolicitud` con `origenReenviado(await headers())` y las dependencias reales. |
| `src/app/(sitio)/[lang]/guia/aparece-en-la-guia/page.tsx` | Crear | Explicación y formulario. Si `formularioActivo` está apagado, «Muy pronto» (`c-aparece.html`). |
| `src/sitio/ui/FormularioSolicitud.tsx` | Crear | `'use client'`: formulario con `useActionState`, widget de Turnstile (`next/script`), errores por campo, confirmación y `track('solicitud_enviada', { zona })`. |
| `src/dominio/ventana.ts` | Crear | Puro: `instantesDeCambio(doc)` (patrocinio con `inicioDelDiaGuardado`, `inicio`, `fin`) y `cayoEnVentana(instante, ahora, minutos = 65)`. |
| `src/dominio/conservacion.ts` | Crear | Puro: `debeAnonimizar(solicitud, ahora)` (sin `anonimizadaEl`, y además rechazada, o no aceptada con `estadoCambiadoEl` de hace más de 12 meses), `CAMPOS_PERSONALES` e `ipHashVencido(creadaEl, ahora)`. |
| `src/cron/autorizar.ts` | Crear | `autorizado(request)`: `Authorization: Bearer ${CRON_SECRET}` comparado en tiempo constante. Sin secreto configurado, siempre `false`. |
| `src/cron/hora.ts`, `src/cron/diario.ts` | Crear | Casos de uso: `correrHora(payload, ahora, revalidarEtiquetas)` corre los jobs y la ventana, y borra los `ipHash` de más de 24 h (cada hora, para cumplir el plazo del spec §12). `correrDiario(payload, ahora)` anonimiza. Sin Next; probados contra Postgres. |
| `src/solicitudes/anonimizar.ts` | Crear | `anonimizarSolicitud(payload, id)`: única forma de anonimizar. La usan el cron y el admin. |
| `src/app/(sitio)/api/cron/hora/route.ts`, `src/app/(sitio)/api/cron/diario/route.ts` | Crear | `GET` → `autorizado` y el caso de uso; responde 401 sin secreto. |
| `vercel.json` | Modificar | `crons`: `5 * * * *` → `/api/cron/hora`; `15 9 * * *` (02:15 en BCS) → `/api/cron/diario`. |
| `src/collections/Solicitudes.ts` | Modificar | Endpoint `POST /api/solicitudes/:id/anonimizar` (`soloAdmin`) y campo de interfaz con el botón. |
| `src/componentes-admin/BotonAnonimizar.tsx` | Crear | `'use client'`: botón en el admin de la Solicitud. Confirma y llama al endpoint. Lo registra `importMap`. |
| `src/sitio/seo/sitemap.ts` | Crear | Puro: `xmlSitemap(entradas, base)` con `xhtml:link` alternos; `entradasSitemap(listas, reglas)` → URLs indexables en los dos idiomas (portada, zonas, combinaciones de 3 o más, categorías de 3 o más, lugares, eventos incluidos los pasados, artículos, eventos, negocios y privacidad; sin búsqueda). |
| `src/app/(sitio)/guia-sitemap.xml/route.ts` | Crear | 404 sin `GUIA_INDEXABLE`; si no, XML con las listas cacheadas (`revalidate` de 3600 s). |
| `src/app/(sitio)/guia-assets/og/[lang]/[tipo]/[[...ruta]]/route.tsx` | Crear | `ImageResponse` de `next/og` con la marca «Sun Baja · Guía de la Baja» en texto blanco (satori no soporta `filter` para recolorear el logo negro), el título y de fondo el tamaño `og` de la foto principal (o un fondo de marca). Lee los datos cacheados. El catch-all opcional da imagen también a la portada, eventos, negocios y privacidad. Satori no lee WOFF2, así que el título usa la fuente que trae `next/og` y no Consola Mono. |
| `src/sitio/seo/og.ts` | Crear | `rutaOg(lang, tipo, segmentos)` → `/guia-assets/og/...`. `metadatos` de F3a recibe `imagenOg`. |
| `src/sitio/seo/metadatos.ts` | Modificar | `openGraph.images` y `twitter.card` con `imagenOg`. |
| `src/app/(sitio)/[lang]/guia/**/page.tsx` (F3a/F3b) | Modificar | Pasan `imagenOg` a `metadatos`. |
| `src/sitio/analitica/track.ts` | Crear | `track(evento, props)`: valida el nombre y como máximo 2 propiedades, y llama al adaptador. |
| `src/sitio/analitica/adaptador.ts` | Crear | `enviarEvento(evento, props)`: no hace nada hasta que se confirme la herramienta (§13). Es el único archivo que cambia al conectarla. |
| `src/sitio/analitica/Analitica.tsx` | Crear | `'use client'`: listener delegado de clics sobre `[data-evento]` → `track`. Se monta en el layout de `guia`. |
| `.env.example`, spec §5.5 | Modificar | Ninguna variable nueva. `TURNSTILE_SITE_KEY` se expone al cliente pasándola como prop desde el servidor. |
| `tests/unit/{busqueda,filas-busqueda,solicitud,ip-hash,turnstile,ventana,conservacion,autorizar,sitemap,track,og}.test.ts` | Crear | Unitarias. |
| `tests/int/{busqueda,formulario,crones,anonimizar}.int.test.ts` | Crear | Contra Postgres: <ul><li>índice al publicar, despublicar, cambiar de idioma y borrar;</li><li>consulta por idioma con acentos y patrocinio arriba;</li><li>formulario apagado, límite de 5, correo que falla sin perder la Solicitud y sin datos personales en el log;</li><li>cron de hora y cron diario;</li><li>endpoint de anonimizar solo para Admin.</li></ul> |

<!-- arch-critic: APPROVED -->

---

### Task 1: Reglas puras de la búsqueda

**Files:**
- Create: `src/dominio/busqueda.ts`
- Test: `tests/unit/busqueda.test.ts`

**Interfaces:**
- Consumes: `patrocinioVigente`, `MAX_PATROCINIOS_ARRIBA`, `esSlugValido`.
- Produces:
  - `TIPOS_BUSQUEDA = ['lugar', 'evento', 'articulo', 'zona', 'categoria'] as const` y `type TipoBusqueda`.
  - `limpiarTermino(q: string | null): string`: recorta, pasa a minúsculas, colapsa espacios y deja hasta 100 caracteres.
  - `consultaPrefijo(q: string): string | null`.
  - `leerConsultaBusqueda(p: URLSearchParams): { q: string; tipo: 'lugar' | 'evento' | 'articulo' | null; zona: string | null; pagina: number }`.
  - `type FilaResultado = { tipo: TipoBusqueda; docId: number; slug: string; titulo: string; texto: string; zonaIds: number[]; categoriaIds: number[]; inicio: string | null; fin: string | null; rank: number; patrocinio: { activo: boolean; desde: string | null; hasta: string | null } }`.
  - `ordenarGrupo(filas: FilaResultado[], ahora: Date): FilaResultado[]`.
  - `partesResaltadas(texto: string, termino: string): { texto: string; coincide: boolean }[]`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/busqueda.test.ts
import { describe, expect, it } from 'vitest'

import { consultaPrefijo, leerConsultaBusqueda, limpiarTermino, ordenarGrupo, partesResaltadas, type FilaResultado } from '../../src/dominio/busqueda'

describe('reglas de la búsqueda (spec §7)', () => {
  it('limpiarTermino normaliza y limita', () => {
    expect(limpiarTermino('  Playas   en  La Paz ')).toBe('playas en la paz')
    expect(limpiarTermino('x'.repeat(150))).toHaveLength(100)
    expect(limpiarTermino(null)).toBe('')
  })

  it('consultaPrefijo nunca deja sintaxis del visitante', () => {
    expect(consultaPrefijo('play')).toBe('play:*')
    expect(consultaPrefijo('tacos de pesc')).toBe('tacos & de & pesc:*')
    expect(consultaPrefijo('a) & !foo | <->')).toBe('a & foo:*')
    expect(consultaPrefijo('café')).toBe('café:*')
    expect(consultaPrefijo('!!! ()')).toBeNull()
  })

  it('leerConsultaBusqueda acepta solo tipos y zonas válidos', () => {
    expect(leerConsultaBusqueda(new URLSearchParams('q=Balandra&tipo=lugar&zona=la-paz&pagina=2'))).toEqual({ q: 'balandra', tipo: 'lugar', zona: 'la-paz', pagina: 2 })
    expect(leerConsultaBusqueda(new URLSearchParams('q=x&tipo=zona&zona=No Valida&pagina=0'))).toEqual({ q: 'x', tipo: null, zona: null, pagina: 1 })
  })

  it('ordenarGrupo: hasta 2 patrocinios vigentes arriba; el resto por relevancia', () => {
    const vig = (desde: string) => ({ activo: true, desde, hasta: '2026-12-31T00:00:00.000Z' })
    const sin: FilaResultado['patrocinio'] = { activo: false, desde: null, hasta: null }
    const f = (id: number, rank: number, patrocinio: FilaResultado['patrocinio'] = sin): FilaResultado => ({
      tipo: 'lugar', docId: id, slug: `l${id}`, titulo: `L${id}`, texto: '', zonaIds: [], categoriaIds: [], inicio: null, fin: null, rank, patrocinio,
    })
    const ahora = new Date('2026-11-10T12:00:00-07:00')
    const r = ordenarGrupo(
      [f(1, 0.9), f(2, 0.1, vig('2026-11-05T00:00:00.000Z')), f(3, 0.5), f(4, 0.2, vig('2026-11-01T00:00:00.000Z')), f(5, 0.3, vig('2026-11-02T00:00:00.000Z'))],
      ahora,
    )
    expect(r.map((x) => x.docId)).toEqual([4, 5, 1, 3, 2])
  })

  it('partesResaltadas marca coincidencias sin importar acentos ni mayúsculas', () => {
    expect(partesResaltadas('Café Duna en La Paz', 'cafe paz')).toEqual([
      { texto: 'Café', coincide: true },
      { texto: ' Duna en La ', coincide: false },
      { texto: 'Paz', coincide: true },
    ])
    expect(partesResaltadas('Sin nada', '')).toEqual([{ texto: 'Sin nada', coincide: false }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/busqueda.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/dominio/busqueda.ts
import { MAX_PATROCINIOS_ARRIBA } from './orden'
import { patrocinioVigente } from './patrocinio'
import { esSlugValido } from './slugs'

export const TIPOS_BUSQUEDA = ['lugar', 'evento', 'articulo', 'zona', 'categoria'] as const
export type TipoBusqueda = (typeof TIPOS_BUSQUEDA)[number]
const FILTRABLES = ['lugar', 'evento', 'articulo'] as const

export type FilaResultado = {
  tipo: TipoBusqueda
  docId: number
  slug: string
  titulo: string
  texto: string
  zonaIds: number[]
  categoriaIds: number[]
  inicio: string | null
  fin: string | null
  rank: number
  patrocinio: { activo: boolean; desde: string | null; hasta: string | null }
}

// Llave de caché y texto que se busca: el término llega de la URL y se muestra siempre como texto (spec §7).
export function limpiarTermino(q: string | null): string {
  return (q ?? '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 100)
}

// Sugerencias por prefijo: solo letras y números del visitante; nunca su sintaxis de tsquery.
export function consultaPrefijo(q: string): string | null {
  const tokens = q.toLowerCase().match(/[\p{L}\p{N}]+/gu)
  if (!tokens?.length) return null
  return tokens.map((t, i) => (i === tokens.length - 1 ? `${t}:*` : t)).join(' & ')
}

export function leerConsultaBusqueda(p: URLSearchParams) {
  const tipo = p.get('tipo')
  const zona = p.get('zona')
  const pagina = /^[1-9]\d*$/.test(p.get('pagina') ?? '') ? Number(p.get('pagina')) : 1
  return {
    q: limpiarTermino(p.get('q')),
    tipo: (FILTRABLES as readonly string[]).includes(tipo ?? '') ? (tipo as (typeof FILTRABLES)[number]) : null,
    zona: zona && esSlugValido(zona) ? zona : null,
    pagina,
  }
}

// Spec §7: en cada grupo suben hasta 2 patrocinios vigentes (por desde); el resto va por relevancia.
// Se aplica a todo el grupo antes de paginar.
export function ordenarGrupo(filas: FilaResultado[], ahora: Date): FilaResultado[] {
  const tiempo = (v: string | null) => (v ? new Date(v).getTime() : 0)
  const arriba = filas
    .filter((f) => patrocinioVigente(f.patrocinio, ahora))
    .sort((a, b) => tiempo(a.patrocinio.desde) - tiempo(b.patrocinio.desde) || a.titulo.localeCompare(b.titulo, 'es'))
    .slice(0, MAX_PATROCINIOS_ARRIBA)
  const resto = filas.filter((f) => !arriba.includes(f)).sort((a, b) => b.rank - a.rank)
  return [...arriba, ...resto]
}

const plano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Resalta las palabras del término en el texto, sin importar acentos ni mayúsculas. React escapa cada parte.
export function partesResaltadas(texto: string, termino: string): { texto: string; coincide: boolean }[] {
  const palabras = (plano(termino).match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 1)
  if (!palabras.length) return [{ texto, coincide: false }]
  const base = plano(texto)
  const marcas = new Array<boolean>(texto.length).fill(false)
  for (const w of palabras) {
    let i = base.indexOf(w)
    while (i !== -1) {
      for (let k = i; k < i + w.length; k++) marcas[k] = true
      i = base.indexOf(w, i + w.length)
    }
  }
  const partes: { texto: string; coincide: boolean }[] = []
  for (let i = 0; i < texto.length; i++) {
    const ultima = partes[partes.length - 1]
    if (ultima && ultima.coincide === marcas[i]) ultima.texto += texto[i]
    else partes.push({ texto: texto[i], coincide: marcas[i] })
  }
  return partes
}
```

`plano` conserva la longitud de cada carácter precompuesto común (á → a), porque solo quita las marcas combinantes que crea `NFD`. Así los índices de `base` y de `texto` coinciden en español y en inglés.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/busqueda.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dominio/busqueda.ts tests/unit/busqueda.test.ts
git commit -m "feat: reglas puras de la búsqueda (términos, prefijos, orden y resaltado)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Índice de búsqueda mantenido por hooks

**Files:**
- Create: `src/collections/IndiceBusqueda.ts`, `src/busqueda/filas.ts`, `src/busqueda/indexar.ts`, `src/busqueda/hooks.ts`, `src/busqueda/reindexar.ts`
- Modify: `src/collections/{Lugares,Eventos,Articulos,Zonas,Categorias}.ts`, `src/payload.config.ts`, `src/seed/vaciar.ts`, `package.json`
- Regenerate: migración `inicial` y tipos
- Test: `tests/unit/filas-busqueda.test.ts`, `tests/int/busqueda.int.test.ts` (primera parte: indexación)

**Interfaces:**
- Consumes: `existeEnIdioma`, `aplanarIdioma`, `CAMPOS_IDIOMA`, `CAMPOS_LOCALIZADOS`, `textoDeLexical`, `LOCALES`.
- Produces:
  - Colección `indice-busqueda`. En la base, la tabla es `indice_busqueda` con las columnas `tipo`, `doc_id`, `idioma`, `slug`, `titulo`, `texto`, `zona_ids` (jsonb), `categoria_ids` (jsonb), `inicio`, `fin`, `patrocinio_activo`, `patrocinio_desde`, `patrocinio_hasta`.
  - `type FilaIndice = { tipo, docId, locale, slug, titulo, texto, zonaIds, categoriaIds, inicio, fin, patrocinioActivo, patrocinioDesde, patrocinioHasta }`.
  - `filasDe(tipo: TipoBusqueda, doc: Record<string, unknown> | null): FilaIndice[]` (`doc` leído con `locale: 'all'`).
  - `indexar(req: PayloadRequest, tipo: TipoBusqueda, id: number): Promise<void>` y `reindexarTodo(payload): Promise<number>`.
  - `hooksDeIndice(tipo)` → `{ afterChange, afterDelete }`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/filas-busqueda.test.ts
import { describe, expect, it } from 'vitest'

import { filasDe } from '../../src/busqueda/filas'

const lex = (t: string) => ({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: t }] }] } })

describe('filasDe: qué entra al índice (spec §6, §7)', () => {
  it('lugar publicado: una fila por idioma en que existe', () => {
    const doc = {
      id: 1, _status: 'published', nombre: 'Café Duna',
      slug: { es: 'cafe-duna', en: 'cafe-duna' }, resumen: { es: 'Café', en: null }, cuerpo: { es: lex('Pan dulce'), en: null },
      zona: 2, categorias: [3, { id: 4 }], patrocinio: { activo: true, desde: '2026-11-01T00:00:00.000Z', hasta: '2026-12-01T00:00:00.000Z' },
    }
    const filas = filasDe('lugar', doc)
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ tipo: 'lugar', docId: 1, locale: 'es', slug: 'cafe-duna', titulo: 'Café Duna', zonaIds: [2], categoriaIds: [3, 4], patrocinioActivo: true })
    expect(filas[0].texto).toContain('Pan dulce')
  })

  it('borrador o borrado: ninguna fila', () => {
    expect(filasDe('lugar', { id: 1, _status: 'draft' })).toEqual([])
    expect(filasDe('lugar', null)).toEqual([])
  })

  it('evento: fechas; artículo: varias zonas', () => {
    const ev = filasDe('evento', {
      id: 7, _status: 'published', nombre: { es: 'Trova' }, slug: { es: 'trova' }, resumen: { es: 'r' }, cuerpo: { es: lex('c') },
      zona: 2, categorias: [5], inicio: '2026-11-07T02:00:00.000Z', fin: null,
    })
    expect(ev[0]).toMatchObject({ titulo: 'Trova', inicio: '2026-11-07T02:00:00.000Z', fin: null })
    const ar = filasDe('articulo', { id: 8, _status: 'published', titulo: { es: 'T' }, slug: { es: 't' }, resumen: { es: 'r' }, cuerpo: { es: lex('c') }, zonas: [2, 9] })
    expect(ar[0].zonaIds).toEqual([2, 9])
  })

  it('zona activa con nombre; categoría con nombre', () => {
    expect(filasDe('zona', { id: 2, activa: true, slug: 'la-paz', nombre: { es: 'La Paz', en: 'La Paz' }, descripcion: { es: 'Capital' } })).toHaveLength(2)
    expect(filasDe('zona', { id: 2, activa: false, slug: 'x', nombre: { es: 'X' } })).toEqual([])
    expect(filasDe('categoria', { id: 3, nombre: { es: 'Playas', en: 'Beaches' }, slug: { es: 'playas', en: 'beaches' } }).map((f) => f.slug)).toEqual(['playas', 'beaches'])
  })
})
```

```ts
// tests/int/busqueda.int.test.ts
import type { Payload, Where } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { crearCategoria, crearImagen, crearLugar, crearZona, limpiar, obtenerPayload } from './utils'

let payload: Payload
const filas = (where: Where = {}) => payload.find({ collection: 'indice-busqueda', where, overrideAccess: true, pagination: false }).then((r) => r.docs)

describe('índice de búsqueda', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('publicar indexa, despublicar y borrar quitan', async () => {
    const zona = await crearZona(payload)
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    const l = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'indexado-x' })
    expect((await filas({ tipo: { equals: 'lugar' } })).map((f) => f.idioma)).toEqual(['es'])
    await payload.update({ collection: 'lugares', id: l.id, data: { _status: 'draft' }, overrideAccess: true })
    expect(await filas({ tipo: { equals: 'lugar' } })).toEqual([])
    await payload.update({ collection: 'lugares', id: l.id, data: { _status: 'published' }, overrideAccess: true })
    await payload.delete({ collection: 'lugares', id: l.id, overrideAccess: true })
    expect(await filas({ tipo: { equals: 'lugar' } })).toEqual([])
  })

  it('el público no lee el índice', async () => {
    await expect(payload.find({ collection: 'indice-busqueda', overrideAccess: false })).rejects.toThrow()
  })

  it('un error al indexar no tumba el guardado del documento', async () => {
    // forzarFalloIndice obliga a indexar() a fallar dentro de su savepoint (ver indexar.ts).
    const cat = await crearCategoria(payload)
    const actualizada = await payload.update({
      collection: 'categorias', id: cat.id, data: { orden: 7 }, overrideAccess: true, context: { forzarFalloIndice: true },
    })
    expect(actualizada.orden).toBe(7)
    expect((await payload.findByID({ collection: 'categorias', id: cat.id, overrideAccess: true })).orden).toBe(7)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/filas-busqueda.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// src/collections/IndiceBusqueda.ts
import type { CollectionConfig } from 'payload'

import { nadie, soloAdmin } from '../acceso/reglas'
import { TIPOS_BUSQUEDA } from '../dominio/busqueda'

// Índice de la búsqueda por idioma (decisión 13). Lo escriben solo los hooks (src/busqueda/indexar.ts) y lo lee
// la consulta SQL del servidor. El público nunca lo lee por la API.
export const IndiceBusqueda: CollectionConfig = {
  slug: 'indice-busqueda',
  admin: { hidden: true },
  access: { read: soloAdmin, create: nadie, update: nadie, delete: nadie },
  indexes: [{ fields: ['tipo', 'docId', 'idioma'], unique: true }],
  fields: [
    { name: 'tipo', type: 'select', required: true, options: TIPOS_BUSQUEDA.map((t) => ({ label: t, value: t })) },
    { name: 'docId', type: 'number', required: true },
    // «idioma» y no «locale»: evita chocar con nombres que Payload usa en la localización.
    { name: 'idioma', type: 'select', required: true, options: ['es', 'en'].map((l) => ({ label: l, value: l })) },
    { name: 'slug', type: 'text', required: true },
    { name: 'titulo', type: 'text', required: true },
    { name: 'texto', type: 'textarea' },
    { name: 'zonaIds', type: 'json' },
    { name: 'categoriaIds', type: 'json' },
    { name: 'inicio', type: 'date' },
    { name: 'fin', type: 'date' },
    { name: 'patrocinioActivo', type: 'checkbox', defaultValue: false },
    { name: 'patrocinioDesde', type: 'date' },
    { name: 'patrocinioHasta', type: 'date' },
  ],
}
```

```ts
// src/busqueda/filas.ts
import type { TipoBusqueda } from '../dominio/busqueda'
import { aplanarIdioma, CAMPOS_IDIOMA, CAMPOS_LOCALIZADOS, existeEnIdioma, LOCALES, textoDeLexical, type Locale } from '../dominio/idioma'

export type FilaIndice = {
  tipo: TipoBusqueda
  docId: number
  locale: Locale
  slug: string
  titulo: string
  texto: string
  zonaIds: number[]
  categoriaIds: number[]
  inicio: string | null
  fin: string | null
  patrocinioActivo: boolean
  patrocinioDesde: string | null
  patrocinioHasta: string | null
}

type Doc = Record<string, unknown>
const idDe = (v: unknown): number | null => (typeof v === 'number' ? v : v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'number' ? (v as { id: number }).id : null)
const ids = (v: unknown): number[] => (Array.isArray(v) ? v : v == null ? [] : [v]).map(idDe).filter((x): x is number => x !== null)
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const iso = (v: unknown) => (typeof v === 'string' && v ? new Date(v).toISOString() : null)
const MAX_TEXTO = 20_000

function base(tipo: TipoBusqueda, doc: Doc, locale: Locale, slug: string, titulo: string, texto: string): FilaIndice {
  const p = (doc.patrocinio ?? {}) as { activo?: boolean; desde?: string; hasta?: string }
  return {
    tipo, docId: doc.id as number, locale, slug, titulo, texto: texto.slice(0, MAX_TEXTO),
    zonaIds: ids(doc.zonas ?? doc.zona), categoriaIds: ids(doc.categorias),
    inicio: iso(doc.inicio), fin: iso(doc.fin),
    patrocinioActivo: Boolean(p.activo), patrocinioDesde: iso(p.desde), patrocinioHasta: iso(p.hasta),
  }
}

// Qué entra al índice (spec §6, §7): solo lo publicado (zonas: activas) y en los idiomas en que existe.
// `doc` viene de la tabla principal con locale 'all' (cada campo localizado como { es, en }).
export function filasDe(tipo: TipoBusqueda, doc: Doc | null): FilaIndice[] {
  if (!doc) return []
  const salida: FilaIndice[] = []
  for (const l of LOCALES) {
    if (tipo === 'lugar' || tipo === 'evento' || tipo === 'articulo') {
      if (doc._status !== 'published') return []
      const col = tipo === 'lugar' ? 'lugares' : tipo === 'evento' ? 'eventos' : 'articulos'
      // nombre de lugar no es localizado; nombre de evento y titulo de artículo sí (están en CAMPOS_LOCALIZADOS).
      const plano = aplanarIdioma(doc, l, CAMPOS_LOCALIZADOS[col])
      if (!existeEnIdioma(plano, CAMPOS_IDIOMA[col])) continue
      const titulo = tipo === 'lugar' ? str(doc.nombre) : tipo === 'evento' ? str(plano.nombre) : str(plano.titulo)
      salida.push(base(tipo, doc, l, str(plano.slug), titulo, `${titulo} ${str(plano.resumen)} ${textoDeLexical(plano.cuerpo)}`))
    } else if (tipo === 'zona') {
      if (!doc.activa) return []
      const plano = aplanarIdioma(doc, l, ['nombre', 'descripcion'])
      if (!str(plano.nombre)) continue
      salida.push(base(tipo, { ...doc, zona: doc.id }, l, str(doc.slug), str(plano.nombre), `${str(plano.nombre)} ${str(plano.descripcion)}`))
    } else {
      const plano = aplanarIdioma(doc, l, ['nombre', 'slug'])
      if (!str(plano.nombre) || !str(plano.slug)) continue
      salida.push(base(tipo, { ...doc, categorias: [doc.id] }, l, str(plano.slug), str(plano.nombre), str(plano.nombre)))
    }
  }
  return salida
}
```

```ts
// src/busqueda/indexar.ts
import { sql } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'

import type { TipoBusqueda } from '../dominio/busqueda'
import { filasDe, type FilaIndice } from './filas'

const COLECCION: Record<TipoBusqueda, 'lugares' | 'eventos' | 'articulos' | 'zonas' | 'categorias'> = {
  lugar: 'lugares', evento: 'eventos', articulo: 'articulos', zona: 'zonas', categoria: 'categorias',
}

type Db = { execute(q: unknown): Promise<unknown>; transaction<T>(f: (tx: Db) => Promise<T>): Promise<T> }

// La conexión de la transacción del req (o la general). db.transaction() sobre ella abre un SAVEPOINT: un error de
// SQL revierte solo el índice, nunca el guardado del documento (plan F3c). getTransaction de @payloadcms/drizzle no
// se exporta; `sessions` sí es parte del tipo público del adaptador.
async function conexion(req: PayloadRequest): Promise<Db> {
  const adaptador = req.payload.db as unknown as { drizzle: Db; sessions?: Record<string | number, { db: Db }> }
  const id = req.transactionID ? await req.transactionID : undefined
  return (id !== undefined && adaptador.sessions?.[id]?.db) || adaptador.drizzle
}

async function escribir(db: Db, tipo: TipoBusqueda, id: number, filas: FilaIndice[], forzarFallo: boolean) {
  await db.transaction(async (sp) => {
    const locales = filas.map((f) => f.locale)
    await sp.execute(sql`DELETE FROM indice_busqueda WHERE tipo = ${tipo} AND doc_id = ${id}
      AND NOT (idioma::text = ANY(${sql.param(locales)}::text[]))`) // un solo parámetro: drizzle expandiría el arreglo
    for (const f of filas) {
      await sp.execute(sql`INSERT INTO indice_busqueda
        (tipo, doc_id, idioma, slug, titulo, texto, zona_ids, categoria_ids, inicio, fin, patrocinio_activo, patrocinio_desde, patrocinio_hasta)
        VALUES (${f.tipo}, ${f.docId}, ${f.locale}, ${f.slug}, ${f.titulo}, ${f.texto}, ${JSON.stringify(f.zonaIds)}::jsonb,
          ${JSON.stringify(f.categoriaIds)}::jsonb, ${f.inicio}, ${f.fin}, ${f.patrocinioActivo}, ${f.patrocinioDesde}, ${f.patrocinioHasta})
        ON CONFLICT (tipo, doc_id, idioma) DO UPDATE SET slug = EXCLUDED.slug, titulo = EXCLUDED.titulo, texto = EXCLUDED.texto,
          zona_ids = EXCLUDED.zona_ids, categoria_ids = EXCLUDED.categoria_ids, inicio = EXCLUDED.inicio, fin = EXCLUDED.fin,
          patrocinio_activo = EXCLUDED.patrocinio_activo, patrocinio_desde = EXCLUDED.patrocinio_desde,
          patrocinio_hasta = EXCLUDED.patrocinio_hasta, updated_at = now()`)
    }
    if (forzarFallo) await sp.execute(sql`SELECT 1/0`)
  })
}

export async function indexar(req: PayloadRequest, tipo: TipoBusqueda, id: number): Promise<void> {
  try {
    const doc = (await req.payload.db.findOne({ collection: COLECCION[tipo], where: { id: { equals: id } }, locale: 'all', req })) as Record<string, unknown> | null
    await escribir(await conexion(req), tipo, id, filasDe(tipo, doc), Boolean(req.context?.forzarFalloIndice))
  } catch (e) {
    req.payload.logger.error({ msg: 'No se pudo actualizar el índice de búsqueda', tipo, id, err: e instanceof Error ? e.message : String(e) })
  }
}

export async function reindexarTodo(payload: Payload): Promise<number> {
  let n = 0
  for (const tipo of Object.keys(COLECCION) as TipoBusqueda[]) {
    const { docs } = await payload.find({ collection: COLECCION[tipo], overrideAccess: true, pagination: false, depth: 0, draft: false })
    for (const d of docs) {
      await indexar({ payload, context: {} } as unknown as PayloadRequest, tipo, d.id as number)
      n++
    }
  }
  return n
}
```

`forzarFalloIndice` existe solo para la prueba de integración que demuestra el savepoint. Es un `context` interno que el admin no puede mandar.

```ts
// src/busqueda/hooks.ts
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { TipoBusqueda } from '../dominio/busqueda'
import { indexar } from './indexar'

// El seed no pone sinIndice: sus guardados indexan solos (previews y E2E tienen búsqueda).
export function hooksDeIndice(tipo: TipoBusqueda) {
  const afterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
    if (!req.context?.sinIndice) await indexar(req, tipo, doc.id as number)
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
    if (!req.context?.sinIndice) await indexar(req, tipo, doc.id as number)
    return doc
  }
  return { afterChange, afterDelete }
}
```

```ts
// src/busqueda/reindexar.ts
import { getPayload } from 'payload'

import config from '../payload.config'
import { reindexarTodo } from './indexar'

// npm run busqueda:reindexar — tras cambiar filasDe o restaurar un respaldo (docs/operacion.md).
const payload = await getPayload({ config })
const n = await reindexarTodo(payload)
payload.logger.info(`Índice de búsqueda: ${n} documentos revisados.`)
process.exit(0)
```

Registra la colección y los hooks:

- `payload.config.ts`: importa `IndiceBusqueda` y agrégalo al final de `collections`.
- `Lugares`, `Eventos`, `Articulos`, `Zonas` y `Categorias`: `const indice = hooksDeIndice('lugar' | 'evento' | 'articulo' | 'zona' | 'categoria')`. Agrega `indice.afterChange` al final de `afterChange` e `indice.afterDelete` al final de `afterDelete`, después de los de revalidación de F3a.
- `src/seed/vaciar.ts`: en `ORDEN`, agrega `'indice-busqueda'` y `'payload-jobs'` al principio. `payload-jobs` existe desde la Task 9; agrégalo ya, y si la colección todavía no existe en el config, quítalo de aquí y ponlo en la Task 9.
- `package.json`: `"busqueda:reindexar": "cross-env NODE_OPTIONS=--no-deprecation payload run src/busqueda/reindexar.ts"`.

Rehaz la migración y los tipos:

```bash
npm run migracion:regenerar -- --no-hay-deploy
npm run generate:types
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/unit/filas-busqueda.test.ts`, `npm run test:int -- tests/int/busqueda.int.test.ts`, `npm run test:int` (completo) y `npm run typecheck`
Expected: PASS. La prueba «un error al indexar no tumba el guardado» deja en el log «No se pudo actualizar el índice de búsqueda», que es lo esperado.

- [ ] **Step 5: Commit**

```bash
git add src/collections src/busqueda src/payload.config.ts src/seed/vaciar.ts package.json src/migrations src/payload-types.ts tests/unit/filas-busqueda.test.ts tests/int/busqueda.int.test.ts
git commit -m "feat: índice de búsqueda por idioma mantenido por hooks con savepoint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Migración `busqueda` y consultas full-text

**Files:**
- Create: `scripts/migraciones/busqueda.ts.txt`, `src/busqueda/consulta.ts`
- Modify: `scripts/regenerar-migracion.mjs`, `AGENTS.md`, `docs/operacion.md`
- Regenerate: `src/migrations/*` (`inicial` + `busqueda`)
- Test: `tests/int/busqueda.int.test.ts` (segunda parte: consultas)

**Interfaces:**
- Consumes: `consultaPrefijo`, `FilaResultado` (Task 1); tabla `indice_busqueda` (Task 2).
- Produces:
  - `coincidencias(payload: Payload, a: { q: string; lang: Locale; tipo?: TipoBusqueda | null; zonaId?: number | null }): Promise<FilaResultado[]>`: hasta 500, JSON puro.
  - `sugerencias(payload: Payload, a: { q: string; lang: Locale }): Promise<{ tipo: TipoBusqueda; docId: number; slug: string; titulo: string; zonaIds: number[] }[]>`: hasta 8.

- [ ] **Step 1: Write the failing test**

Agrega a `tests/int/busqueda.int.test.ts`:

```ts
import { coincidencias, sugerencias } from '../../src/busqueda/consulta'

describe('consultas de búsqueda', () => {
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('encuentra sin acentos, con plurales, por idioma; el patrocinio va como dato', async () => {
    const zona = await crearZona(payload, { slug: 'la-paz', nombre: 'La Paz' })
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'cafe-duna' })
    const r = await coincidencias(payload, { q: 'cafes', lang: 'es' })
    expect(r.map((x) => x.slug)).toContain('cafe-duna')
    expect(await coincidencias(payload, { q: 'cafes', lang: 'en' })).toEqual([])
    expect(r[0]).toMatchObject({ tipo: 'lugar', zonaIds: [zona.id], patrocinio: { activo: false } })
    expect(JSON.parse(JSON.stringify(r))).toEqual(r)
  })

  it('filtra por tipo y zona; sugiere por prefijo y aguanta entradas hostiles', async () => {
    const zona = await crearZona(payload, { slug: 'la-paz', nombre: 'La Paz' })
    const otra = await crearZona(payload, { slug: 'otra', nombre: 'Otra' })
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'cafe-duna' })
    expect(await coincidencias(payload, { q: 'cafe', lang: 'es', zonaId: otra.id })).toEqual([])
    expect((await coincidencias(payload, { q: 'cafe', lang: 'es', tipo: 'zona' })).length).toBe(0)
    expect((await sugerencias(payload, { q: 'caf', lang: 'es' })).map((s) => s.slug)).toContain('cafe-duna')
    await expect(sugerencias(payload, { q: 'a) & !', lang: 'es' })).resolves.toBeInstanceOf(Array)
  })
})
```

`crearLugar` llena `nombre` a partir del `slugEs` (revisa `tests/int/utils.ts`). Si el nombre queda distinto de «cafe duna», ajusta los términos `cafe`/`caf` para que coincidan con lo que realmente genera.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:int -- tests/int/busqueda.int.test.ts`
Expected: FAIL (no existe `src/busqueda/consulta`).

- [ ] **Step 3: Write the implementation**

```text
// scripts/migraciones/busqueda.ts.txt
import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Migración escrita a mano (plan F3c): búsqueda por idioma con unaccent e índices GIN. La rehace
// `npm run migracion:regenerar` después de `inicial`; no editar el archivo generado, sino esta plantilla.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS unaccent;
    CREATE OR REPLACE FUNCTION guia_unaccent(text) RETURNS text
      LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
      AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
    CREATE INDEX IF NOT EXISTS indice_busqueda_fts_es ON indice_busqueda
      USING gin (to_tsvector('spanish', guia_unaccent(titulo || ' ' || coalesce(texto, '')))) WHERE idioma = 'es';
    CREATE INDEX IF NOT EXISTS indice_busqueda_fts_en ON indice_busqueda
      USING gin (to_tsvector('english', guia_unaccent(titulo || ' ' || coalesce(texto, '')))) WHERE idioma = 'en';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS indice_busqueda_fts_en;
    DROP INDEX IF EXISTS indice_busqueda_fts_es;
    DROP FUNCTION IF EXISTS guia_unaccent(text);
  `)
}
```

En `scripts/regenerar-migracion.mjs`, reemplaza el final (desde `const r = spawnSync(…)`) por:

```js
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const crear = (nombre) =>
  spawnSync('npx', ['payload', 'migrate:create', nombre, '--force-accept-warning'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, NODE_OPTIONS: '--no-deprecation' },
  }).status ?? 1

if (crear('inicial') !== 0) process.exit(1)
// Segundo proceso: fecha posterior, así `busqueda` corre después de `inicial` (writeMigrationIndex ordena por nombre).
if (crear('busqueda') !== 0) process.exit(1)
const archivo = readdirSync('src/migrations').find((f) => /_busqueda\.ts$/.test(f))
if (!archivo) {
  console.error('No se creó la migración busqueda')
  process.exit(1)
}
writeFileSync(`src/migrations/${archivo}`, readFileSync('scripts/migraciones/busqueda.ts.txt', 'utf8'))
const indice = readFileSync('src/migrations/index.ts', 'utf8')
if (!(indice.indexOf('_inicial') > -1 && indice.indexOf('_inicial') < indice.indexOf('_busqueda'))) {
  console.error('En src/migrations/index.ts, inicial debe ir antes que busqueda')
  process.exit(1)
}
```

Junta los `import` arriba del archivo. Si `--force-accept-warning` no crea la migración vacía de `busqueda` con Payload 3.92.1, revisa `npx payload migrate:create --help` y usa la bandera que la cree sin preguntar. No la crees a mano: `index.ts` y el `.json` tienen que salir de Payload.

En `AGENTS.md`, cambia la regla de migraciones a: «Hasta el primer deploy a producción hay **dos** migraciones: `inicial` y `busqueda` (escrita a mano desde `scripts/migraciones/busqueda.ts.txt`). `npm run migracion:regenerar -- --no-hay-deploy` rehace las dos.»

En `docs/operacion.md`, agrega dos secciones:

- **Búsqueda:** `npm run busqueda:reindexar` vuelve a llenar el índice. Se corre después de restaurar un respaldo o de cambiar `src/busqueda/filas.ts`.
- **Base `preview`:** cuando un PR rehace `inicial`, se borra la base `preview` (`npx payload migrate:fresh` con su `DATABASE_URL`) y se corre el seed antes de autorizar el preview.

```ts
// src/busqueda/consulta.ts
import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { consultaPrefijo, type FilaResultado, type TipoBusqueda } from '../dominio/busqueda'
import type { Locale } from '../dominio/idioma'

const CONFIG: Record<Locale, string> = { es: 'spanish', en: 'english' }
const TOPE = 500

type Db = { execute(q: unknown): Promise<{ rows: Record<string, unknown>[] }> }
const db = (payload: Payload) => (payload.db as unknown as { drizzle: Db }).drizzle
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null)

// Todas las coincidencias del término en el idioma (hasta 500), como JSON puro. El orden con patrocinios, la
// exclusión de eventos pasados y la paginación se hacen fuera de la caché (plan F3c).
export async function coincidencias(
  payload: Payload,
  a: { q: string; lang: Locale; tipo?: TipoBusqueda | null; zonaId?: number | null },
): Promise<FilaResultado[]> {
  if (!a.q) return []
  // Literales (de un mapa fijo, nunca del visitante) para que la consulta coincida con los índices parciales GIN.
  const cfg = sql.raw(`'${CONFIG[a.lang]}'`)
  const idioma = sql.raw(`'${a.lang}'`)
  const { rows } = await db(payload).execute(sql`
    SELECT tipo, doc_id, slug, titulo, left(coalesce(texto, ''), 300) AS texto, zona_ids, categoria_ids, inicio, fin,
      patrocinio_activo, patrocinio_desde, patrocinio_hasta,
      ts_rank(to_tsvector(${cfg}::regconfig, guia_unaccent(titulo || ' ' || coalesce(texto, ''))),
              websearch_to_tsquery(${cfg}::regconfig, guia_unaccent(${a.q}))) AS rank
    FROM indice_busqueda
    WHERE idioma = ${idioma}
      AND to_tsvector(${cfg}::regconfig, guia_unaccent(titulo || ' ' || coalesce(texto, '')))
          @@ websearch_to_tsquery(${cfg}::regconfig, guia_unaccent(${a.q}))
      ${a.tipo ? sql`AND tipo = ${a.tipo}` : sql``}
      ${a.zonaId ? sql`AND zona_ids @> ${JSON.stringify([a.zonaId])}::jsonb` : sql``}
    ORDER BY rank DESC
    LIMIT ${TOPE}`)
  return rows.map((r) => ({
    tipo: r.tipo as TipoBusqueda,
    docId: Number(r.doc_id),
    slug: String(r.slug),
    titulo: String(r.titulo),
    texto: String(r.texto),
    zonaIds: (r.zona_ids as number[] | null) ?? [],
    categoriaIds: (r.categoria_ids as number[] | null) ?? [],
    inicio: iso(r.inicio),
    fin: iso(r.fin),
    rank: Number(r.rank),
    patrocinio: { activo: Boolean(r.patrocinio_activo), desde: iso(r.patrocinio_desde), hasta: iso(r.patrocinio_hasta) },
  }))
}

// Sugerencias de la cabecera: por prefijo, sin caché (decisión de este plan). Pocos resultados, query indexado.
export async function sugerencias(payload: Payload, a: { q: string; lang: Locale }) {
  const consulta = consultaPrefijo(a.q)
  if (!consulta) return []
  const cfg = sql.raw(`'${CONFIG[a.lang]}'`)
  const idioma = sql.raw(`'${a.lang}'`)
  const { rows } = await db(payload).execute(sql`
    SELECT tipo, doc_id, slug, titulo, zona_ids FROM indice_busqueda
    WHERE idioma = ${idioma}
      AND (tipo <> 'evento' OR coalesce(fin, inicio) >= now())
      AND to_tsvector(${cfg}::regconfig, guia_unaccent(titulo || ' ' || coalesce(texto, ''))) @@ to_tsquery(${cfg}::regconfig, guia_unaccent(${consulta}))
    ORDER BY CASE tipo WHEN 'zona' THEN 0 WHEN 'categoria' THEN 1 ELSE 2 END, titulo
    LIMIT 8`)
  return rows.map((r) => ({ tipo: r.tipo as TipoBusqueda, docId: Number(r.doc_id), slug: String(r.slug), titulo: String(r.titulo), zonaIds: (r.zona_ids as number[] | null) ?? [] }))
}
```

Rehaz las migraciones (ahora salen dos) y comprueba el orden:

```bash
npm run migracion:regenerar -- --no-hay-deploy
grep -n 'inicial\|busqueda' src/migrations/index.ts
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:int` (completo; `migrate:fresh` aplica `inicial` y luego `busqueda`) y `npm run typecheck`
Expected: PASS. Si el resultado de `execute` de drizzle no trae `.rows` con el adaptador `pg` instalado (por ejemplo, porque devuelve el arreglo directo), ajusta `Db`/`rows` a la forma real y anótalo en el reporte.

- [ ] **Step 5: Commit**

```bash
git add scripts src/busqueda/consulta.ts src/migrations AGENTS.md docs/operacion.md tests/int/busqueda.int.test.ts
git commit -m "feat: migración de búsqueda con unaccent e índices GIN, y consultas por idioma

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Página de búsqueda y sugerencias de la cabecera

**Files:**
- Create: `src/app/(sitio)/[lang]/guia/buscar/page.tsx`, `src/app/(sitio)/[lang]/guia/buscar/sugerencias/route.ts`, `src/sitio/estilos/busqueda.css`
- Modify: `src/dominio/rutas.ts`, `src/sitio/datos/llaves.ts`, `src/sitio/datos/cacheadas.ts`, `src/sitio/ui/CabeceraCliente.tsx`, `src/sitio/ui/Cabecera.tsx`, `src/sitio/textos.ts`
- Test: `tests/unit/rutas-consulta.test.ts` (agregar), `tests/unit/llaves.test.ts` (agregar)

**Interfaces:**
- Consumes: `coincidencias`, `sugerencias` (Task 3); `leerConsultaBusqueda`, `ordenarGrupo`, `partesResaltadas` (Task 1); `paginar`, las listas de F3b y `Paginacion`.
- Produces:
  - `rutas.sugerencias(lang)`.
  - `LLAVES.coincidencias(q, lang, tipo, zonaId)` y `coincidenciasCacheadas(q, lang, tipo, zonaId)`.
  - `textos(lang).busqueda`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/rutas-consulta.test.ts (agregar)
import { rutas } from '../../src/dominio/rutas'

it('rutas.sugerencias por idioma', () => {
  expect(rutas.sugerencias('es')).toBe('/es/guia/buscar/sugerencias')
  expect(rutas.sugerencias('en')).toBe('/en/guide/search/sugerencias')
})
```

```ts
// tests/unit/llaves.test.ts (agregar)
it('coincidencias: llave sin hora ni página', () => {
  expect(LLAVES.coincidencias('cafe', 'es', null, null)).toEqual({
    llave: ['coincidencias', 'cafe', 'es', '', ''],
    etiquetas: ['categorias', 'listados', 'zonas'],
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/rutas-consulta.test.ts tests/unit/llaves.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

En `src/dominio/rutas.ts`, dentro de `rutas`, agrega: `sugerencias: (l: Locale) => \`${base(l)}/${SEGMENTOS[l].buscar}/sugerencias\``. El proxy reescribe `/en/guide/search/sugerencias` a `/en/guia/buscar/sugerencias`.

En `llaves.ts`: `coincidencias: (q: string, lang: Locale, tipo: string | null, zonaId: number | null): Llave => ({ llave: ['coincidencias', q, lang, tipo ?? '', zonaId ? String(zonaId) : ''], etiquetas: [etiqueta.categorias, etiqueta.listados, etiqueta.zonas] })`.

En `cacheadas.ts`, importa `coincidencias` desde `../../busqueda/consulta` y agrega `export const coincidenciasCacheadas = cachear((payload, q: string, lang: Locale, tipo: TipoBusqueda | null, zonaId: number | null) => coincidencias(payload, { q, lang, tipo, zonaId }), LLAVES.coincidencias)`.

En `textos.ts`, agrega a los dos idiomas:

```ts
  // ES
  busqueda: {
    titulo: (q: string) => (q ? `Resultados para «${q}»` : 'Buscar en la Guía'),
    vacio: (q: string) => `No encontramos nada para «${q}».`,
    sugerencia: 'Prueba con otra palabra o explora por zona.',
    tipos: { lugar: 'Lugares', evento: 'Eventos', articulo: 'Artículos', zona: 'Zonas', categoria: 'Categorías' },
    todos: 'Todo',
    todasLasZonas: 'Todas las zonas',
    buscar: 'Buscar',
    sinResultados: 'Sin resultados',
  },
  // EN
  busqueda: {
    titulo: (q: string) => (q ? `Results for “${q}”` : 'Search the Guide'),
    vacio: (q: string) => `We found nothing for “${q}”.`,
    sugerencia: 'Try another word or browse by area.',
    tipos: { lugar: 'Places', evento: 'Events', articulo: 'Articles', zona: 'Areas', categoria: 'Categories' },
    todos: 'All',
    todasLasZonas: 'All areas',
    buscar: 'Search',
    sinResultados: 'No results',
  },
```

`src/sitio/estilos/busqueda.css` es el `<style>` de `docs/diseno/propuestas/c-busqueda.html`, sin la etiqueta.

```ts
// src/app/(sitio)/[lang]/guia/buscar/sugerencias/route.ts
import { NextResponse } from 'next/server'

import { sugerencias } from '../../../../../../busqueda/consulta'
import { esLocale } from '../../../../../../dominio/idioma'
import { limpiarTermino } from '../../../../../../dominio/busqueda'
import { rutas } from '../../../../../../dominio/rutas'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, lugaresCacheados, zonasActivasCacheadas,
} from '../../../../../../sitio/datos/cacheadas'
import { categoriasConLugares } from '../../../../../../sitio/datos/consultas'
import { obtenerPayload } from '../../../../../../sitio/datos/payload'

// Ruta interna de la Guía para la cabecera; no es parte del contrato v1 (spec §7).
export async function GET(request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!esLocale(lang)) return NextResponse.json([], { status: 404 })
  const q = limpiarTermino(new URL(request.url).searchParams.get('q'))
  if (q.length < 2) return NextResponse.json([])
  const [filas, lugares, eventos, articulos, zonas, cats] = await Promise.all([
    sugerencias(await obtenerPayload(), { q, lang }),
    lugaresCacheados(lang), eventosCacheados(lang), articulosCacheados(lang), zonasActivasCacheadas(lang), categoriasCacheadas(lang),
  ])
  const visibles: Record<string, Set<number>> = {
    lugar: new Set(lugares.map((x) => x.id)),
    evento: new Set(eventos.map((x) => x.id)),
    articulo: new Set(articulos.map((x) => x.id)),
    zona: new Set(zonas.map((x) => x.id)),
    categoria: new Set(categoriasConLugares(lugares, cats).map((x) => x.id)),
  }
  const ruta = (t: string, slug: string) =>
    t === 'lugar' ? rutas.lugar(lang, slug) : t === 'evento' ? rutas.evento(lang, slug) : t === 'articulo' ? rutas.articulo(lang, slug) : t === 'zona' ? rutas.zona(lang, slug) : rutas.categoria(lang, slug)
  return NextResponse.json(filas.filter((f) => visibles[f.tipo].has(f.docId)).map((f) => ({ tipo: f.tipo, titulo: f.titulo, ruta: ruta(f.tipo, f.slug) })), {
    headers: { 'Cache-Control': 'public, max-age=60' },
  })
}
```

```tsx
// src/app/(sitio)/[lang]/guia/buscar/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { esEventoProximo } from '../../../../../dominio/eventos'
import { leerConsultaBusqueda, ordenarGrupo, partesResaltadas, TIPOS_BUSQUEDA, type FilaResultado } from '../../../../../dominio/busqueda'
import { esLocale, type Locale } from '../../../../../dominio/idioma'
import { paginar } from '../../../../../dominio/paginacion'
import { patrocinioDeclarado } from '../../../../../dominio/patrocinio'
import { conConsulta, rutas } from '../../../../../dominio/rutas'
import {
  articulosCacheados, categoriasCacheadas, coincidenciasCacheadas, eventosCacheados, lugaresCacheados, zonasActivasCacheadas,
} from '../../../../../sitio/datos/cacheadas'
import { categoriasConLugares, porSlug } from '../../../../../sitio/datos/consultas'
import '../../../../../sitio/estilos/busqueda.css'
import { paramsDe, type SearchParams } from '../../../../../sitio/paginas/comun'
import { textos } from '../../../../../sitio/textos'
import { Paginacion } from '../../../../../sitio/ui/Paginacion'

// Spec §7: dinámica, noindex, fuera del sitemap. El término se muestra siempre como texto (React lo escapa).
export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ lang: string }>; searchParams: SearchParams }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!esLocale(lang)) return {}
  return { title: textos(lang).busqueda.titulo(''), robots: { index: false, follow: true }, alternates: { canonical: rutas.buscar(lang) } }
}

const POR_GRUPO_SIN_FILTRO = 6

function rutaDe(lang: Locale, f: FilaResultado) {
  return f.tipo === 'lugar' ? rutas.lugar(lang, f.slug) : f.tipo === 'evento' ? rutas.evento(lang, f.slug) : f.tipo === 'articulo' ? rutas.articulo(lang, f.slug) : f.tipo === 'zona' ? rutas.zona(lang, f.slug) : rutas.categoria(lang, f.slug)
}

function Resaltado({ texto, q }: { texto: string; q: string }) {
  return <>{partesResaltadas(texto, q).map((p, i) => (p.coincide ? <mark key={i}>{p.texto}</mark> : <span key={i}>{p.texto}</span>))}</>
}

export default async function Buscar({ params, searchParams }: Props) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  const consulta = leerConsultaBusqueda(paramsDe(await searchParams))
  const t = textos(lang)
  const zonas = await zonasActivasCacheadas(lang)
  const zona = consulta.zona ? porSlug(zonas, consulta.zona) : undefined
  const ahora = new Date()
  const [todas, lugares, eventos, articulos, cats] = await Promise.all([
    consulta.q ? coincidenciasCacheadas(consulta.q, lang, consulta.tipo, zona?.id ?? null) : Promise.resolve([]),
    lugaresCacheados(lang), eventosCacheados(lang), articulosCacheados(lang), categoriasCacheadas(lang),
  ])
  // Solo lo que el público puede abrir: lo que está en las listas del idioma (F3b). Una categoría sin lugares o un
  // lugar de una zona inactiva darían 404 (plan F3c).
  const visibles: Record<string, Set<number>> = {
    lugar: new Set(lugares.map((x) => x.id)),
    evento: new Set(eventos.map((x) => x.id)),
    articulo: new Set(articulos.map((x) => x.id)),
    zona: new Set(zonas.map((x) => x.id)),
    categoria: new Set(categoriasConLugares(lugares, cats).map((x) => x.id)),
  }
  // Eventos pasados fuera (spec §7); el orden con patrocinios y la paginación, sobre el grupo completo.
  const vigentes = todas
    .filter((f) => visibles[f.tipo].has(f.docId))
    .filter((f) => f.tipo !== 'evento' || esEventoProximo({ inicio: f.inicio ?? '', fin: f.fin }, ahora))
  const grupos = TIPOS_BUSQUEDA.map((tipo) => ({ tipo, filas: ordenarGrupo(vigentes.filter((f) => f.tipo === tipo), ahora) })).filter((g) => g.filas.length)
  const ruta = rutas.buscar(lang)
  const consultaCon = (cambio: Record<string, string | null>) => {
    const p = new URLSearchParams({ q: consulta.q })
    const f = { tipo: consulta.tipo, zona: consulta.zona, ...cambio }
    if (f.tipo) p.set('tipo', f.tipo)
    if (f.zona) p.set('zona', f.zona)
    return p.toString()
  }
  const pagina = consulta.tipo ? paginar(grupos[0]?.filas ?? [], consulta.pagina) : null
  if (consulta.tipo && !pagina && consulta.pagina > 1) notFound()

  return (
    <div className="ancho">
      <section className="busca-cabeza" aria-labelledby="titulo">
        <form className="busca-grande" role="search" action={ruta}>
          <label className="solo-lector" htmlFor="q-grande">{t.cabecera.buscar}</label>
          <input id="q-grande" type="search" name="q" defaultValue={consulta.q} placeholder={t.cabecera.ejemplo} />
          <button type="submit">{t.busqueda.buscar}</button>
        </form>
        <h1 id="titulo">{t.busqueda.titulo(consulta.q)}</h1>
        {consulta.q && (
          <nav className="pildoras" aria-label={t.listado.filtros}>
            <Link className="chip" href={conConsulta(ruta, consultaCon({ tipo: null }))} aria-current={!consulta.tipo ? 'page' : undefined}>{t.busqueda.todos}</Link>
            {(['lugar', 'evento', 'articulo'] as const).map((tipo) => (
              <Link key={tipo} className="chip" href={conConsulta(ruta, consultaCon({ tipo }))} aria-current={consulta.tipo === tipo ? 'page' : undefined}>{t.busqueda.tipos[tipo]}</Link>
            ))}
            <span className="separador" aria-hidden="true" />
            <Link className="chip" href={conConsulta(ruta, consultaCon({ zona: null }))} aria-current={!consulta.zona ? 'page' : undefined}>{t.busqueda.todasLasZonas}</Link>
            {zonas.map((z) => (
              <Link key={z.id} className="chip" href={conConsulta(ruta, consultaCon({ zona: z.slug }))} aria-current={consulta.zona === z.slug ? 'page' : undefined}>{z.nombre}</Link>
            ))}
          </nav>
        )}
      </section>

      {consulta.q && !grupos.length && (
        <section className="vacio" aria-labelledby="t-vacio">
          <h2 id="t-vacio">{t.busqueda.vacio(consulta.q)}</h2>
          <p>{t.busqueda.sugerencia}</p>
        </section>
      )}

      {grupos.map((g) => {
        const filas = consulta.tipo ? (pagina?.items ?? []) : g.filas.slice(0, POR_GRUPO_SIN_FILTRO)
        return (
          <section key={g.tipo} className="grupo" aria-labelledby={`g-${g.tipo}`}>
            <h2 id={`g-${g.tipo}`}>{t.busqueda.tipos[g.tipo]} <small>{g.filas.length}</small></h2>
            <div className="resultados">
              {filas.map((f) => {
                const declarado = (f.tipo === 'lugar' || f.tipo === 'evento') && patrocinioDeclarado(f.patrocinio, ahora)
                return (
                  <Link key={`${f.tipo}-${f.docId}`} className="resultado presionable" href={rutaDe(lang, f)} rel={declarado ? 'sponsored' : undefined}>
                    {declarado && <span className="patrocinado">{t.tarjetas.patrocinado}</span>}
                    <p className="titular"><Resaltado texto={f.titulo} q={consulta.q} /></p>
                    {f.texto && <p className="bajada"><Resaltado texto={f.texto.slice(0, 160)} q={consulta.q} /></p>}
                  </Link>
                )
              })}
            </div>
            {!consulta.tipo && g.filas.length > POR_GRUPO_SIN_FILTRO && (g.tipo === 'lugar' || g.tipo === 'evento' || g.tipo === 'articulo') && (
              <Link href={conConsulta(ruta, consultaCon({ tipo: g.tipo }))}>{t.secciones.verTodas}</Link>
            )}
          </section>
        )
      })}

      {pagina && <Paginacion lang={lang} ruta={ruta} pagina={pagina.pagina} totalPaginas={pagina.totalPaginas} consulta={consultaCon({})} />}
    </div>
  )
}
```

Antes de cerrar la página, revisa las clases de `c-busqueda.html` (`.resultado`, `.grupo`, `.resultados`, `mark`) y usa las que define su `<style>`. Si una se llama distinto, cambia el JSX y deja el CSS igual.

**Sugerencias en la cabecera.** En `Cabecera.tsx`, pasa `sugerencias={rutas.sugerencias(lang)}` a `CabeceraCliente`. En `CabeceraCliente.tsx`, agrega el prop `sugerencias: string` y este estado y efecto:

```tsx
  const [q, setQ] = useState('')
  const [lista, setLista] = useState<{ tipo: TipoBusqueda; titulo: string; ruta: string }[]>([])
  useEffect(() => {
    if (q.trim().length < 2) return
    const control = new AbortController()
    const espera = window.setTimeout(() => {
      fetch(`${sugerencias}?q=${encodeURIComponent(q)}`, { signal: control.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then(setLista)
        .catch(() => undefined)
    }, 200)
    return () => {
      window.clearTimeout(espera)
      control.abort()
    }
  }, [q, sugerencias])
  const visibles = q.trim().length < 2 ? [] : lista
```

Conecta `onChange={(e) => setQ(e.target.value)}` a los dos `input` de búsqueda. Debajo de cada uno, pinta `visibles` dentro de `<div className="sugerencias">` como `<Link href={s.ruta}>{s.titulo}<span>{textos(lang).busqueda.tipos[s.tipo]}</span></Link>`, y `textos(lang).busqueda.sinResultados` si la lista está vacía y hay término (en ese componente `t` es `textos(lang).cabecera`). Importa `type TipoBusqueda` de `../../dominio/busqueda`. `setLista` se llama dentro de un callback (`then`), no directo en el efecto, así que cumple `react-hooks/set-state-in-effect`.

- [ ] **Step 4: Verify**

Run: `npm run test:unit`, `npm run typecheck`, `npm run lint` y `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/'(sitio)'/'[lang]'/guia/buscar src/sitio src/dominio/rutas.ts tests/unit
git commit -m "feat: página de búsqueda agrupada con filtros y sugerencias en la cabecera

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Aviso de privacidad

**Files:**
- Create: `src/app/(sitio)/[lang]/guia/privacidad/page.tsx`, `src/sitio/ui/CopiarCorreo.tsx`, `src/sitio/estilos/privacidad.css`
- Modify: `src/sitio/textos.ts`

**Interfaces:**
- Consumes: `ajustesCacheados` (F3a); `CuerpoRico`, `encabezadosDe` (F3b); `inicioDelDiaGuardado`.
- Produces: la página `/es/guia/privacidad` y `/en/guide/privacy` (`c-privacidad.html`). Si no hay aviso en el idioma, pasa por `noEncontrado`.

- [ ] **Step 1: Write the implementation**

Agrega a `textos.ts` en los dos idiomas: `privacidad: { titulo, version: (v) => …, vigente: (f) => …, enEste, correo, copiar, copiado }`. En español: «Aviso de privacidad de la Guía», «Versión {v}», «Vigente desde el {f}», «En este aviso», «Escríbenos para ejercer tus derechos ARCO:», «Copiar correo», «Correo copiado». En inglés: «Guide privacy notice», «Version {v}», «In effect since {f}», «In this notice», «Write to us to exercise your ARCO rights:», «Copy email», «Email copied».

`src/sitio/estilos/privacidad.css` es el `<style>` de `docs/diseno/propuestas/c-privacidad.html`, sin la etiqueta.

```tsx
// src/sitio/ui/CopiarCorreo.tsx
'use client'

import { useState } from 'react'

export function CopiarCorreo({ correo, copiar, copiado }: { correo: string; copiar: string; copiado: string }) {
  const [hecho, setHecho] = useState(false)
  return (
    <span className="correo-arco">
      <a href={`mailto:${correo}`}>{correo}</a>{' '}
      <button
        className={`chip presionable${hecho ? ' confirmado' : ''}`}
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(correo)
          setHecho(true)
          window.setTimeout(() => setHecho(false), 1400)
        }}
      >
        {hecho ? copiado : copiar}
      </button>
    </span>
  )
}
```

```tsx
// src/app/(sitio)/[lang]/guia/privacidad/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { inicioDelDiaGuardado } from '../../../../../dominio/fechas'
import { esLocale, LOCALES, tieneValor, type Locale } from '../../../../../dominio/idioma'
import { encabezadosDe } from '../../../../../dominio/lexical'
import { rutas } from '../../../../../dominio/rutas'
import { ajustesCacheados } from '../../../../../sitio/datos/cacheadas'
import { guiaIndexable, sitioUrl } from '../../../../../sitio/entorno'
import '../../../../../sitio/estilos/privacidad.css'
import { noEncontrado } from '../../../../../sitio/redirigir'
import { migasLd } from '../../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../../sitio/seo/metadatos'
import { versionesDe } from '../../../../../sitio/seo/versiones'
import { textos } from '../../../../../sitio/textos'
import { CopiarCorreo } from '../../../../../sitio/ui/CopiarCorreo'
import { CuerpoRico } from '../../../../../sitio/ui/CuerpoRico'
import { JsonLd } from '../../../../../sitio/ui/JsonLd'
import { Migas } from '../../../../../sitio/ui/Migas'

export const revalidate = 3600
type Props = { params: Promise<{ lang: string }> }
const SIN_RESOLVER = { lugar: () => undefined, evento: () => undefined, href: () => null }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!esLocale(lang)) return {}
  const rutasIdioma: Partial<Record<Locale, string>> = {}
  for (const l of LOCALES) if (tieneValor((await ajustesCacheados(l)).avisoPrivacidad)) rutasIdioma[l] = rutas.privacidad(l)
  const { propia, versiones } = versionesDe({ lang, guiaIndexable: guiaIndexable(), rutas: rutasIdioma })
  const t = textos(lang).privacidad
  return metadatos({ lang, titulo: t.titulo, descripcion: t.titulo, ruta: propia.ruta, indexable: propia.indexable, versiones })
}

export default async function Privacidad({ params }: Props) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  const a = await ajustesCacheados(lang)
  if (!tieneValor(a.avisoPrivacidad)) return noEncontrado(lang, ['privacidad'])
  const t = textos(lang)
  const indice = encabezadosDe(a.avisoPrivacidad)
  // avisoVigenteDesde es de solo día: se lee con inicioDelDiaGuardado (memoria de F3, F2).
  const vigente = a.avisoVigenteDesde
    ? new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { timeZone: 'America/Mazatlan', dateStyle: 'long' }).format(inicioDelDiaGuardado(a.avisoVigenteDesde))
    : null
  const migas = [{ nombre: t.migas.guia, ruta: rutas.portada(lang) }, { nombre: t.privacidad.titulo, ruta: rutas.privacidad(lang) }]
  return (
    <div className="ancho">
      <Migas lang={lang} migas={migas} />
      <header className="aviso-cabeza">
        <h1>{t.privacidad.titulo}</h1>
        <p className="meta">
          {a.versionAviso && t.privacidad.version(a.versionAviso)}
          {vigente && ` · ${t.privacidad.vigente(vigente)}`}
        </p>
      </header>
      <div className="art-cuerpo">
        {indice.length > 1 && (
          <nav className="indice" aria-label={t.privacidad.enEste}>
            <h2>{t.privacidad.enEste}</h2>
            <div>{indice.map((h) => <a key={h.id} href={`#${h.id}`}>{h.texto}</a>)}</div>
          </nav>
        )}
        <div>
          <CuerpoRico lang={lang} cuerpo={a.avisoPrivacidad} resolutor={SIN_RESOLVER} media={{}} categorias={[]} className="prosa" />
          {a.correoPrivacidad && (
            <p className="arco">{t.privacidad.correo} <CopiarCorreo correo={a.correoPrivacidad} copiar={t.privacidad.copiar} copiado={t.privacidad.copiado} /></p>
          )}
        </div>
      </div>
      <JsonLd datos={migasLd(migas, sitioUrl())} />
    </div>
  )
}
```

Revisa las clases de `c-privacidad.html` (`.aviso-cabeza`, `.indice` y el contenedor del cuerpo) y usa las del diseño en el JSX.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`, `npm run lint` y `npm run build`. Luego, con el seed de F3b y `next start`, `curl -s localhost:3100/es/guia/privacidad | grep -o 'Aviso de privacidad de prueba'`.
Expected: PASS; el texto del seed aparece.

- [ ] **Step 3: Commit**

```bash
git add src/app/'(sitio)'/'[lang]'/guia/privacidad src/sitio
git commit -m "feat: página del aviso de privacidad con versión, vigencia y correo ARCO

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Reglas puras del formulario y de la conservación, y `estadoCambiadoEl`

**Files:**
- Create: `src/dominio/solicitud.ts`, `src/dominio/ip-hash.ts`, `src/dominio/conservacion.ts`
- Modify: `src/collections/Solicitudes.ts`
- Regenerate: migraciones (`inicial` + `busqueda`) y tipos
- Test: `tests/unit/solicitud.test.ts`, `tests/unit/ip-hash.test.ts`, `tests/unit/conservacion.test.ts`, `tests/int/articulos-solicitudes.int.test.ts` (agregar un caso)

**Interfaces:**
- Produces:
  - `type DatosSolicitud = { negocio: string; giro: string | null; zonaId: number | null; zonaTexto: string | null; contactoNombre: string | null; correo: string | null; telefono: string | null; webOInstagram: string | null; mensaje: string | null }`.
  - `type CodigoError = 'requerido' | 'largo' | 'formato' | 'contacto' | 'acepto'`.
  - `validarSolicitud(form: Record<string, string | undefined>): { ok: true; datos: DatosSolicitud } | { ok: false; errores: Record<string, CodigoError> }`, y `LIMITE_POR_HORA = 5`.
  - `ipHash(ip: string, sal: string): string` (hex de 64 caracteres).
  - `CAMPOS_PERSONALES` y `debeAnonimizar(s: { estado: string; estadoCambiadoEl?: string | null; createdAt: string; anonimizadaEl?: string | null }, ahora: Date): boolean`.
  - `ipHashVencido(creadaEl: string, ahora: Date): boolean`.
  - Campo `solicitudes.estadoCambiadoEl`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/solicitud.test.ts
import { describe, expect, it } from 'vitest'

import { validarSolicitud } from '../../src/dominio/solicitud'

const base = { negocio: 'Café Duna', correo: 'hola@ejemplo.invalid', aceptoPrivacidad: 'on' }

describe('validarSolicitud (spec §11, decisiones F1)', () => {
  it('mínimo válido: negocio, correo o teléfono, y aceptación', () => {
    const r = validarSolicitud(base)
    expect(r).toEqual({
      ok: true,
      datos: { negocio: 'Café Duna', giro: null, zonaId: null, zonaTexto: null, contactoNombre: null, correo: 'hola@ejemplo.invalid', telefono: null, webOInstagram: null, mensaje: null },
    })
    expect(validarSolicitud({ negocio: 'X', telefono: '+52 612 000 0000', aceptoPrivacidad: 'on' }).ok).toBe(true)
  })

  it('errores por campo', () => {
    expect(validarSolicitud({ aceptoPrivacidad: 'on', correo: 'a@b.mx' })).toEqual({ ok: false, errores: { negocio: 'requerido' } })
    expect(validarSolicitud({ negocio: 'X', aceptoPrivacidad: 'on' })).toEqual({ ok: false, errores: { correo: 'contacto', telefono: 'contacto' } })
    expect(validarSolicitud({ ...base, correo: 'no-es-correo' })).toEqual({ ok: false, errores: { correo: 'formato' } })
    expect(validarSolicitud({ ...base, telefono: '12' })).toEqual({ ok: false, errores: { telefono: 'formato' } })
    expect(validarSolicitud({ ...base, aceptoPrivacidad: undefined })).toEqual({ ok: false, errores: { aceptoPrivacidad: 'acepto' } })
    expect(validarSolicitud({ ...base, mensaje: 'x'.repeat(2001) })).toEqual({ ok: false, errores: { mensaje: 'largo' } })
  })

  it('zona: id de la lista o texto libre', () => {
    const r = validarSolicitud({ ...base, zona: '3' })
    expect(r.ok && r.datos.zonaId).toBe(3)
    const o = validarSolicitud({ ...base, zona: 'otra', zonaTexto: 'Todos Santos' })
    expect(o.ok && [o.datos.zonaId, o.datos.zonaTexto]).toEqual([null, 'Todos Santos'])
  })
})
```

```ts
// tests/unit/ip-hash.test.ts
import { describe, expect, it } from 'vitest'

import { ipHash } from '../../src/dominio/ip-hash'

describe('ipHash (spec §6, Solicitudes)', () => {
  it('SHA-256 con sal, estable y distinto por sal', () => {
    expect(ipHash('1.2.3.4', 's')).toMatch(/^[0-9a-f]{64}$/)
    expect(ipHash('1.2.3.4', 's')).toBe(ipHash('1.2.3.4', 's'))
    expect(ipHash('1.2.3.4', 's')).not.toBe(ipHash('1.2.3.4', 't'))
  })
})
```

```ts
// tests/unit/conservacion.test.ts
import { describe, expect, it } from 'vitest'

import { debeAnonimizar, ipHashVencido } from '../../src/dominio/conservacion'

const ahora = new Date('2026-11-10T12:00:00Z')
const s = (estado: string, estadoCambiadoEl: string, extra = {}) => ({ estado, estadoCambiadoEl, createdAt: '2025-01-01T00:00:00Z', anonimizadaEl: null, ...extra })

describe('conservación de Solicitudes (spec §12)', () => {
  it('rechazada se anonimiza ya', () => expect(debeAnonimizar(s('rechazada', '2026-11-09T00:00:00Z'), ahora)).toBe(true))
  it('sin cambio de estado en 12 meses (y no aceptada)', () => {
    expect(debeAnonimizar(s('en-contacto', '2025-11-09T00:00:00Z'), ahora)).toBe(true)
    expect(debeAnonimizar(s('en-contacto', '2025-11-11T00:00:00Z'), ahora)).toBe(false)
    expect(debeAnonimizar(s('aceptada', '2020-01-01T00:00:00Z'), ahora)).toBe(false)
  })
  it('ya anonimizada no se repite; sin estadoCambiadoEl cuenta la creación', () => {
    expect(debeAnonimizar(s('rechazada', '2026-11-09T00:00:00Z', { anonimizadaEl: '2026-11-09T00:00:00Z' }), ahora)).toBe(false)
    expect(debeAnonimizar({ estado: 'nueva', estadoCambiadoEl: null, createdAt: '2025-10-01T00:00:00Z', anonimizadaEl: null }, ahora)).toBe(true)
  })
  it('ipHash vence a las 24 h', () => {
    expect(ipHashVencido('2026-11-09T11:59:00Z', ahora)).toBe(true)
    expect(ipHashVencido('2026-11-09T12:01:00Z', ahora)).toBe(false)
  })
})
```

Agrega a `tests/int/articulos-solicitudes.int.test.ts`:

```ts
  it('estadoCambiadoEl se fija al crear y solo cambia si cambia el estado', async () => {
    const s = await payload.create({ collection: 'solicitudes', data: { negocio: 'N', aceptoPrivacidad: true }, overrideAccess: true })
    expect(s.estadoCambiadoEl).toBeTruthy()
    const nota = await payload.update({ collection: 'solicitudes', id: s.id, data: { notasInternas: 'llamar' }, overrideAccess: true })
    expect(nota.estadoCambiadoEl).toBe(s.estadoCambiadoEl)
    await new Promise((r) => setTimeout(r, 20))
    const cambio = await payload.update({ collection: 'solicitudes', id: s.id, data: { estado: 'en-contacto' }, overrideAccess: true })
    expect(new Date(cambio.estadoCambiadoEl as string).getTime()).toBeGreaterThan(new Date(s.estadoCambiadoEl as string).getTime())
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/solicitud.test.ts tests/unit/ip-hash.test.ts tests/unit/conservacion.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// src/dominio/solicitud.ts
export const LIMITE_POR_HORA = 5

export type DatosSolicitud = {
  negocio: string
  giro: string | null
  zonaId: number | null
  zonaTexto: string | null
  contactoNombre: string | null
  correo: string | null
  telefono: string | null
  webOInstagram: string | null
  mensaje: string | null
}
export type CodigoError = 'requerido' | 'largo' | 'formato' | 'contacto' | 'acepto'

const MAX: Record<string, number> = { negocio: 120, giro: 80, zonaTexto: 80, contactoNombre: 80, correo: 160, telefono: 30, webOInstagram: 160, mensaje: 2000 }
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const texto = (v: string | undefined) => {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

// Spec §11 y notas de F1: validación en el servidor; correo o teléfono (al menos uno); aceptación del aviso.
export function validarSolicitud(form: Record<string, string | undefined>) {
  const errores: Record<string, CodigoError> = {}
  const v = Object.fromEntries(Object.keys(MAX).map((k) => [k, texto(form[k])])) as Record<string, string | null>
  for (const [k, max] of Object.entries(MAX)) if (v[k] && v[k]!.length > max) errores[k] = 'largo'
  if (!v.negocio) errores.negocio = 'requerido'
  if (v.correo && !errores.correo && !CORREO.test(v.correo)) errores.correo = 'formato'
  if (v.telefono && !errores.telefono && (v.telefono.replace(/\D/g, '').length < 7 || /[^\d\s+()-]/.test(v.telefono))) errores.telefono = 'formato'
  if (!v.correo && !v.telefono) {
    errores.correo = 'contacto'
    errores.telefono = 'contacto'
  }
  if (form.aceptoPrivacidad !== 'on') errores.aceptoPrivacidad = 'acepto'
  if (Object.keys(errores).length) return { ok: false as const, errores }
  const zona = texto(form.zona)
  const datos: DatosSolicitud = {
    negocio: v.negocio!,
    giro: v.giro,
    zonaId: zona && /^\d+$/.test(zona) ? Number(zona) : null,
    zonaTexto: zona === 'otra' ? v.zonaTexto : null,
    contactoNombre: v.contactoNombre,
    correo: v.correo,
    telefono: v.telefono,
    webOInstagram: v.webOInstagram,
    mensaje: v.mensaje,
  }
  return { ok: true as const, datos }
}
```

```ts
// src/dominio/ip-hash.ts
import { createHash } from 'node:crypto'

// Spec §6: solo para el límite de envíos; se borra a las 24 h.
export const ipHash = (ip: string, sal: string): string => createHash('sha256').update(`${sal}:${ip}`).digest('hex')
```

```ts
// src/dominio/conservacion.ts
export const CAMPOS_PERSONALES = ['contactoNombre', 'correo', 'telefono', 'webOInstagram', 'mensaje'] as const
const DIA = 24 * 60 * 60 * 1000

const haceMeses = (ahora: Date, meses: number) => {
  const d = new Date(ahora)
  d.setUTCMonth(d.getUTCMonth() - meses)
  return d
}

// Spec §12: rechazada, o sin cambio de estado en 12 meses (salvo aceptada, que la anonimiza un Admin a mano).
export function debeAnonimizar(
  s: { estado: string; estadoCambiadoEl?: string | null; createdAt: string; anonimizadaEl?: string | null },
  ahora: Date,
): boolean {
  if (s.anonimizadaEl) return false
  if (s.estado === 'rechazada') return true
  if (s.estado === 'aceptada') return false
  return new Date(s.estadoCambiadoEl ?? s.createdAt) < haceMeses(ahora, 12)
}

export const ipHashVencido = (creadaEl: string, ahora: Date): boolean => ahora.getTime() - new Date(creadaEl).getTime() > DIA
```

En `src/collections/Solicitudes.ts`, agrega el campo después de `estado`:

```ts
    {
      name: 'estadoCambiadoEl',
      type: 'date',
      admin: { readOnly: true, position: 'sidebar', description: 'Último cambio de estado (conservación, aviso §12).' },
    },
```

y el hook:

```ts
// Spec §12: «sin cambio de estado en 12 meses» se mide desde aquí; una nota interna no reinicia el plazo.
const marcarCambioDeEstado: CollectionBeforeChangeHook = ({ data, operation, originalDoc }) => {
  if (operation === 'create' || (data.estado !== undefined && data.estado !== originalDoc?.estado)) {
    return { ...data, estadoCambiadoEl: new Date().toISOString() }
  }
  return data
}
```

con `hooks: { beforeChange: [marcarCambioDeEstado] }` en la colección (importa `CollectionBeforeChangeHook` de `payload`).

```bash
npm run migracion:regenerar -- --no-hay-deploy
npm run generate:types
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`, `npm run test:int -- tests/int/articulos-solicitudes.int.test.ts` y `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dominio src/collections/Solicitudes.ts src/migrations src/payload-types.ts tests/unit tests/int/articulos-solicitudes.int.test.ts
git commit -m "feat: validación de solicitudes, ipHash, reglas de conservación y estadoCambiadoEl

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Envío de la solicitud (caso de uso), Turnstile y aviso por correo

**Files:**
- Create: `src/formulario/turnstile.ts`, `src/formulario/avisar.ts`, `src/formulario/enviar.ts`
- Modify: `src/payload.config.ts`, `package.json`, `package-lock.json`
- Test: `tests/unit/turnstile.test.ts`, `tests/int/formulario.int.test.ts`

**Interfaces:**
- Consumes: `validarSolicitud`, `LIMITE_POR_HORA`, `ipHash` (Task 6); `Origen` (F3a).
- Produces:
  - `verificarTurnstile(token: string | undefined, ip: string | null, secreto: string | undefined, f?: typeof fetch): Promise<boolean>`.
  - `avisarSolicitud(payload, s: { id: number; negocio: string }, correos: string[]): Promise<void>`.
  - `type DepsEnvio = { verificarTurnstile(token: string | undefined, ip: string | null): Promise<boolean>; avisar(payload: Payload, s: { id: number; negocio: string }, correos: string[]): Promise<void>; sal: string; ahora?: () => Date }`.
  - `type ResultadoEnvio = { ok: true } | { ok: false; motivo: 'cerrado' | 'invalido' | 'verificacion' | 'limite'; errores?: Record<string, CodigoError> }`.
  - `enviarSolicitud(payload, form, origen, deps): Promise<ResultadoEnvio>`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/turnstile.test.ts
import { describe, expect, it, vi } from 'vitest'

import { verificarTurnstile } from '../../src/formulario/turnstile'

const respuesta = (cuerpo: object) => vi.fn(async () => new Response(JSON.stringify(cuerpo)))

describe('verificarTurnstile (spec §11)', () => {
  it('manda secreto, token y remoteip', async () => {
    const f = respuesta({ success: true })
    expect(await verificarTurnstile('tok', '1.2.3.4', 'sec', f as never)).toBe(true)
    const cuerpo = (f.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body
    expect(Object.fromEntries(cuerpo)).toEqual({ secret: 'sec', response: 'tok', remoteip: '1.2.3.4' })
  })
  it('sin IP no manda remoteip', async () => {
    const f = respuesta({ success: true })
    await verificarTurnstile('tok', null, 'sec', f as never)
    expect(Object.fromEntries((f.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body)).not.toHaveProperty('remoteip')
  })
  it('falso sin token, sin secreto, con fallo o con error de red', async () => {
    expect(await verificarTurnstile(undefined, null, 'sec', respuesta({ success: true }) as never)).toBe(false)
    expect(await verificarTurnstile('tok', null, undefined, respuesta({ success: true }) as never)).toBe(false)
    expect(await verificarTurnstile('tok', null, 'sec', respuesta({ success: false }) as never)).toBe(false)
    expect(await verificarTurnstile('tok', null, 'sec', vi.fn(async () => { throw new Error('red') }) as never)).toBe(false)
  })
})
```

```ts
// tests/int/formulario.int.test.ts
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { avisarSolicitud } from '../../src/formulario/avisar'
import { enviarSolicitud } from '../../src/formulario/enviar'
import { limpiar, obtenerPayload } from './utils'

let payload: Payload
const form = (extra = {}) => ({ negocio: 'Café Duna', correo: 'hola@ejemplo.invalid', aceptoPrivacidad: 'on', 'cf-turnstile-response': 'tok', ...extra })
const publico = (ip: string | null) => ({ tipo: 'publico' as const, ip })
const deps = (extra = {}) => ({ verificarTurnstile: vi.fn(async () => true), avisar: vi.fn(async () => undefined), sal: 'sal-prueba', ...extra })

async function ajustes(formularioActivo: boolean) {
  await payload.updateGlobal({
    slug: 'ajustes-guia', overrideAccess: true,
    data: { formularioActivo, versionAviso: '2026-11', correosAviso: [{ correo: 'equipo@prueba.test' }] },
  })
}

describe('envío del formulario (spec §11, §12)', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
    await ajustes(true)
  })

  it('crea la Solicitud con versión, ipHash y aviso', async () => {
    const d = deps()
    expect(await enviarSolicitud(payload, form(), publico('1.2.3.4'), d)).toEqual({ ok: true })
    const { docs } = await payload.find({ collection: 'solicitudes', overrideAccess: true })
    expect(docs[0]).toMatchObject({ negocio: 'Café Duna', versionAviso: '2026-11', aceptoPrivacidad: true, estado: 'nueva' })
    expect(docs[0].ipHash).toMatch(/^[0-9a-f]{64}$/)
    expect(d.verificarTurnstile).toHaveBeenCalledWith('tok', '1.2.3.4')
    expect(d.avisar).toHaveBeenCalledWith(payload, expect.objectContaining({ negocio: 'Café Duna' }), ['equipo@prueba.test'])
  })

  it('apagado, inválido o sin verificación: rechaza', async () => {
    await ajustes(false)
    expect(await enviarSolicitud(payload, form(), publico('1.2.3.4'), deps())).toMatchObject({ ok: false, motivo: 'cerrado' })
    await ajustes(true)
    expect(await enviarSolicitud(payload, form({ negocio: '' }), publico('1.2.3.4'), deps())).toMatchObject({ ok: false, motivo: 'invalido', errores: { negocio: 'requerido' } })
    expect(await enviarSolicitud(payload, form(), publico('1.2.3.4'), deps({ verificarTurnstile: vi.fn(async () => false) }))).toMatchObject({ ok: false, motivo: 'verificacion' })
  })

  it('máximo 5 por IP por hora; otra IP pasa', async () => {
    for (let i = 0; i < 5; i++) expect((await enviarSolicitud(payload, form(), publico('9.9.9.9'), deps())).ok).toBe(true)
    expect(await enviarSolicitud(payload, form(), publico('9.9.9.9'), deps())).toMatchObject({ ok: false, motivo: 'limite' })
    expect((await enviarSolicitud(payload, form(), publico('8.8.8.8'), deps())).ok).toBe(true)
  })

  it('sin IP, el límite cuenta por correo y teléfono', async () => {
    for (let i = 0; i < 5; i++) expect((await enviarSolicitud(payload, form(), publico(null), deps())).ok).toBe(true)
    expect(await enviarSolicitud(payload, form(), publico(null), deps())).toMatchObject({ ok: false, motivo: 'limite' })
    expect((await enviarSolicitud(payload, form({ correo: 'otra@ejemplo.invalid' }), publico(null), deps())).ok).toBe(true)
  })

  it('si el correo de aviso falla, la Solicitud queda y el log no lleva direcciones', async () => {
    const errorLog = vi.spyOn(payload.logger, 'error')
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockRejectedValue(Object.assign(new Error('to: equipo@prueba.test rechazado'), { status: 422 }))
    expect(await enviarSolicitud(payload, form(), publico('1.2.3.4'), deps({ avisar: avisarSolicitud }))).toEqual({ ok: true })
    expect((await payload.count({ collection: 'solicitudes', overrideAccess: true })).totalDocs).toBe(1)
    expect(JSON.stringify(errorLog.mock.calls)).not.toMatch(/@/)
    sendEmail.mockRestore()
    errorLog.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/turnstile.test.ts` y `npm run test:int -- tests/int/formulario.int.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```bash
npm install --save-exact @payloadcms/email-resend@3.92.1
```

```ts
// src/formulario/turnstile.ts
const URL_VERIFICAR = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// Spec §11: verificado en el servidor con remoteip (la IP según la regla de §4.1). Nunca lanza: si falla, false.
export async function verificarTurnstile(token: string | undefined, ip: string | null, secreto: string | undefined, f: typeof fetch = fetch): Promise<boolean> {
  if (!token || !secreto) return false
  const body = new URLSearchParams({ secret: secreto, response: token })
  if (ip) body.set('remoteip', ip)
  try {
    const r = await f(URL_VERIFICAR, { method: 'POST', body, signal: AbortSignal.timeout(3000) })
    const j = (await r.json()) as { success?: boolean }
    return j.success === true
  } catch {
    return false
  }
}
```

```ts
// src/formulario/avisar.ts
import type { Payload } from 'payload'

// Spec §11: si el correo falla, la Solicitud queda guardada y el error va a los logs SIN correo, teléfono ni IP.
// El message de un error del adaptador puede citar direcciones: solo se registran nombre y estado.
export async function avisarSolicitud(payload: Payload, s: { id: number; negocio: string }, correos: string[]): Promise<void> {
  if (!correos.length) return
  try {
    await payload.sendEmail({
      to: correos,
      subject: `Nueva solicitud en la Guía: ${s.negocio}`,
      text: `Hay una solicitud nueva para aparecer en la Guía (${s.negocio}). Revísala en el admin, en Solicitudes (id ${s.id}).`,
    })
  } catch (e) {
    const err = e as { name?: string; status?: number; statusCode?: number }
    payload.logger.error({ msg: 'No se pudo avisar de la Solicitud', solicitudId: s.id, nombre: err?.name, estado: err?.status ?? err?.statusCode })
  }
}
```

```ts
// src/formulario/enviar.ts
import type { Payload, Where } from 'payload'

import { ipHash } from '../dominio/ip-hash'
import type { Origen } from '../dominio/origen'
import { LIMITE_POR_HORA, validarSolicitud, type CodigoError } from '../dominio/solicitud'

export type DepsEnvio = {
  verificarTurnstile(token: string | undefined, ip: string | null): Promise<boolean>
  avisar(payload: Payload, s: { id: number; negocio: string }, correos: string[]): Promise<void>
  sal: string
  ahora?: () => Date
}
export type ResultadoEnvio =
  | { ok: true }
  | { ok: false; motivo: 'cerrado' | 'invalido' | 'verificacion' | 'limite'; errores?: Record<string, CodigoError> }

const HORA = 60 * 60 * 1000

// El caso de uso completo del formulario (spec §11). Sin Next: la Server Action solo le pasa origen y dependencias.
export async function enviarSolicitud(payload: Payload, form: Record<string, string | undefined>, origen: Origen, deps: DepsEnvio): Promise<ResultadoEnvio> {
  const ajustes = await payload.findGlobal({ slug: 'ajustes-guia', overrideAccess: true, depth: 0 })
  if (!ajustes.formularioActivo) return { ok: false, motivo: 'cerrado' }
  const v = validarSolicitud(form)
  if (!v.ok) return { ok: false, motivo: 'invalido', errores: v.errores }
  if (!(await deps.verificarTurnstile(form['cf-turnstile-response'], origen.ip))) return { ok: false, motivo: 'verificacion' }

  const ahora = deps.ahora?.() ?? new Date()
  const hash = origen.ip ? ipHash(origen.ip, deps.sal) : null
  // Sin IP (local o plan B del spec §10): el límite cuenta por correo y teléfono.
  const quien: Where = hash
    ? { ipHash: { equals: hash } }
    : { or: [v.datos.correo ? { correo: { equals: v.datos.correo } } : null, v.datos.telefono ? { telefono: { equals: v.datos.telefono } } : null].filter(Boolean) as Where[] }
  // Contar y crear no es atómico: con envíos en paralelo podría pasar un sexto. Costo aceptado (plan F3c).
  const { totalDocs } = await payload.count({
    collection: 'solicitudes',
    overrideAccess: true,
    where: { and: [quien, { createdAt: { greater_than: new Date(ahora.getTime() - HORA).toISOString() } }] },
  })
  if (totalDocs >= LIMITE_POR_HORA) return { ok: false, motivo: 'limite' }

  // Una zona inventada en el formulario no rompe la relación: se guarda sin zona.
  const zonaValida =
    v.datos.zonaId !== null &&
    (await payload.count({ collection: 'zonas', overrideAccess: true, where: { id: { equals: v.datos.zonaId } } })).totalDocs > 0
  const creada = await payload.create({
    collection: 'solicitudes',
    overrideAccess: true,
    data: {
      negocio: v.datos.negocio,
      giro: v.datos.giro,
      zona: zonaValida ? v.datos.zonaId : null,
      zonaTexto: v.datos.zonaTexto,
      contactoNombre: v.datos.contactoNombre,
      correo: v.datos.correo,
      telefono: v.datos.telefono,
      webOInstagram: v.datos.webOInstagram,
      mensaje: v.datos.mensaje,
      aceptoPrivacidad: true,
      versionAviso: ajustes.versionAviso ?? null,
      ipHash: hash,
      estado: 'nueva',
    },
  })
  await deps.avisar(payload, { id: creada.id, negocio: creada.negocio }, (ajustes.correosAviso ?? []).map((c) => c.correo))
  return { ok: true }
}
```

En `src/payload.config.ts`:

```ts
import { resendAdapter } from '@payloadcms/email-resend'
// …
  // Spec §5.2: Resend con la llave de esta app. Sin llave (local, CI), el adaptador silencioso de F2.
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.CORREO_REMITENTE || 'guia@salysoltours.com',
        defaultFromName: 'Guía de la Baja',
      })
    : correoSilencioso,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/unit/turnstile.test.ts`, `npm run test:int -- tests/int/formulario.int.test.ts` y `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/formulario src/payload.config.ts package.json package-lock.json tests/unit/turnstile.test.ts tests/int/formulario.int.test.ts
git commit -m "feat: envío de solicitudes con Turnstile, límite por IP y aviso por Resend

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Página «Aparece en la guía» y su Server Action

**Files:**
- Create: `src/formulario/accion.ts`, `src/sitio/ui/FormularioSolicitud.tsx`, `src/app/(sitio)/[lang]/guia/aparece-en-la-guia/page.tsx`, `src/sitio/estilos/aparece.css`
- Modify: `src/sitio/textos.ts`

**Interfaces:**
- Consumes: `enviarSolicitud`, `verificarTurnstile`, `avisarSolicitud` (Task 7); `origenReenviado` (F3a); `track` (Task 13; si todavía no existe, la tarea 13 agrega la llamada).
- Produces:
  - `type EstadoFormulario = { estado: 'inicial' | 'ok' | 'error'; motivo?: string; errores?: Record<string, string> }` y `enviarFormulario(prev, fd): Promise<EstadoFormulario>`.
  - La página de negocios (`c-aparece.html`): explicación, pasos y formulario, o «Muy pronto» con `formularioActivo` apagado.

- [ ] **Step 1: Write the implementation**

Agrega a `textos.ts` en los dos idiomas la sección `formulario` con todos los textos de `c-aparece.html`, y su traducción al inglés. Son estos:

- título, explicación y los tres pasos;
- nota de patrocinio y «Muy pronto»;
- etiquetas de cada campo, «(opcional)», «Elige una zona», «Otra zona» y «¿Dónde está?»;
- «Con uno de los dos basta»;
- texto de la casilla, con el link al aviso y la versión;
- «Enviar solicitud» y «Enviando…»;
- confirmación y «Volver a la Guía»;
- `errores`, un mapa por código:
  - `requerido`: «Escribe el nombre del negocio.»
  - `formato`: «Revisa este dato.»
  - `contacto`: «Déjanos un correo o un teléfono.»
  - `acepto`: «Hay que aceptar el aviso de privacidad.»
  - `largo`: «Es demasiado largo.»
- `motivos`:
  - `cerrado`: «El formulario todavía no está abierto.»
  - `verificacion`: «No pudimos verificar que no eres un robot. Inténtalo de nuevo.»
  - `limite`: «Recibimos varias solicitudes desde aquí. Inténtalo en una hora.»
  - `error`: «No pudimos enviar tu solicitud. Inténtalo de nuevo en unos minutos.»

`src/sitio/estilos/aparece.css` es el `<style>` de `docs/diseno/propuestas/c-aparece.html`, sin la etiqueta y sin la regla `.demo`.

```ts
// src/formulario/accion.ts
'use server'

import { headers } from 'next/headers'

import { origenReenviado } from '../dominio/origen'
import { obtenerPayload } from '../sitio/datos/payload'
import { avisarSolicitud } from './avisar'
import { enviarSolicitud } from './enviar'
import { verificarTurnstile } from './turnstile'

export type EstadoFormulario = { estado: 'inicial' | 'ok' | 'error'; motivo?: string; errores?: Record<string, string> }

// Server Action del formulario (spec §4, §11). La IP sale de lo que reenvió el proxy (F3a); nunca de headers crudos.
export async function enviarFormulario(_previo: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const form: Record<string, string> = {}
  for (const [k, v] of fd.entries()) if (typeof v === 'string') form[k] = v
  try {
    const r = await enviarSolicitud(await obtenerPayload(), form, origenReenviado(await headers()), {
      verificarTurnstile: (token, ip) => verificarTurnstile(token, ip, process.env.TURNSTILE_SECRET_KEY),
      avisar: avisarSolicitud,
      sal: process.env.IP_HASH_SALT ?? '',
    })
    return r.ok ? { estado: 'ok' } : { estado: 'error', motivo: r.motivo, errores: r.errores }
  } catch (e) {
    // Sin datos del formulario en el log (spec §11): solo el tipo de error.
    console.error('Server Action del formulario falló', e instanceof Error ? e.name : 'desconocido')
    return { estado: 'error', motivo: 'error' }
  }
}
```

```tsx
// src/sitio/ui/FormularioSolicitud.tsx
'use client'

import Link from 'next/link'
import Script from 'next/script'
import { startTransition, useActionState, useEffect, useRef, useState } from 'react'

import { enviarFormulario, type EstadoFormulario } from '../../formulario/accion'
import type { Locale } from '../../dominio/idioma'
import { rutas } from '../../dominio/rutas'
import { track } from '../analitica/track'
import { textos } from '../textos'

const INICIAL: EstadoFormulario = { estado: 'inicial' }
type Turnstile = { render(el: HTMLElement, o: object): void; reset(): void }
const turnstile = () => (window as unknown as { turnstile?: Turnstile }).turnstile

export function FormularioSolicitud(props: { lang: Locale; zonas: { id: number; nombre: string; slug: string }[]; siteKey: string; version: string | null }) {
  const { lang, zonas, siteKey, version } = props
  const t = textos(lang).formulario
  const [s, enviar, enviando] = useActionState(enviarFormulario, INICIAL)
  const [zona, setZona] = useState('')
  const caja = useRef<HTMLDivElement>(null)
  // Render explícito: con navegación de cliente el script ya cargado no vuelve a pintar el widget solo.
  const pintar = () => {
    if (caja.current && !caja.current.childElementCount) turnstile()?.render(caja.current, { sitekey: siteKey, language: lang })
  }
  useEffect(pintar)
  useEffect(() => {
    if (s.estado === 'ok') track('solicitud_enviada', { zona: zonas.find((z) => String(z.id) === zona)?.slug ?? 'otra' })
  }, [s.estado, zona, zonas])
  useEffect(() => {
    // El token de Turnstile se consume en cada envío: tras un error hay que pedir otro (solo cuando cambia s).
    if (s.estado === 'error') turnstile()?.reset()
  }, [s])
  const error = (campo: string) => (s.errores?.[campo] ? <span className="msg" role="alert">⚠ {t.errores[s.errores[campo] as keyof typeof t.errores]}</span> : null)

  if (s.estado === 'ok') {
    return (
      <div className="listo forma" role="status" tabIndex={-1}>
        <h2>{t.listo}</h2>
        <p>{t.listoTexto}</p>
        <Link className="boton boton--secundario presionable" href={rutas.portada(lang)}>{t.volver}</Link>
      </div>
    )
  }
  return (
    // onSubmit + startTransition y no action={…}: con action, React 19 reinicia los campos tras cada envío y el
    // visitante perdería lo escrito al corregir un error.
    <form
      className="forma"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        startTransition(() => enviar(fd))
      }}
    >
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onLoad={pintar} />
      <h2>{t.cuentanos}</h2>
      <div className="campo"><label htmlFor="negocio">{t.negocio}</label><input id="negocio" name="negocio" autoComplete="organization" required maxLength={120} />{error('negocio')}</div>
      <div className="fila2">
        <div className="campo"><label htmlFor="giro">{t.giro} <span className="ayuda">{t.opcional}</span></label><input id="giro" name="giro" maxLength={80} /></div>
        <div className="campo">
          <label htmlFor="zona">{t.zona}</label>
          <select id="zona" name="zona" value={zona} onChange={(e) => setZona(e.target.value)}>
            <option value="">{t.eligeZona}</option>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            <option value="otra">{t.otraZona}</option>
          </select>
        </div>
      </div>
      {zona === 'otra' && <div className="campo"><label htmlFor="zonaTexto">{t.dondeEsta}</label><input id="zonaTexto" name="zonaTexto" maxLength={80} /></div>}
      <div className="campo"><label htmlFor="contactoNombre">{t.tuNombre} <span className="ayuda">{t.opcional}</span></label><input id="contactoNombre" name="contactoNombre" autoComplete="name" maxLength={80} /></div>
      <div className="fila2">
        <div className="campo"><label htmlFor="correo">{t.correo}</label><input id="correo" name="correo" type="email" autoComplete="email" inputMode="email" maxLength={160} />{error('correo')}</div>
        <div className="campo"><label htmlFor="telefono">{t.telefono}</label><input id="telefono" name="telefono" type="tel" autoComplete="tel" inputMode="tel" maxLength={30} />{error('telefono')}</div>
      </div>
      <p className="ayuda">{t.unoBasta}</p>
      <div className="campo"><label htmlFor="webOInstagram">{t.web} <span className="ayuda">{t.opcional}</span></label><input id="webOInstagram" name="webOInstagram" maxLength={160} /></div>
      <div className="campo"><label htmlFor="mensaje">{t.mensaje} <span className="ayuda">{t.opcional}</span></label><textarea id="mensaje" name="mensaje" maxLength={2000} />{error('mensaje')}</div>
      <div className="campo">
        <label className="casilla">
          <input type="checkbox" name="aceptoPrivacidad" />
          <span>{t.acepto} <Link href={rutas.privacidad(lang)}>{t.aviso}</Link>{version ? ` (${t.version(version)})` : ''}</span>
        </label>
        {error('aceptoPrivacidad')}
      </div>
      <div ref={caja} className="cf-turnstile" />
      {s.estado === 'error' && s.motivo && s.motivo !== 'invalido' && <p className="estado-error" role="alert">{t.motivos[s.motivo as keyof typeof t.motivos] ?? t.motivos.error}</p>}
      <button className="boton presionable enviar" type="submit" disabled={enviando}>{enviando ? t.enviando : t.enviar}</button>
    </form>
  )
}
```

Las llaves de `textos(lang).formulario` que usa el componente son estas: `cuentanos`, `negocio`, `giro`, `opcional`, `zona`, `eligeZona`, `otraZona`, `dondeEsta`, `tuNombre`, `correo`, `telefono`, `unoBasta`, `web`, `mensaje`, `acepto`, `aviso`, `version(v)`, `enviar`, `enviando`, `listo`, `listoTexto`, `volver`, `errores` y `motivos`. La página usa además `titulo`, `explicacion`, `pasos` (tres `{ titulo, texto }`), `notaPatrocinio`, `pronto` y `prontoTexto`.

```tsx
// src/app/(sitio)/[lang]/guia/aparece-en-la-guia/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { esLocale, LOCALES } from '../../../../../dominio/idioma'
import { rutas } from '../../../../../dominio/rutas'
import { ajustesCacheados, zonasActivasCacheadas } from '../../../../../sitio/datos/cacheadas'
import { guiaIndexable, sitioUrl } from '../../../../../sitio/entorno'
import '../../../../../sitio/estilos/aparece.css'
import { migasLd } from '../../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../../sitio/seo/metadatos'
import { versionesDe } from '../../../../../sitio/seo/versiones'
import { textos } from '../../../../../sitio/textos'
import { FormularioSolicitud } from '../../../../../sitio/ui/FormularioSolicitud'
import { JsonLd } from '../../../../../sitio/ui/JsonLd'
import { Migas } from '../../../../../sitio/ui/Migas'

export const revalidate = 3600
type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!esLocale(lang)) return {}
  const { propia, versiones } = versionesDe({ lang, guiaIndexable: guiaIndexable(), rutas: Object.fromEntries(LOCALES.map((l) => [l, rutas.negocios(l)])) })
  const t = textos(lang).formulario
  return metadatos({ lang, titulo: t.titulo, descripcion: t.explicacion, ruta: propia.ruta, indexable: propia.indexable, versiones })
}

export default async function Aparece({ params }: Props) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  const [ajustes, zonas] = await Promise.all([ajustesCacheados(lang), zonasActivasCacheadas(lang)])
  const t = textos(lang)
  const migas = [{ nombre: t.migas.guia, ruta: rutas.portada(lang) }, { nombre: t.formulario.titulo, ruta: rutas.negocios(lang) }]
  return (
    <div className="ancho">
      <Migas lang={lang} migas={migas} />
      <div className="negocios">
        <section className="explica" aria-labelledby="titulo">
          <h1 id="titulo" className="t-pagina">{t.formulario.titulo}</h1>
          <p>{t.formulario.explicacion}</p>
          <ol className="pasos">
            {t.formulario.pasos.map((p, i) => <li key={i}><b>{i + 1}</b><span><strong>{p.titulo}</strong> {p.texto}</span></li>)}
          </ol>
          <p className="meta">{t.formulario.notaPatrocinio}</p>
        </section>
        <section aria-label={t.formulario.cuentanos}>
          {ajustes.formularioActivo ? (
            <FormularioSolicitud lang={lang} zonas={zonas.map(({ id, nombre, slug }) => ({ id, nombre, slug }))} siteKey={process.env.TURNSTILE_SITE_KEY ?? ''} version={ajustes.versionAviso} />
          ) : (
            <div className="cerrado"><h2>{t.formulario.pronto}</h2><p>{t.formulario.prontoTexto}</p></div>
          )}
        </section>
      </div>
      <JsonLd datos={migasLd(migas, sitioUrl())} />
    </div>
  )
}
```

Esta tarea importa `track` de `../analitica/track`, que crea la Task 13. Para que el orden no importe, crea ya `src/sitio/analitica/track.ts` y `adaptador.ts` con el código de la Task 13, Step 3, y la Task 13 solo agrega sus pruebas y el listener. Si la Task 13 se ejecuta antes, sáltate esto.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`, `npm run lint` y `npm run build`. Luego, con el seed (`formularioActivo` apagado) y `next start`, `curl -s localhost:3100/es/guia/aparece-en-la-guia | grep -o 'Muy pronto'`.
Expected: PASS y `Muy pronto`.

- [ ] **Step 3: Commit**

```bash
git add src/formulario/accion.ts src/sitio src/app/'(sitio)'/'[lang]'/guia/aparece-en-la-guia
git commit -m "feat: página Aparece en la guía con formulario, Turnstile y Server Action

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Publicación programada y crones

**Files:**
- Create: `src/dominio/ventana.ts`, `src/cron/autorizar.ts`, `src/cron/hora.ts`, `src/cron/diario.ts`, `src/solicitudes/anonimizar.ts`, `src/app/(sitio)/api/cron/hora/route.ts`, `src/app/(sitio)/api/cron/diario/route.ts`
- Modify: `src/collections/Lugares.ts`, `src/collections/Eventos.ts`, `src/collections/Articulos.ts`, `vercel.json`, `src/seed/vaciar.ts` (si `payload-jobs` no quedó en la Task 2)
- Regenerate: migraciones y tipos
- Test: `tests/unit/ventana.test.ts`, `tests/unit/autorizar.test.ts`, `tests/int/crones.int.test.ts`

**Interfaces:**
- Consumes: `inicioDelDiaGuardado`, `etiquetasDeCambio`, `debeAnonimizar`, `CAMPOS_PERSONALES`.
- Produces:
  - `instantesDeCambio(doc): Date[]` y `cayoEnVentana(instante: Date, ahora: Date, minutos?: number): boolean`.
  - `autorizado(request: Request, secreto?: string): boolean`.
  - `correrHora(payload, ahora, revalidar: (etiquetas: string[]) => void): Promise<{ revalidadas: number; ipBorrados: number }>` y `correrDiario(payload, ahora): Promise<{ anonimizadas: number }>`.
  - `anonimizarSolicitud(payload, id): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/ventana.test.ts
import { describe, expect, it } from 'vitest'

import { cayoEnVentana, instantesDeCambio } from '../../src/dominio/ventana'

describe('ventana del cron (spec §10)', () => {
  const ahora = new Date('2026-11-10T08:05:00Z') // 01:05 en BCS
  it('cayó en los últimos 65 minutos', () => {
    expect(cayoEnVentana(new Date('2026-11-10T07:05:00Z'), ahora)).toBe(true)
    expect(cayoEnVentana(new Date('2026-11-10T06:59:00Z'), ahora)).toBe(false)
    expect(cayoEnVentana(new Date('2026-11-10T08:06:00Z'), ahora)).toBe(false)
  })
  it('patrocinio de solo día cuenta desde las 00:00 de BCS', () => {
    const i = instantesDeCambio({ patrocinio: { desde: '2026-11-10T00:00:00.000Z', hasta: null }, inicio: null, fin: null })
    expect(i.map((d) => d.toISOString())).toEqual(['2026-11-10T07:00:00.000Z'])
    expect(cayoEnVentana(i[0], ahora)).toBe(true)
  })
  it('evento: inicio y fin', () => {
    expect(instantesDeCambio({ inicio: '2026-11-10T08:00:00Z', fin: '2026-11-10T10:00:00Z' })).toHaveLength(2)
  })
})
```

```ts
// tests/unit/autorizar.test.ts
import { describe, expect, it } from 'vitest'

import { autorizado } from '../../src/cron/autorizar'

const pedir = (h?: string) => new Request('https://x.test/api/cron/hora', { headers: h ? { authorization: h } : {} })

describe('autorizar crones', () => {
  it('Bearer con el secreto', () => {
    expect(autorizado(pedir('Bearer s3cr3t'), 's3cr3t')).toBe(true)
    expect(autorizado(pedir('Bearer otro'), 's3cr3t')).toBe(false)
    expect(autorizado(pedir(), 's3cr3t')).toBe(false)
  })
  it('sin secreto configurado, nunca', () => expect(autorizado(pedir('Bearer '), '')).toBe(false))
})
```

```ts
// tests/int/crones.int.test.ts
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { correrDiario } from '../../src/cron/diario'
import { correrHora } from '../../src/cron/hora'
import { crearCategoria, crearImagen, crearLugar, crearZona, limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('crones (spec §10, §12)', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('hora: revalida lo que cambió por fechas y borra ipHash de más de 24 h', async () => {
    const zona = await crearZona(payload)
    const cat = await crearCategoria(payload)
    const img = await crearImagen(payload)
    const l = await crearLugar(payload, { zona: zona.id, categorias: [cat.id], foto: img.id, slugEs: 'patrocinado-x' })
    await payload.update({ collection: 'lugares', id: l.id, overrideAccess: true, data: { patrocinio: { activo: true, desde: '2026-11-10', hasta: '2026-12-10' } } })
    const vieja = await payload.create({ collection: 'solicitudes', overrideAccess: true, data: { negocio: 'V', aceptoPrivacidad: true, ipHash: 'a'.repeat(64) } })
    const nueva = await payload.create({ collection: 'solicitudes', overrideAccess: true, data: { negocio: 'N', aceptoPrivacidad: true, ipHash: 'b'.repeat(64) } })
    const ahora = new Date('2026-11-10T08:05:00Z')
    await payload.db.updateOne({ collection: 'solicitudes', where: { id: { equals: vieja.id } }, data: { createdAt: '2026-11-09T07:00:00.000Z' } })
    await payload.db.updateOne({ collection: 'solicitudes', where: { id: { equals: nueva.id } }, data: { createdAt: '2026-11-10T07:00:00.000Z' } })
    const revalidar = vi.fn()
    const r = await correrHora(payload, ahora, revalidar)
    expect(revalidar.mock.calls.flat(2)).toContain(`lugar:${l.id}`)
    expect(r.ipBorrados).toBe(1)
    expect((await payload.findByID({ collection: 'solicitudes', id: vieja.id, overrideAccess: true })).ipHash ?? null).toBeNull()
    expect((await payload.findByID({ collection: 'solicitudes', id: nueva.id, overrideAccess: true })).ipHash).toBe('b'.repeat(64))
  })

  it('diario: anonimiza rechazadas y las viejas sin cambio; no toca aceptadas', async () => {
    const mk = (estado: 'rechazada' | 'en-contacto' | 'aceptada') => payload.create({ collection: 'solicitudes', overrideAccess: true, data: { negocio: estado, aceptoPrivacidad: true, estado, correo: 'x@ejemplo.invalid', mensaje: 'hola' } })
    const rech = await mk('rechazada')
    const vieja = await mk('en-contacto')
    const acep = await mk('aceptada')
    await payload.db.updateOne({ collection: 'solicitudes', where: { id: { equals: vieja.id } }, data: { estadoCambiadoEl: '2024-01-01T00:00:00.000Z' } })
    const r = await correrDiario(payload, new Date())
    expect(r.anonimizadas).toBe(2)
    const leer = (id: number) => payload.findByID({ collection: 'solicitudes', id, overrideAccess: true })
    expect(await leer(rech.id)).toMatchObject({ correo: null, mensaje: null, negocio: 'rechazada' })
    expect((await leer(rech.id)).anonimizadaEl).toBeTruthy()
    expect((await leer(acep.id)).correo).toBe('x@ejemplo.invalid')
  })
})
```

`payload.db.updateOne` escribe directo en la base, sin hooks. Es la forma de fijar fechas pasadas en la prueba.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/ventana.test.ts tests/unit/autorizar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

En `Lugares.ts`, `Eventos.ts` y `Articulos.ts`, cambia `versions: { drafts: true, maxPerDoc: 50 }` por `versions: { drafts: { schedulePublish: true }, maxPerDoc: 50 }`. Payload agrega la tarea de publicación programada y la colección `payload-jobs`; comprueba en `src/payload-types.ts` que aparezca `payload-jobs`. En `vaciar.ts`, `payload-jobs` va primero en `ORDEN`.

```bash
npm run migracion:regenerar -- --no-hay-deploy
npm run generate:types && npm run generate:importmap
```

```ts
// src/dominio/ventana.ts
import { inicioDelDiaGuardado } from './fechas'

type ConFechas = {
  patrocinio?: { desde?: string | null; hasta?: string | null } | null
  inicio?: string | null
  fin?: string | null
}

// Spec §10: instantes en que un lugar o evento cambia de estado con el tiempo. Patrocinio: días de BCS.
export function instantesDeCambio(doc: ConFechas): Date[] {
  const p = doc.patrocinio ?? {}
  return [
    p.desde ? inicioDelDiaGuardado(p.desde) : null,
    p.hasta ? inicioDelDiaGuardado(p.hasta) : null,
    doc.inicio ? new Date(doc.inicio) : null,
    doc.fin ? new Date(doc.fin) : null,
  ].filter((d): d is Date => d !== null)
}

// La ventana (65 min) se traslapa a propósito con la del cron anterior; revalidar dos veces no hace daño.
export const cayoEnVentana = (instante: Date, ahora: Date, minutos = 65): boolean =>
  instante.getTime() <= ahora.getTime() && instante.getTime() >= ahora.getTime() - minutos * 60_000
```

```ts
// src/cron/autorizar.ts
import { timingSafeEqual } from 'node:crypto'

// Vercel Cron manda Authorization: Bearer ${CRON_SECRET}. Sin secreto configurado, nadie pasa.
export function autorizado(request: Request, secreto: string | undefined = process.env.CRON_SECRET): boolean {
  if (!secreto) return false
  const esperado = Buffer.from(`Bearer ${secreto}`)
  const recibido = Buffer.from(request.headers.get('authorization') ?? '')
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
}
```

```ts
// src/solicitudes/anonimizar.ts
import type { Payload } from 'payload'

import { CAMPOS_PERSONALES } from '../dominio/conservacion'

// Única forma de anonimizar (cron diario y acción del Admin). Spec §12: quedan negocio, giro, zona, estado y fechas.
export async function anonimizarSolicitud(payload: Payload, id: number): Promise<void> {
  const vacios = Object.fromEntries(CAMPOS_PERSONALES.map((c) => [c, null]))
  await payload.update({
    collection: 'solicitudes',
    id,
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: { ...vacios, ipHash: null, anonimizadaEl: new Date().toISOString() },
  })
}
```

```ts
// src/cron/hora.ts
import type { Payload } from 'payload'

import { etiquetasDeCambio } from '../dominio/etiquetas'
import { cayoEnVentana, instantesDeCambio } from '../dominio/ventana'

const DIA = 24 * 60 * 60 * 1000

// Spec §10 (cada hora, minuto 5): la cola de Payload (publicación programada) y la ventana de fechas.
// Además borra los ipHash de más de 24 h (spec §12; a la hora para no pasarse del plazo).
export async function correrHora(payload: Payload, ahora: Date, revalidar: (etiquetas: string[]) => void) {
  await payload.jobs.run({ limit: 100 }) // por defecto corre 10: no dejar publicaciones para la hora siguiente
  const etiquetas = new Set<string>()
  for (const coleccion of ['lugares', 'eventos'] as const) {
    const { docs } = await payload.find({ collection: coleccion, overrideAccess: true, pagination: false, depth: 0 })
    for (const d of docs) {
      if (instantesDeCambio(d as never).some((i) => cayoEnVentana(i, ahora))) {
        etiquetasDeCambio(coleccion, d as never, null).forEach((t) => etiquetas.add(t))
      }
    }
  }
  if (etiquetas.size) revalidar([...etiquetas])
  const { docs: viejas } = await payload.update({
    collection: 'solicitudes',
    overrideAccess: true,
    context: { disableRevalidate: true },
    where: { and: [{ ipHash: { exists: true } }, { createdAt: { less_than: new Date(ahora.getTime() - DIA).toISOString() } }] },
    data: { ipHash: null },
  })
  return { revalidadas: etiquetas.size, ipBorrados: viejas.length }
}
```

```ts
// src/cron/diario.ts
import type { Payload } from 'payload'

import { debeAnonimizar } from '../dominio/conservacion'
import { anonimizarSolicitud } from '../solicitudes/anonimizar'

// Spec §12 (diario): anonimiza las rechazadas y las que llevan 12 meses sin cambio de estado (salvo aceptadas).
export async function correrDiario(payload: Payload, ahora: Date) {
  const { docs } = await payload.find({
    collection: 'solicitudes',
    overrideAccess: true,
    pagination: false,
    depth: 0,
    where: { anonimizadaEl: { exists: false } },
  })
  let anonimizadas = 0
  for (const s of docs) {
    if (debeAnonimizar({ estado: s.estado ?? 'nueva', estadoCambiadoEl: s.estadoCambiadoEl ?? null, createdAt: s.createdAt, anonimizadaEl: s.anonimizadaEl ?? null }, ahora)) {
      await anonimizarSolicitud(payload, s.id)
      anonimizadas++
    }
  }
  return { anonimizadas }
}
```

```ts
// src/app/(sitio)/api/cron/hora/route.ts
import { revalidateTag } from 'next/cache'

import { autorizado } from '../../../../../cron/autorizar'
import { correrHora } from '../../../../../cron/hora'
import { obtenerPayload } from '../../../../../sitio/datos/payload'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!autorizado(request)) return new Response('No autorizado', { status: 401 })
  const r = await correrHora(await obtenerPayload(), new Date(), (etiquetas) => etiquetas.forEach((t) => revalidateTag(t, { expire: 0 })))
  return Response.json(r)
}
```

```ts
// src/app/(sitio)/api/cron/diario/route.ts
import { autorizado } from '../../../../../cron/autorizar'
import { correrDiario } from '../../../../../cron/diario'
import { obtenerPayload } from '../../../../../sitio/datos/payload'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!autorizado(request)) return new Response('No autorizado', { status: 401 })
  return Response.json(await correrDiario(await obtenerPayload(), new Date()))
}
```

`vercel.json`:

```json
{
  "buildCommand": "npm run build:vercel",
  "regions": ["iad1"],
  "crons": [
    { "path": "/api/cron/hora", "schedule": "5 * * * *" },
    { "path": "/api/cron/diario", "schedule": "15 9 * * *" }
  ]
}
```

`15 9 * * *` en UTC son las 02:15 en BCS, que no tiene horario de verano.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`, `npm run test:int` (completo) y `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src vercel.json tests/unit/ventana.test.ts tests/unit/autorizar.test.ts tests/int/crones.int.test.ts
git commit -m "feat: publicación programada y crones de fechas, ipHash y conservación

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Acción «Anonimizar» en el admin

**Files:**
- Create: `src/componentes-admin/BotonAnonimizar.tsx`
- Modify: `src/collections/Solicitudes.ts`, `src/app/(payload)/admin/importMap.js` (regenerado)
- Test: `tests/int/anonimizar.int.test.ts`

**Interfaces:**
- Consumes: `anonimizarSolicitud` (Task 9), `esAdmin` (`src/acceso/roles.ts`).
- Produces:
  - `POST /api/solicitudes/:id/anonimizar`, solo Admin.
  - El campo de interfaz `accionAnonimizar` con el botón.

- [ ] **Step 1: Write the failing test**

```ts
// tests/int/anonimizar.int.test.ts
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { Solicitudes } from '../../src/collections/Solicitudes'
import { crearUsuario, limpiar, obtenerPayload } from './utils'

let payload: Payload
const endpoint = () => Solicitudes.endpoints && Solicitudes.endpoints.find((e) => e.path === '/:id/anonimizar')

describe('acción de anonimizar (spec §12)', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('solo un Admin puede; borra los datos personales', async () => {
    const s = await payload.create({ collection: 'solicitudes', overrideAccess: true, data: { negocio: 'N', aceptoPrivacidad: true, estado: 'aceptada', correo: 'x@ejemplo.invalid' } })
    const handler = endpoint()!.handler
    const editor = await crearUsuario(payload, 'editor')
    const negado = await handler({ payload, user: editor, routeParams: { id: String(s.id) } } as never)
    expect(negado.status).toBe(403)
    const admin = await crearUsuario(payload, 'admin')
    const ok = await handler({ payload, user: admin, routeParams: { id: String(s.id) } } as never)
    expect(ok.status).toBe(200)
    expect((await payload.findByID({ collection: 'solicitudes', id: s.id, overrideAccess: true })).correo ?? null).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:int -- tests/int/anonimizar.int.test.ts`
Expected: FAIL (no hay endpoint).

- [ ] **Step 3: Write the implementation**

En `src/collections/Solicitudes.ts`:

```ts
import { esAdmin } from '../acceso/roles'
import { anonimizarSolicitud } from '../solicitudes/anonimizar'

// …dentro de la colección:
  endpoints: [
    {
      path: '/:id/anonimizar',
      method: 'post',
      // Spec §12: una Solicitud aceptada la anonimiza un Admin cuando termina la relación.
      handler: async (req) => {
        if (!esAdmin(req.user)) return Response.json({ error: 'Solo un Admin puede anonimizar.' }, { status: 403 })
        const id = Number(req.routeParams?.id)
        if (!Number.isInteger(id)) return Response.json({ error: 'Id inválido.' }, { status: 400 })
        await anonimizarSolicitud(req.payload, id)
        return Response.json({ ok: true })
      },
    },
  ],
// …y en fields, al final:
    {
      name: 'accionAnonimizar',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (datos) => Boolean(datos?.id) && !datos?.anonimizadaEl,
        components: { Field: '/componentes-admin/BotonAnonimizar#BotonAnonimizar' },
      },
    },
```

```tsx
// src/componentes-admin/BotonAnonimizar.tsx
'use client'

import { Button, useAuth, useDocumentInfo } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Acción del admin (spec §12). El servidor revisa que sea Admin; aquí solo se oculta para los demás.
export function BotonAnonimizar() {
  const { id } = useDocumentInfo()
  const { user } = useAuth<{ rol?: string }>()
  const router = useRouter()
  const [trabajando, setTrabajando] = useState(false)
  if (!id || user?.rol !== 'admin') return null
  return (
    <Button
      buttonStyle="secondary"
      disabled={trabajando}
      onClick={async () => {
        if (!window.confirm('Se borrarán nombre, correo, teléfono, web y mensaje de esta solicitud. No se puede deshacer.')) return
        setTrabajando(true)
        const r = await fetch(`/api/solicitudes/${id}/anonimizar`, { method: 'POST', credentials: 'include' })
        setTrabajando(false)
        if (r.ok) router.refresh()
        else window.alert('No se pudo anonimizar.')
      }}
    >
      Anonimizar solicitud
    </Button>
  )
}
```

```bash
npm run generate:importmap
npm run generate:types
```

Un campo `ui` no cambia el esquema. Aun así, corre la comprobación del CI del esquema sin migración (Task 14) para confirmarlo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:int -- tests/int/anonimizar.int.test.ts`, `npm run typecheck` y `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/collections/Solicitudes.ts src/componentes-admin 'src/app/(payload)/admin/importMap.js' src/payload-types.ts tests/int/anonimizar.int.test.ts
git commit -m "feat: acción Anonimizar en el admin, solo para Admin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Sitemap

**Files:**
- Create: `src/sitio/seo/sitemap.ts`, `src/app/(sitio)/guia-sitemap.xml/route.ts`
- Test: `tests/unit/sitemap.test.ts`

**Interfaces:**
- Consumes: `versionesDe`, `hreflang` y las listas (F3a/F3b); `UMBRAL_PAGINA` y `UMBRAL_INDEXABLE`.
- Produces:
  - `type DatosIdioma = { zonas: ZonaPublica[]; categorias: CategoriaPublica[]; lugares: TarjetaLugar[]; eventos: TarjetaEvento[]; articulos: TarjetaArticulo[]; avisoExiste: boolean }`.
  - `entradasSitemap(datos: Record<Locale, DatosIdioma>, guiaIndexable: boolean): { ruta: string; alternos: Record<string, string> }[]`.
  - `xmlSitemap(entradas, base: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/sitemap.test.ts
import { describe, expect, it } from 'vitest'

import { entradasSitemap, xmlSitemap } from '../../src/sitio/seo/sitemap'

const zona = { id: 1, slug: 'la-paz', nombre: 'La Paz' }
const cat = (slug: string) => ({ id: 5, slug, nombre: slug, aplicaA: 'lugar' })
const lugar = (id: number, slug: string, noIndexar = false) => ({ id, slug, zonaId: 1, categoriaIds: [5], noIndexar })
const vacio = { eventos: [], articulos: [], avisoExiste: true }

const datos = {
  es: { ...vacio, zonas: [zona], categorias: [cat('playas')], lugares: [lugar(1, 'a'), lugar(2, 'b'), lugar(3, 'c', true)] },
  en: { ...vacio, zonas: [zona], categorias: [cat('beaches')], lugares: [lugar(1, 'a-en')] },
} as never

describe('sitemap (spec §9)', () => {
  const rutas = (e: { ruta: string }[]) => e.map((x) => x.ruta)

  it('sin GUIA_INDEXABLE no hay nada', () => expect(entradasSitemap(datos, false)).toEqual([]))

  it('solo URLs indexables; la búsqueda nunca', () => {
    const r = rutas(entradasSitemap(datos, true))
    expect(r).toContain('/es/guia')
    expect(r).toContain('/en/guide/la-paz')
    expect(r).toContain('/es/guia/lugares/a')
    expect(r).not.toContain('/es/guia/lugares/c') // noIndexar
    expect(r).toContain('/es/guia/la-paz/playas') // 3 lugares en es
    expect(r).not.toContain('/en/guide/la-paz/beaches') // 1 en en: noindex
    expect(r.some((x) => x.includes('buscar') || x.includes('search'))).toBe(false)
  })

  it('alternos solo entre versiones indexables', () => {
    const e = entradasSitemap(datos, true)
    expect(e.find((x) => x.ruta === '/es/guia/lugares/a')?.alternos).toMatchObject({ 'en-US': '/en/guide/places/a-en' })
    expect(e.find((x) => x.ruta === '/es/guia/la-paz/playas')?.alternos).toEqual({})
  })

  it('XML con URLs absolutas y xhtml:link', () => {
    const xml = xmlSitemap([{ ruta: '/es/guia', alternos: { 'es-MX': '/es/guia', 'en-US': '/en/guide', 'x-default': '/es/guia' } }], 'https://www.salysoltours.com')
    expect(xml).toContain('<loc>https://www.salysoltours.com/es/guia</loc>')
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en-US" href="https://www.salysoltours.com/en/guide"/>')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/sitemap.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// src/sitio/seo/sitemap.ts
import { LOCALES, type Locale } from '../../dominio/idioma'
import { hreflang, type VersionIdioma } from '../../dominio/indexable'
import { rutas } from '../../dominio/rutas'
import { UMBRAL_INDEXABLE, UMBRAL_PAGINA } from '../../dominio/umbrales'
import type { CategoriaPublica, TarjetaArticulo, TarjetaEvento, TarjetaLugar, ZonaPublica } from '../datos/tipos'

export type DatosIdioma = {
  zonas: ZonaPublica[]
  categorias: CategoriaPublica[]
  lugares: TarjetaLugar[]
  eventos: TarjetaEvento[]
  articulos: TarjetaArticulo[]
  avisoExiste: boolean
}
type Entrada = { ruta: string; alternos: Record<string, string> }
type Version = { ruta: string; indexable: boolean }

// Un «documento lógico» con su versión en cada idioma (si existe ahí); cada versión indexable es una URL.
function agregar(salida: Entrada[], versiones: Partial<Record<Locale, Version>>) {
  const vs: VersionIdioma[] = LOCALES.filter((l) => versiones[l]).map((l) => ({ lang: l, ...versiones[l]! }))
  for (const v of vs) if (v.indexable) salida.push({ ruta: v.ruta, alternos: hreflang(v, vs) })
}

// Spec §9: todas las URLs indexables de los dos idiomas y sus alternos indexables. Sin búsqueda ni variantes.
export function entradasSitemap(datos: Record<Locale, DatosIdioma>, guiaIndexable: boolean): Entrada[] {
  if (!guiaIndexable) return []
  const s: Entrada[] = []
  const porIdioma = <T>(f: (l: Locale, d: DatosIdioma) => T | null) =>
    Object.fromEntries(LOCALES.map((l) => [l, f(l, datos[l])]).filter(([, v]) => v !== null)) as Partial<Record<Locale, T>>

  agregar(s, porIdioma((l) => ({ ruta: rutas.portada(l), indexable: true })))
  agregar(s, porIdioma((l) => ({ ruta: rutas.eventos(l), indexable: true })))
  agregar(s, porIdioma((l) => ({ ruta: rutas.negocios(l), indexable: true })))
  agregar(s, porIdioma((l, d) => (d.avisoExiste ? { ruta: rutas.privacidad(l), indexable: true } : null)))

  const zonaIds = new Set(LOCALES.flatMap((l) => datos[l].zonas.map((z) => z.id)))
  const catIds = new Set(LOCALES.flatMap((l) => datos[l].categorias.filter((c) => c.aplicaA !== 'evento').map((c) => c.id)))
  for (const zid of zonaIds) {
    agregar(s, porIdioma((l, d) => {
      const z = d.zonas.find((x) => x.id === zid)
      return z ? { ruta: rutas.zona(l, z.slug), indexable: true } : null
    }))
    for (const cid of catIds) {
      agregar(s, porIdioma((l, d) => {
        const z = d.zonas.find((x) => x.id === zid)
        const c = d.categorias.find((x) => x.id === cid)
        const n = d.lugares.filter((x) => x.zonaId === zid && x.categoriaIds.includes(cid)).length
        return z && c && n >= UMBRAL_PAGINA ? { ruta: rutas.categoriaEnZona(l, z.slug, c.slug), indexable: n >= UMBRAL_INDEXABLE } : null
      }))
    }
  }
  for (const cid of catIds) {
    agregar(s, porIdioma((l, d) => {
      const c = d.categorias.find((x) => x.id === cid)
      const activas = new Set(d.zonas.map((z) => z.id))
      const n = d.lugares.filter((x) => x.categoriaIds.includes(cid) && activas.has(x.zonaId)).length
      return c && n >= UMBRAL_PAGINA ? { ruta: rutas.categoria(l, c.slug), indexable: n >= UMBRAL_INDEXABLE } : null
    }))
  }
  const docs = <T extends { id: number; slug: string; noIndexar: boolean }>(lista: (d: DatosIdioma) => T[], ruta: (l: Locale, slug: string) => string) => {
    const ids = new Set(LOCALES.flatMap((l) => lista(datos[l]).map((x) => x.id)))
    for (const id of ids) {
      agregar(s, porIdioma((l, d) => {
        const x = lista(d).find((y) => y.id === id)
        return x ? { ruta: ruta(l, x.slug), indexable: !x.noIndexar } : null
      }))
    }
  }
  docs((d) => d.lugares, rutas.lugar)
  docs((d) => d.eventos, rutas.evento) // Spec §6: los eventos pasados siguen en el sitemap.
  docs((d) => d.articulos, rutas.articulo)
  return s
}

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

export function xmlSitemap(entradas: Entrada[], base: string): string {
  const abs = (r: string) => escapar(new URL(r, base).toString())
  const urls = entradas.map((e) => {
    const alternos = Object.entries(e.alternos).map(([h, r]) => `<xhtml:link rel="alternate" hreflang="${h}" href="${abs(r)}"/>`).join('')
    return `<url><loc>${abs(e.ruta)}</loc>${alternos}</url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>\n`
}
```

```ts
// src/app/(sitio)/guia-sitemap.xml/route.ts
import { LOCALES, tieneValor } from '../../../dominio/idioma'
import {
  ajustesCacheados, articulosCacheados, categoriasCacheadas, eventosCacheados, lugaresCacheados, zonasActivasCacheadas,
} from '../../../sitio/datos/cacheadas'
import { guiaIndexable, sitioUrl } from '../../../sitio/entorno'
import { entradasSitemap, xmlSitemap, type DatosIdioma } from '../../../sitio/seo/sitemap'

export const revalidate = 3600

// Spec §9: 404 hasta que GUIA_INDEXABLE sea true.
export async function GET() {
  if (!guiaIndexable()) return new Response('No encontrado', { status: 404 })
  const datos = Object.fromEntries(
    await Promise.all(
      LOCALES.map(async (l) => {
        const [zonas, categorias, lugares, eventos, articulos, ajustes] = await Promise.all([
          zonasActivasCacheadas(l), categoriasCacheadas(l), lugaresCacheados(l), eventosCacheados(l), articulosCacheados(l), ajustesCacheados(l),
        ])
        return [l, { zonas, categorias, lugares, eventos, articulos, avisoExiste: tieneValor(ajustes.avisoPrivacidad) } satisfies DatosIdioma] as const
      }),
    ),
  ) as Record<(typeof LOCALES)[number], DatosIdioma>
  return new Response(xmlSitemap(entradasSitemap(datos, true), sitioUrl()), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
```

`GUIA_INDEXABLE` se lee al servir, pero con `revalidate` el resultado se guarda una hora. El spec §5.5 ya dice que cambiarla exige un redeploy, así que no es un problema.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/sitemap.test.ts`, `npm run typecheck` y `npm run build`
Expected: PASS. El build no marca un choque entre `guia-sitemap.xml` y `[lang]`.

- [ ] **Step 5: Commit**

```bash
git add src/sitio/seo/sitemap.ts 'src/app/(sitio)/guia-sitemap.xml' tests/unit/sitemap.test.ts
git commit -m "feat: sitemap de la guía con alternos solo entre versiones indexables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Imágenes Open Graph

**Files:**
- Create: `src/sitio/seo/og.ts`, `src/app/(sitio)/guia-assets/og/[lang]/[tipo]/[[...ruta]]/route.tsx`
- Modify: `src/sitio/seo/metadatos.ts` y las páginas que llaman `metadatos`: portada, zona, `CategoriaEnZona`, `CategoriaGlobal`, lugar, `ListadoEventos`, evento, artículo, negocios y privacidad
- Test: `tests/unit/og.test.ts`, `tests/unit/metadatos.test.ts` (agregar)

**Interfaces:**
- Produces:
  - `type TipoOg = 'portada' | 'zona' | 'categoria-zona' | 'categoria' | 'lugar' | 'evento' | 'articulo' | 'pagina'`.
  - `rutaOg(lang: Locale, tipo: TipoOg, segmentos?: string[]): string`.
  - `EntradaMetadatos.imagenOg?: string`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/og.test.ts
import { describe, expect, it } from 'vitest'

import { rutaOg } from '../../src/sitio/seo/og'

describe('rutaOg', () => {
  it('bajo /guia-assets (lo reescribe el sitio de reservas), con slugs', () => {
    expect(rutaOg('en', 'lugar', ['balandra'])).toBe('/guia-assets/og/en/lugar/balandra')
    expect(rutaOg('es', 'portada')).toBe('/guia-assets/og/es/portada')
    expect(rutaOg('es', 'categoria-zona', ['la-paz', 'playas'])).toBe('/guia-assets/og/es/categoria-zona/la-paz/playas')
  })
})
```

En `tests/unit/metadatos.test.ts`, agrega un caso: `metadatos({ ...base, indexable: true, versiones, imagenOg: '/guia-assets/og/es/zona/la-paz' }).openGraph` debe incluir `images: [{ url: '/guia-assets/og/es/zona/la-paz', width: 1200, height: 630 }]`, y `twitter` debe ser `{ card: 'summary_large_image' }`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/og.test.ts tests/unit/metadatos.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// src/sitio/seo/og.ts
import type { Locale } from '../../dominio/idioma'

export type TipoOg = 'portada' | 'zona' | 'categoria-zona' | 'categoria' | 'lugar' | 'evento' | 'articulo' | 'pagina'

// Las imágenes OG viven bajo /guia-assets/og (ese prefijo sí lo reescribe el sitio de reservas, spec §4); la ruta
// interna en inglés (/en/guia/…) daría 404 por el proxy.
export const rutaOg = (lang: Locale, tipo: TipoOg, segmentos: string[] = []): string =>
  ['/guia-assets/og', lang, tipo, ...segmentos].join('/')
```

En `metadatos.ts`, agrega `imagenOg?: string` a `EntradaMetadatos`, y en el resultado:

```ts
    openGraph: {
      // …lo de F3a…
      ...(e.imagenOg ? { images: [{ url: e.imagenOg, width: 1200, height: 630 }] } : {}),
    },
    ...(e.imagenOg ? { twitter: { card: 'summary_large_image' as const } } : {}),
```

```tsx
// src/app/(sitio)/guia-assets/og/[lang]/[tipo]/[[...ruta]]/route.tsx
import { ImageResponse } from 'next/og'

import { esLocale, type Locale } from '../../../../../../../dominio/idioma'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, lugaresCacheados, zonasActivasCacheadas,
} from '../../../../../../../sitio/datos/cacheadas'
import { porSlug } from '../../../../../../../sitio/datos/consultas'
import type { Imagen } from '../../../../../../../sitio/datos/tipos'
import { textos } from '../../../../../../../sitio/textos'

export const revalidate = 3600
type Params = { lang: string; tipo: string; ruta?: string[] }

async function datosOg(lang: Locale, tipo: string, ruta: string[]): Promise<{ titulo: string; imagen: Imagen | null } | null> {
  const t = textos(lang)
  const [a, b] = ruta
  if (tipo === 'portada') return { titulo: t.portada.titulo, imagen: null }
  if (tipo === 'pagina') {
    const titulos: Record<string, string> = { eventos: t.listado.eventosTitulo, negocios: t.formulario.titulo, privacidad: t.privacidad.titulo }
    return a && titulos[a] ? { titulo: titulos[a], imagen: null } : null
  }
  if (tipo === 'zona') {
    const z = porSlug(await zonasActivasCacheadas(lang), a ?? '')
    return z ? { titulo: z.nombre, imagen: z.foto } : null
  }
  if (tipo === 'categoria-zona' || tipo === 'categoria') {
    const cats = await categoriasCacheadas(lang)
    const c = porSlug(cats, tipo === 'categoria' ? (a ?? '') : (b ?? ''))
    const z = tipo === 'categoria-zona' ? porSlug(await zonasActivasCacheadas(lang), a ?? '') : null
    if (!c || (tipo === 'categoria-zona' && !z)) return null
    return { titulo: z ? t.listado.titulo(c.nombre, z.nombre) : t.listado.enTodas(c.nombre), imagen: z?.foto ?? null }
  }
  if (tipo === 'lugar') {
    const x = porSlug(await lugaresCacheados(lang), a ?? '')
    return x ? { titulo: x.nombre, imagen: x.foto } : null
  }
  if (tipo === 'evento') {
    const x = porSlug(await eventosCacheados(lang), a ?? '')
    return x ? { titulo: x.nombre, imagen: x.foto } : null
  }
  if (tipo === 'articulo') {
    const x = porSlug(await articulosCacheados(lang), a ?? '')
    return x ? { titulo: x.titulo, imagen: x.portada } : null
  }
  return null
}

// Spec §9: marca + título sobre el tamaño 1200×630 de la foto principal; sin foto, fondo de marca. Satori no lee
// WOFF2: el título usa la fuente que trae next/og.
export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { lang, tipo, ruta = [] } = await params
  if (!esLocale(lang)) return new Response('No encontrado', { status: 404 })
  const d = await datosOg(lang, tipo, ruta)
  if (!d) return new Response('No encontrado', { status: 404 })
  const fondo = d.imagen?.og ? new URL(d.imagen.og, request.url).toString() : null
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#1B607F' }}>
        {fondo && <img src={fondo} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }} alt="" />}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 64, background: 'linear-gradient(to top, rgba(31,26,20,.85), rgba(31,26,20,.2))' }}>
          {/* Satori no soporta filter ni inset: marca en texto blanco en lugar del logo negro. */}
          <div style={{ color: '#fff', fontSize: 28, letterSpacing: 4, marginBottom: 20 }}>SUN BAJA · GUÍA DE LA BAJA</div>
          <div style={{ color: '#fff', fontSize: 64, fontWeight: 700, lineHeight: 1.05, textTransform: 'uppercase', maxWidth: 1000 }}>{d.titulo}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600' } },
  )
}
```

Esta ruta usa `t.formulario.titulo` y `t.privacidad.titulo`, de las Tasks 5 y 8.

Pasa `imagenOg` en cada `metadatos(...)`:

| Página | `imagenOg` |
|---|---|
| portada | `rutaOg(lang, 'portada')` |
| zona | `rutaOg(lang, 'zona', [zona.slug])` |
| `CategoriaEnZona` | `rutaOg(lang, 'categoria-zona', [zonaSlug, categoriaSlug])` |
| `CategoriaGlobal` | `rutaOg(lang, 'categoria', [categoriaSlug])` |
| lugar | `rutaOg(lang, 'lugar', [slug])` |
| evento | `rutaOg(lang, 'evento', [slug])` |
| artículo | `rutaOg(lang, 'articulo', [slug])` |
| `ListadoEventos` | `rutaOg(lang, 'pagina', ['eventos'])` |
| negocios | `rutaOg(lang, 'pagina', ['negocios'])` |
| privacidad | `rutaOg(lang, 'pagina', ['privacidad'])` |

- [ ] **Step 4: Verify**

Run: `npm run test:unit`, `npm run typecheck`, `npm run lint` y `npm run build`. Con el seed y `next start`: `curl -sI localhost:3100/guia-assets/og/es/lugar/cocina-marea-alta | grep -i content-type`.
Expected: PASS y `content-type: image/png`.

- [ ] **Step 5: Commit**

```bash
git add src/sitio 'src/app/(sitio)' tests/unit/og.test.ts tests/unit/metadatos.test.ts
git commit -m "feat: imágenes Open Graph por página bajo /guia-assets/og

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Analítica

**Files:**
- Create: `src/sitio/analitica/track.ts`, `src/sitio/analitica/adaptador.ts`, `src/sitio/analitica/Analitica.tsx`
- Modify: `src/app/(sitio)/[lang]/guia/layout.tsx`
- Test: `tests/unit/track.test.ts`

**Interfaces:**
- Produces:
  - `EVENTOS` (evento → propiedades permitidas);
  - `track(evento: string, props: Record<string, string | undefined>): boolean`;
  - `propsDeElemento(evento: string, dataset: Record<string, string | undefined>): Record<string, string | undefined>`;
  - `enviarEvento(evento, props)`, el adaptador, que no hace nada;
  - `<Analitica />`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/track.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const enviarEvento = vi.fn()
vi.mock('../../src/sitio/analitica/adaptador', () => ({ enviarEvento: (...a: unknown[]) => enviarEvento(...a) }))
const { propsDeElemento, track } = await import('../../src/sitio/analitica/track')

describe('analítica (spec §13)', () => {
  beforeEach(() => enviarEvento.mockReset())

  it('solo eventos conocidos y como máximo 2 propiedades permitidas', () => {
    expect(track('tour_clic', { zona: 'la-paz', origen: 'cabecera', extra: 'x' })).toBe(true)
    expect(enviarEvento).toHaveBeenCalledWith('tour_clic', { zona: 'la-paz', origen: 'cabecera' })
    expect(track('otro', { a: '1' })).toBe(false)
    expect(enviarEvento).toHaveBeenCalledTimes(1)
  })

  it('omite propiedades vacías', () => {
    track('contacto_lugar', { lugar: 'balandra', canal: undefined })
    expect(enviarEvento).toHaveBeenCalledWith('contacto_lugar', { lugar: 'balandra' })
  })

  it('lee los data-* que pone F3b', () => {
    expect(propsDeElemento('tour_clic', { zona: 'la-paz', origen: 'zona' })).toEqual({ zona: 'la-paz', origen: 'zona' })
    expect(propsDeElemento('contacto_lugar', { lugar: 'b', canal: 'mapa' })).toEqual({ lugar: 'b', canal: 'mapa' })
    expect(propsDeElemento('boletos_clic', { eventoSlug: 'trova' })).toEqual({ evento: 'trova' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/track.test.ts`
Expected: FAIL (si la Task 8 ya creó `track.ts`, falla solo `propsDeElemento`).

- [ ] **Step 3: Write the implementation**

```ts
// src/sitio/analitica/adaptador.ts
// Spec §13: la herramienta (la misma del sitio de reservas) no está confirmada. Conectarla es cambiar solo este
// archivo; mientras tanto no se envía nada.
export function enviarEvento(_evento: string, _props: Record<string, string>): void {}
```

```ts
// src/sitio/analitica/track.ts
import { enviarEvento } from './adaptador'

// Spec §13: eventos y sus propiedades (máximo 2, lo que admite Vercel Web Analytics en Pro).
export const EVENTOS: Record<string, readonly string[]> = {
  tour_clic: ['zona', 'origen'],
  contacto_lugar: ['lugar', 'canal'],
  boletos_clic: ['evento'],
  solicitud_enviada: ['zona'],
}

export function track(evento: string, props: Record<string, string | undefined>): boolean {
  const permitidas = EVENTOS[evento]
  if (!permitidas) return false
  const limpio: Record<string, string> = {}
  for (const k of permitidas.slice(0, 2)) {
    const v = props[k]
    if (v) limpio[k] = v.slice(0, 100)
  }
  enviarEvento(evento, limpio)
  return true
}

// Los data-* que pone F3b en los links (data-zona, data-origen, data-lugar, data-canal, data-evento-slug).
export function propsDeElemento(evento: string, d: Record<string, string | undefined>): Record<string, string | undefined> {
  if (evento === 'tour_clic') return { zona: d.zona, origen: d.origen }
  if (evento === 'contacto_lugar') return { lugar: d.lugar, canal: d.canal }
  if (evento === 'boletos_clic') return { evento: d.eventoSlug }
  return {}
}
```

```tsx
// src/sitio/analitica/Analitica.tsx
'use client'

import { useEffect } from 'react'

import { propsDeElemento, track } from './track'

// Un solo listener delegado: todo link con data-evento manda su evento al hacer clic.
export function Analitica() {
  useEffect(() => {
    const alClic = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-evento]')
      const evento = el?.dataset.evento
      if (el && evento) track(evento, propsDeElemento(evento, { ...el.dataset }))
    }
    document.addEventListener('click', alClic, { capture: true })
    return () => document.removeEventListener('click', alClic, { capture: true })
  }, [])
  return null
}
```

En `src/app/(sitio)/[lang]/guia/layout.tsx`, monta `<Analitica />` junto a `<Efectos />`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/track.test.ts`, `npm run typecheck` y `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sitio/analitica 'src/app/(sitio)' tests/unit/track.test.ts
git commit -m "feat: eventos de analítica con un adaptador que espera la herramienta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Verificación completa de F3c

**Files:**
- Ninguno nuevo: solo verificación, y corrección si algo falla.

- [ ] **Step 1: Suite como en el CI**

```bash
docker compose up -d
npm run generate:types && npm run generate:importmap
git status --short src/payload-types.ts "src/app/(payload)/admin/importMap.js"
npm run typecheck && npm run lint && npm run test:unit && npm run test:int
npx payload migrate:create comprobacion --skip-empty
test -z "$(git status --porcelain -- src/migrations)" && echo "esquema al día"
grep -n 'inicial\|busqueda' src/migrations/index.ts
```

Expected: todo pasa; `esquema al día`; en `index.ts`, `inicial` va antes que `busqueda`.

- [ ] **Step 2: Build y comprobaciones con el seed**

```bash
SEED_PERMITIDO=true SEED_CONTRASENA_ADMIN='contrasena-local-larga' npm run seed
GUIA_INDEXABLE=true npm run build
GUIA_INDEXABLE=true GUIA_PROXY_SECRET=secreto-local CRON_SECRET=cron-local npx next start -p 3100
```

En otra terminal:

```bash
B=http://localhost:3100
H='x-guia-proxy: secreto-local'
curl -s -H "$H" "$B/es/guia/buscar?q=cafe" | grep -o 'Café Duna' | head -1
curl -s -H "$H" "$B/es/guia/buscar?q=cafe" | grep -o '<meta name="robots" content="noindex[^"]*"'
curl -s -H "$H" "$B/es/guia/buscar?q=%3Cscript%3E" | grep -c '<script>alert' 
curl -s -H "$H" "$B/es/guia/buscar/sugerencias?q=ca" | head -c 200; echo
curl -s -H "$H" "$B/en/guide/search/sugerencias?q=a)%20%26%20!" -o /dev/null -w '%{http_code}\n'
curl -s -H "$H" $B/es/guia/privacidad | grep -o 'Aviso de privacidad de prueba'
curl -s -H "$H" $B/es/guia/aparece-en-la-guia | grep -o 'Muy pronto'
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' $B/guia-sitemap.xml
curl -s $B/guia-sitemap.xml | grep -c '<url>'
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' $B/guia-assets/og/es/zona/la-paz
curl -s -o /dev/null -w '%{http_code}\n' $B/api/cron/hora
curl -s -H 'Authorization: Bearer cron-local' $B/api/cron/hora
```

Expected, en orden:

1. `Café Duna`.
2. Una etiqueta `<meta name="robots" content="noindex…">`.
3. `0`: el término se escapa.
4. Un JSON con sugerencias.
5. `200`: la entrada hostil no rompe nada.
6. `Aviso de privacidad de prueba`.
7. `Muy pronto`: el seed deja `formularioActivo` apagado.
8. `200 application/xml…`.
9. Un número mayor que 0.
10. `200 image/png`.
11. `401`.
12. Un JSON con `revalidadas` e `ipBorrados`.

Detén el servidor. Con `GUIA_INDEXABLE` sin poner, reconstruye y comprueba que `/guia-sitemap.xml` da `404`.

Para probar el formulario a mano:

1. Enciende `formularioActivo` en el admin. Para que la página lo note, guarda el Global desde el admin del servidor en marcha (revalida `ajustes`).
2. Envía el formulario con las llaves de prueba de Turnstile de `.env.example`.
3. Comprueba que aparece «¡Recibimos tu solicitud!» y que la Solicitud está en el admin con su `versionAviso`.

- [ ] **Step 3: Commit (solo si hubo correcciones)**

```bash
git add -A src tests scripts docs
git commit -m "fix: ajustes de la verificación de búsqueda, formulario y crones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<!-- plan-review: APPROVED (2026-11-04) -->
