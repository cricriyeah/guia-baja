# Guía «Lugares y eventos en la Baja» — Diseño

Fecha: 2026-10-30 · Dueño del producto: crisyeah · Estado: borrador para revisión

## 1. Qué es y para qué

Una sección de contenido dentro de `salysoltours.com` con fichas de lugares (restaurantes, cafés, playas,
actividades, tiendas locales…), eventos y artículos editoriales sobre Baja California Sur. El contenido lo
escribe y publica el equipo; los negocios pueden pedir salir en la guía y, si se acuerda un patrocinio, su
ficha se marca como patrocinada.

Objetivos, en este orden:

1. **Tráfico orgánico** en Google y Bing para búsquedas locales («qué hacer en La Paz», «restaurantes en La
   Ventana», «eventos en La Paz este mes»), y **citas en asistentes de IA** para las mismas preguntas.
2. **Llevar ese tráfico a reservar**: cada zona con sede de tours muestra los tours de esa sede.
3. **Captar negocios** interesados en aparecer, para un ingreso futuro por patrocinios.

La guía vive en **este repo aparte** (`sunbaja-guia`) para que quienes la construyen no tengan acceso al
código del sitio de reservas. Las dos apps solo se juntan en la URL (rewrite) y en dos contratos de lectura
(sección 8).

## 2. Alcance

**Dentro de v1**

- Colecciones Zonas, Categorías, Lugares, Eventos, Artículos, Solicitudes, Media y Usuarios en Payload.
- Sitio público en español e inglés con las páginas de la sección 6.
- Formulario «Aparece en la guía» que crea Solicitudes y avisa por correo.
- Patrocinio manual con fechas de vigencia y etiqueta visible.
- SEO técnico completo (metadatos, `hreflang`, JSON-LD, sitemap propio).
- «Tours en esta zona» leyendo la API pública del catálogo.
- Endpoint público `v1` que el sitio de reservas usa para mostrar «Qué hacer en {sede}».
- Barreras de repo, CI y pruebas de la sección 10.

**Fuera de v1 (a propósito; el modelo no lo impide)**

- Que el público publique o se registre.
- Cobro en línea de patrocinios.
- Eventos recurrentes automáticos (cada edición es su propio evento).
- Comentarios, reseñas o calificaciones.
- Búsqueda de texto libre.
- Monitoreo externo (Sentry o similar). Se usan los logs de Vercel.

## 3. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Cobertura | Zonas como datos del backoffice. Se arranca con los destinos de los tours (La Paz, La Ventana, Puerto Chale); cualquier otra zona se agrega sin código. |
| Contenido | Fichas de Lugar y de Evento, más Artículos que las citan. |
| Idiomas | Español e inglés desde el inicio. |
| Negocios | Formulario y trato manual; el cobro se acuerda fuera del sistema. |
| Roles | Admin y Editor. |
| Conexión con el sitio | En los dos sentidos (guía → catálogo y sitio → guía), ambos de solo lectura. |
| Stack | Next.js 16 + Payload 3 en una sola app, Postgres en Neon, imágenes en Cloudflare R2. |
| Hosting | Vercel Pro; el único miembro del equipo es el dueño. |
| Montaje | Rewrite de rutas desde el sitio actual (no subdominio, no microfrontends de Vercel). |
| URLs | `/es/guia/...` y `/en/guide/...`. |
| Diseño visual | Lo define el equipo del dueño antes de construir el sitio público (fase F1); los programadores implementan contra `docs/diseno/`. |

## 4. Arquitectura

```
Navegador → salysoltours.com
   ├─ /es/guia/*, /en/guide/*, /guia-assets/*, /guia-sitemap.xml
   │        ──rewrite──►  app Guía (este repo, proyecto Vercel «sunbaja-guia»)
   │                          ├─ Next 16 + Payload 3: sitio público + /admin
   │                          ├─ Neon Postgres (producción + branches de preview)
   │                          └─ R2: bucket «guia-media» con dominio propio
   └─ todo lo demás  ──►  sitio de reservas (otro repo; no se toca desde aquí)
                              └─ Django: API pública del catálogo (la Guía solo la lee)
```

- **Una sola app Next.js.** El sitio público vive en `src/app/(sitio)/[lang]/...` y Payload en
  `src/app/(payload)/...` (admin y API de Payload).
- **El admin no se publica bajo `salysoltours.com`.** El rewrite solo cubre las rutas públicas de la lista de
  arriba; el backoffice se usa en el dominio de Vercel del proyecto (`<proyecto>.vercel.app/admin`).
- **`assetPrefix: '/guia-assets'`** en `next.config`, para que los archivos `/_next/...` de la guía no choquen
  con los del sitio de reservas. Los archivos de `public/` de la guía van dentro de `public/guia-assets/`, por
  la misma razón.
- **Imágenes sin el optimizador de Next.** `/_next/image` no lleva el `assetPrefix` y llegaría al sitio de
  reservas. Payload genera los tamaños al subir (sharp) y las páginas los usan con `srcset` y
  `unoptimized`, sirviéndolos directo del dominio del bucket R2.
- **Server Actions detrás del rewrite.** El formulario público usa una Server Action; la página llega por
  `salysoltours.com`, así que `experimental.serverActions.allowedOrigins` incluye `salysoltours.com` y
  `www.salysoltours.com`.
- **El dominio de Vercel no se indexa.** Cuando la petición no llega con el host `salysoltours.com` /
  `www.salysoltours.com`, la respuesta lleva `X-Robots-Tag: noindex`. Las canónicas apuntan siempre a
  `https://www.salysoltours.com`.
- **Independencia de caídas.** Si la Guía cae, solo fallan sus rutas; el sitio de reservas y su checkout no
  dependen de ella. Si el catálogo cae, la Guía oculta los bloques de tours.

### Versiones fijas

- Payload **≥ 3.73** y Next.js **≥ 16.2** (desde ahí Payload soporta Next 16). No usar Cache Components /
  PPR de Next 16: Payload todavía no los soporta. La caché es `fetch`/`unstable_cache` con etiquetas y
  `revalidateTag`.
- Editor de texto enriquecido: Lexical (el de Payload por defecto).
- Base: adaptador Postgres oficial de Payload. Imágenes: adaptador de almacenamiento S3 oficial apuntando a R2.
- Node.js 24 LTS.

## 5. Infraestructura y secretos

- **Vercel Pro**, proyecto `sunbaja-guia`, conectado a este repo. Producción se despliega solo desde `main`.
- **Previews de PR:** en un repo privado, los commits de personas que no son miembros del equipo de Vercel no
  despliegan solos; Vercel deja un comentario para pedir autorización y el dueño la da cuando quiera ver un
  preview. Por eso el CI no depende de previews (sección 10).
- **Neon** por la integración del Marketplace de Vercel: una base de producción y un branch por cada preview
  autorizado. El plan gratis permite 10 branches por proyecto, 0.5 GB y 100 CU-horas al mes por proyecto
  (verificado en neon.com el 2026-10-30): activar en la integración el borrado de branches de previews
  eliminados, y no dejar previews viejos.
- **R2**: bucket `guia-media`, separado del bucket de videos del sitio de reservas, con dominio público propio
  para servir las imágenes.
- **Correo**: proveedor transaccional (Resend) con una llave propia de esta app.
- **Turnstile**: widget con `salysoltours.com` en su lista de dominios.

Variables de entorno (ninguna es del sitio de reservas; no hay Stripe):

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Neon (la pone la integración). |
| `PAYLOAD_SECRET` | Firma de sesiones de Payload. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Imágenes. |
| `CATALOGO_API_URL` | Base de la API pública del catálogo (`https://pescadeportiva-api.onrender.com`). |
| `SITIO_URL` | `https://www.salysoltours.com` (canónicas, links a tours). |
| `RESEND_API_KEY`, `CORREO_REMITENTE` | Avisos de Solicitudes. |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Formulario público. |
| `GUIA_INDEXABLE` | `false` hasta el lanzamiento (sección 12). |
| `CRON_SECRET` | Protege las rutas que llama Vercel Cron. |

**Desarrollo local:** Postgres en Docker, MinIO (o almacenamiento local de Payload) en lugar de R2, llaves
de prueba de Turnstile, y `npm run seed` con datos inventados. Gestor de paquetes: npm. Nunca datos reales en local.

## 6. Modelo de datos (Payload)

`(es/en)` = campo localizado. Todas las colecciones de contenido (Lugares, Eventos, Artículos) tienen
borradores, versiones y publicación programada.

### Zonas
- `nombre` (es/en), `slug` (uno solo; son nombres propios: `la-paz`), `descripcion` (es/en), `foto`,
  `coordenadas`, `orden`, `activa`.
- `sedeSlug` (opcional): slug de la sede del sitio de reservas (`la-paz`, `la-ventana`, `puerto-chale`). Si
  existe, la zona muestra «Tours en esta zona» y es la llave del contrato de la sección 8.2.
- El `slug` no puede ser una palabra reservada: `lugares`, `places`, `eventos`, `events`, `articulos`,
  `articles`, `categoria`, `category`, `aparece-en-la-guia`, `get-listed`.
- Una zona con `activa = false` no tiene página ni aparece en listados.

### Categorías
- `nombre` (es/en), `slug` (es/en: `restaurantes` / `restaurants`), `aplicaA` (lugar, evento o ambos),
  `tipoSchema` (tipo de schema.org para los lugares de la categoría: `Restaurant`, `CafeOrCoffeeShop`,
  `BarOrPub`, `Store`, `TouristAttraction`, `Beach`, `LocalBusiness`…), `orden`.
- Carga inicial: restaurantes, cafés y bares, actividades, playas, tiendas locales, mercados, cultura.

### Lugares
- `nombre` (sin localizar; nombre propio), `slug` (es/en), `zona`, `categorias` (1 o más; la primera es la
  principal y decide el `tipoSchema`), `resumen` (es/en, máx. 160 caracteres), `cuerpo` (es/en), `fotos`
  (1 o más).
- `direccion`, `coordenadas`, `telefono`, `whatsapp`, `web`, `instagram`, `rangoPrecio` ($ a $$$$).
- `horario`: lista de `{ dia, abre, cierra }` + `notaHorario` (es/en).
- `orden` (número, por defecto 100) para el orden editorial.
- Grupo `patrocinio`: `activo`, `desde`, `hasta`, `notaInterna`. Un patrocinio está **vigente** si
  `activo` y `desde ≤ ahora < hasta`.

### Eventos
- `nombre` (es/en), `slug` (es/en), `zona`, `lugar` (relación opcional a Lugares) **o** `direccionLibre`,
  `categorias`, `inicio`, `fin` (opcional), `precio` (texto es/en) o `gratis`, `urlBoletos`, `fotos`,
  `resumen` (es/en), `cuerpo` (es/en), grupo `patrocinio` (igual que Lugares).
- Las fechas se capturan y muestran en `America/Mazatlan` (hora de BCS).
- **Próximo** si `(fin ?? inicio) ≥ ahora`. **Pasado** en otro caso: sale de los listados, su página sigue
  publicada con la marca «Ya pasó» y sigue en el sitemap.

### Artículos
- `titulo` (es/en), `slug` (es/en), `zonas` (opcional, varias), `resumen` (es/en), `portada`, `autor`
  (usuario; se muestra su nombre público), `publicadoEl`, `actualizadoEl` (visible en la página).
- `cuerpo` (es/en) con bloques insertables:
  - **Tarjeta de lugar** (relación a Lugares).
  - **Tarjeta de evento** (relación a Eventos).
  - **Tours en esta zona** (relación a Zona; usa el contrato 8.1).
  - **Preguntas frecuentes** (lista de pregunta/respuesta es/en; genera `FAQPage`).

### Solicitudes
- `negocio`, `giro`, `zona` (texto libre o relación), `contactoNombre`, `correo`, `telefono`,
  `webOInstagram`, `mensaje`, `aceptoPrivacidad`, `ipHash` (SHA-256 con sal, para el límite de envíos),
  `estado` (nueva, en contacto, aceptada, rechazada), `notasInternas`, `lugarCreado` (relación).
- Solo se crean desde el formulario público. El público nunca las lee.

### Media
- Imagen subida a R2 con `alt` (es/en, obligatorio), `credito` y tamaños generados: 480, 960, 1600 px de
  ancho en WebP, más uno de 1200×630 para compartir.

### Usuarios
- `nombrePublico`, `correo`, `rol` (`admin` o `editor`).

### Global «Ajustes de la guía»
- `correosAviso` (lista de correos que reciben las Solicitudes), textos de portada (es/en).

### Reglas comunes
- **SEO por documento:** `metaTitulo` y `metaDescripcion` (es/en) opcionales (si faltan se usan nombre/título
  y resumen) y `noIndexar`.
- **Slugs:** se generan del nombre o título, en minúsculas ASCII con guiones, editables, únicos por colección
  e idioma.
- **Regla de idioma:** un documento existe en un idioma solo si tiene en ese idioma su `resumen` y su
  `cuerpo` (y su `nombre`/`titulo` cuando es localizado). Si no, esa URL da 404, no entra al sitemap y no
  aparece en el `hreflang` del otro idioma. Nunca se muestra una página a medias.

## 7. Páginas y URLs

| Página | Español | Inglés |
|---|---|---|
| Portada | `/es/guia` | `/en/guide` |
| Zona | `/es/guia/{zona}` | `/en/guide/{zona}` |
| Categoría en zona | `/es/guia/{zona}/{categoria}` | `/en/guide/{zona}/{category}` |
| Categoría en todas las zonas | `/es/guia/categoria/{categoria}` | `/en/guide/category/{category}` |
| Lugar | `/es/guia/lugares/{slug}` | `/en/guide/places/{slug}` |
| Eventos | `/es/guia/eventos` | `/en/guide/events` |
| Evento | `/es/guia/eventos/{slug}` | `/en/guide/events/{slug}` |
| Artículo | `/es/guia/articulos/{slug}` | `/en/guide/articles/{slug}` |
| Negocios | `/es/guia/aparece-en-la-guia` | `/en/guide/get-listed` |
| Sitemap | `/guia-sitemap.xml` (ambos idiomas) | |

Qué muestra cada una:

- **Portada:** próximos eventos, artículos recientes, zonas activas y categorías.
- **Zona:** introducción, artículos de la zona, lugares por categoría, próximos eventos y, si la zona tiene
  `sedeSlug`, «Tours en esta zona».
- **Categoría en zona:** listado de lugares. Es la página que compite por «{categoría} en {zona}».
- **Categoría en todas las zonas:** lugares de esa categoría agrupados por zona.
- **Lugar:** ficha completa con mapa, horario, contacto y, si aplica, «Tours en esta zona».
- **Eventos:** próximos eventos por fecha, con filtro por zona.
- **Evento:** detalle; si ya pasó, la marca «Ya pasó» arriba.
- **Artículo:** cuerpo con sus bloques.
- **Negocios:** explicación breve y formulario.

### Zonas y categorías: páginas reales que se usan como filtros

- Cada combinación zona × categoría es una página real (URL, título, descripción, introducción, sitemap).
- Arriba de los listados hay píldoras de zona y de categoría; **cada píldora es un link** a la página de esa
  combinación, no un filtro de JavaScript.
- Una píldora aparece solo si su combinación tiene **al menos 1** lugar publicado.
- Una combinación con **menos de 3** lugares tiene página, pero lleva `noindex` y no entra al sitemap.
- Filtros secundarios (`?precio=`, `?abierto=`, fechas en eventos) son parámetros de consulta. Esas variantes
  llevan canónica a la página sin parámetros y no se indexan.
- Paginación con URL real (`?pagina=2`), sin scroll infinito.

### Orden de los listados

1. Hasta **2** lugares con patrocinio vigente, con la etiqueta «Patrocinado» / «Sponsored».
2. El resto por `orden` ascendente y luego por `nombre`.

En artículos el patrocinio no cambia el texto; solo se muestra la etiqueta junto a la tarjeta del lugar.
Todo link externo de un lugar o evento patrocinado lleva `rel="sponsored"`.

### Navegación

- Cabecera y pie replican los del sitio de reservas (logo, menú, idioma), según `docs/diseno/`.
- Migas de pan visibles (Guía › La Paz › Restaurantes) con `BreadcrumbList`.
- El cambio de idioma lleva al mismo documento en el otro idioma; si no existe, a la portada de la guía en
  ese idioma.

## 8. Contratos con el sitio de reservas

Los dos contratos son de **solo lectura**. La Guía nunca escribe en el sistema de reservas.

### 8.1 Guía → catálogo

- `GET {CATALOGO_API_URL}/api/sedes/{sedeSlug}/servicios/` y `GET .../paquetes/` (ya existen, públicos).
- Las tarjetas enlazan a `{SITIO_URL}/{lang}/servicio/{empresa}/{servicio}` y
  `{SITIO_URL}/{lang}/sede/{sedeSlug}/paquete/{paquete}`.
- Caché de 1 hora por etiqueta. Límite de espera de 3 s. Si falla o tarda, el bloque no se muestra y la
  página carga normal.
- Los campos que se usan del catálogo se validan con un esquema; si la forma cambia, el bloque se oculta y
  se registra un error en logs.

### 8.2 Sitio de reservas → Guía

`GET /api/publico/v1/zonas/{sedeSlug}/resumen?lang=es|en` (en el dominio de Vercel de la Guía; el sitio de
reservas lo llama desde su servidor).

Respuesta `200`:

```json
{
  "zona": { "nombre": "La Paz", "url": "https://www.salysoltours.com/es/guia/la-paz" },
  "articulos": [
    { "titulo": "…", "resumen": "…", "imagen": "https://…", "url": "https://www.salysoltours.com/es/guia/articulos/…" }
  ],
  "eventos": [
    { "nombre": "…", "inicio": "2026-11-14T18:00:00-07:00", "fin": null, "imagen": "https://…", "url": "https://www.salysoltours.com/es/guia/eventos/…" }
  ]
}
```

- Hasta 3 artículos (los más recientes de la zona) y hasta 3 eventos próximos (los más cercanos).
- Solo documentos publicados y que existan en el idioma pedido.
- `404` si no hay zona activa con ese `sedeSlug`.
- Cabecera `Cache-Control: public, s-maxage=600, stale-while-revalidate=3600`.
- **Contrato congelado:** la forma de `v1` no cambia. Un cambio incompatible se publica como `v2` y `v1`
  sigue respondiendo hasta que el sitio de reservas migre. El CI valida la forma exacta (sección 10).

## 9. SEO y GEO

- Todo se genera en el servidor; ningún contenido depende de JavaScript para mostrarse.
- Metadatos por página: título, descripción, canónica absoluta a `https://www.salysoltours.com/...` y
  `hreflang` (`es-MX`, `en-US`, `x-default` → español), con la misma convención que el sitio de reservas.
- `GUIA_INDEXABLE=false` añade `noindex` a todas las páginas (pre-lanzamiento).
- JSON-LD:
  - Lugar: el `tipoSchema` de su categoría principal, con `address`, `geo`, `openingHoursSpecification`,
    `telephone`, `priceRange`, `image`, `url`.
  - Evento: `Event` con `startDate`, `endDate`, `location`, `offers` (o gratis), `eventStatus`, `image`.
  - Artículo: `Article` con `author`, `datePublished`, `dateModified`, `image`; más `FAQPage` si tiene el
    bloque de preguntas.
  - Listados: `ItemList`. Todas las páginas: `BreadcrumbList`.
- Imagen Open Graph generada por página con la marca (`next/og`).
- Para asistentes de IA: datos duros arriba y en texto (dirección, horario, precio, fechas), «Actualizado el»
  y autor visibles, respuestas directas al inicio de los artículos.
- `/guia-sitemap.xml` con todas las URLs indexables de los dos idiomas y sus alternos. El `robots.txt` del
  sitio de reservas lo enlaza (lo cambia el dueño en su repo).
- Metas en móvil: LCP < 2.5 s, INP < 200 ms, CLS < 0.1.

## 10. Calidad, barreras y pruebas

### Barreras del repo

- `main` protegida: solo por PR, con aprobación del dueño y CI verde; sin force push.
- `CODEOWNERS`: el dueño en todo el repo, con mención explícita de `payload.config.ts`,
  `src/collections/**`, `src/migrations/**`, `src/app/api/publico/**`, `.github/**`, `AGENTS.md`,
  `CLAUDE.md` y `docs/**`.
- `AGENTS.md` (y `CLAUDE.md` que lo importa) con: alcance del repo, versiones fijas, comandos, la regla de
  no tocar el contrato `v1` ni migraciones ya aplicadas, que toda dependencia nueva se justifica en el PR, y
  que el diseño de referencia es `docs/diseno/`.
- Migraciones con `payload migrate:create`, commiteadas. En producción nunca se usa el modo `push`; el build
  de Vercel corre `payload migrate` antes de `next build`.
- El CI corre con permisos de solo lectura y sin secretos de producción.

### Seguridad de Payload

- Acceso **negado por defecto** en todas las colecciones. Público: solo leer documentos publicados de Zonas,
  Categorías, Lugares, Eventos, Artículos y Media. Solicitudes: el público solo puede crear, y únicamente a
  través de la Server Action (no por la API REST de Payload). Usuarios: nunca público.
- Editor: todo el contenido y las Solicitudes; no administra Usuarios ni el Global. Admin: todo.
- GraphQL de Payload apagado.
- Login del admin con bloqueo tras 5 intentos fallidos durante 10 minutos.

### Formulario de negocios

- Validación de campos en el servidor, Turnstile verificado en el servidor, casilla de aceptación del aviso
  de privacidad (link al aviso del sitio), y máximo 5 envíos por `ipHash` por hora.
- Si el correo de aviso falla, la Solicitud queda guardada igual y el error va a los logs.

### Tareas programadas (Vercel Cron, protegidas con `CRON_SECRET`)

- Cada hora: correr la cola de trabajos de Payload (publicación programada) y revalidar las etiquetas de
  listados de eventos y de patrocinios, para que los eventos pasados y los patrocinios vencidos se reflejen
  sin que nadie edite nada.

### CI (GitHub Actions, en cada PR y en `main`)

1. Tipos, lint y build.
2. Unitarias (Vitest): slugs reservados y formato de slugs, regla de idioma, patrocinio vigente/vencido,
   evento próximo/pasado, umbral de 1 y 3 lugares, orden de listados.
3. Integración contra Postgres (servicio de GitHub Actions) usando la API local de Payload: permisos (el
   público no ve borradores ni Solicitudes; un Editor no administra Usuarios), y la forma exacta de
   `/api/publico/v1/...` validada con un esquema congelado en el repo.
4. E2E (Playwright) contra un build de producción local con datos de prueba: portada, zona, categoría, ficha,
   evento pasado, artículo, formulario (llave de prueba de Turnstile), 404 por idioma faltante, `noindex`
   con `GUIA_INDEXABLE=false` y en host distinto de `salysoltours.com`.
5. Lighthouse CI contra ese mismo build, con las metas de la sección 9.

### Errores

- `error.tsx` y `not-found.tsx` por idioma.
- Fallas de los contratos: el bloque se oculta, la página carga, y se registra el error.

## 11. Fases

| Fase | Quién | Qué | Depende de |
|---|---|---|---|
| F0 Preparación | Dueño | Repo privado en GitHub, Vercel Pro, proyecto Vercel, integración Neon, bucket R2 con dominio, Turnstile con el dominio, llave de correo. | — |
| F1 Diseño | Dueño (con su equipo de diseño) | Pantallas clave en móvil y escritorio: portada, zona/categoría, ficha, evento, artículo, formulario. Paleta, tipografías y formas de la marca. Se entregan en `docs/diseno/`. | — |
| F2 Base | Programadores | App Next + Payload, colecciones, permisos, migraciones, Global, seed, CI pasos 1–3. | F0 |
| F3 Sitio público | Programadores | Páginas, SEO, JSON-LD, sitemap, formulario, cron, CI pasos 4–5. | F1 aprobada, F2 |
| F4 Contratos | Programadores | `/api/publico/v1` y «Tours en esta zona». | F2 |
| F5 Integración | Dueño (en el repo del sitio de reservas) | Rewrite, exclusión en `proxy.ts`, prueba del contrato, bloque «Qué hacer en {sede}». Menú y robots esperan a F6. | F4 en producción |
| F6 Contenido y lanzamiento | Equipo de contenido | Carga del contenido mínimo; luego `GUIA_INDEXABLE=true`, link en el menú y sitemap en robots. | F3, F5 |

F1 y F2 corren en paralelo.

## 12. Lanzamiento

- Hasta F6 la guía corre con `GUIA_INDEXABLE=false` y sin link en el menú del sitio; el rewrite puede estar
  en producción para probar sin que los buscadores vean una guía vacía.
- **Contenido mínimo para lanzar:** zona La Paz con unos 15 lugares en al menos 3 categorías, 4–5
  artículos y los eventos próximos, todo en español e inglés. Las otras zonas se activan cuando tengan su
  propio mínimo.
- Después: alta en Google Search Console y Bing Webmaster Tools, revisión mensual de tráfico y Solicitudes.

## 13. Lo que cambia en el sitio de reservas (referencia; se hace en su repo, no aquí)

1. `rewrites` (`beforeFiles`) de `/es/guia/:path*`, `/en/guide/:path*`, `/guia-assets/:path*` y
   `/guia-sitemap.xml` hacia la URL de producción de la Guía (variable de entorno del sitio).
2. Excluir esas rutas del `matcher` de `proxy.ts` y de las cabeceras de seguridad propias del sitio (su CSP
   no debe sumarse a las respuestas de la Guía).
3. Prueba con una respuesta de ejemplo del contrato `v1`.
4. Bloque «Qué hacer en {sede}» en la página de cada sede (límite de espera 2 s, caché 10 min; si falla, no
   aparece).
5. En F6: «Guía» en menú y pie; `/guia-sitemap.xml` en `robots.txt`.

## 14. Riesgos

- **Contenido flaco o genérico.** Google castiga el contenido de bajo valor hecho en volumen. Mitigación:
  mínimo de lanzamiento, fotos propias, datos verificados, umbral de 3 lugares para indexar.
- **Patrocinios sin declarar.** Mitigación: etiqueta visible y `rel="sponsored"` forzados por el código, no
  por el editor.
- **Límites del plan gratis de Neon** (10 branches, 0.5 GB). Mitigación: borrado automático de branches de
  previews, imágenes fuera de la base.
- **Choques de rutas con el sitio de reservas** (`/_next`, CSP, `proxy.ts`). Mitigación: `assetPrefix`,
  imágenes sin optimizador de Next, exclusiones de la sección 13 y E2E de esas rutas después de F5.
