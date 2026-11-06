# Guía «Lugares y eventos en la Baja» — Diseño

Fecha: 2026-10-30 (revisado 2026-10-31) · Dueño del producto: crisyeah · Estado: borrador para revisión

## 1. Qué es y para qué

Una sección de contenido dentro de `salysoltours.com` con fichas de lugares (restaurantes, cafés, playas,
actividades, tiendas locales…), eventos y artículos editoriales sobre Baja California Sur. El contenido lo
escribe y publica el equipo; los negocios pueden pedir salir en la guía y, si se acuerda un patrocinio, su
ficha se marca como patrocinada.

Objetivos, en este orden (cómo se miden: sección 13):

1. **Tráfico orgánico** en Google y Bing para búsquedas locales («qué hacer en La Paz», «restaurantes en La
   Ventana», «eventos en La Paz este mes»), y **citas en asistentes de IA** para las mismas preguntas.
2. **Llevar ese tráfico a reservar**: cada zona con sede de tours muestra los tours de esa sede.
3. **Captar negocios** interesados en aparecer, para un ingreso futuro por patrocinios.

La guía vive en **este repo aparte** (`sunbaja-guia`) para que quienes la construyen no tengan acceso al
código del sitio de reservas. Las dos apps solo se juntan en la URL (rewrite con cabeceras, sección 4.1) y
en dos contratos de lectura (sección 8).

## 2. Alcance

**Dentro de v1**

- Colecciones Zonas, Categorías, Lugares, Eventos, Artículos, Solicitudes, Redirecciones, Media y Usuarios
  en Payload.
- Sitio público en español e inglés con las páginas de la sección 7.
- Formulario «Aparece en la guía» que crea Solicitudes y avisa por correo.
- Búsqueda de texto libre por idioma, con página de resultados (sección 7, «Búsqueda»). Entró a v1 el
  2026-11-03, al aprobar el diseño de F1.
- Patrocinio manual con fechas de vigencia y etiqueta visible.
- SEO técnico completo (metadatos, `hreflang`, JSON-LD, sitemap propio, redirecciones automáticas).
- «Tours en esta zona» leyendo la API pública del catálogo.
- Endpoint público `v1` que el sitio de reservas usa para mostrar «Qué hacer en {sede}».
- Aviso de privacidad de la Guía, conservación y borrado de datos de Solicitudes (sección 12).
- Medición de los tres objetivos (sección 13).
- Respaldos de la base y de las imágenes (sección 5.4).
- Barreras de repo, CI y pruebas de la sección 11.

**Fuera de v1 (a propósito; el modelo no lo impide)**

- Que el público publique o se registre.
- Cobro en línea de patrocinios.
- Eventos recurrentes automáticos (cada edición es su propio evento).
- Comentarios, reseñas o calificaciones.
- Monitoreo externo (Sentry o similar). Se usan los logs de Vercel.
- Doble factor en el admin (Payload no lo trae; se compensa con la sección 11, «Seguridad de Payload»).

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
| Hosting | Vercel Pro; el único miembro del equipo es el dueño. Región de funciones `iad1`, Neon en `aws-us-east-1` (misma región). |
| Montaje | Rewrite desde el `proxy.ts` del sitio de reservas, que agrega cabeceras firmadas con el host y la IP del visitante (sección 4.1). No subdominio, no microfrontends de Vercel. |
| URLs | `/es/guia/...` y `/en/guide/...`. |
| Imágenes | Bucket R2 con dominio propio en una zona de Cloudflare de la misma cuenta (sección 5.2). Nunca `r2.dev` en producción. |
| Subidas | Directas del navegador a R2 (`clientUploads`), para no chocar con el límite de 4.5 MB por petición de Vercel. |
| Previews | Base y bucket propios sin datos reales; nunca una copia de producción (sección 5.3). |
| Repo | GitHub con plan que permita proteger ramas en repos privados (GitHub Pro o Team). |
| Analítica | La misma herramienta y propiedad que el sitio de reservas (sección 13). |
| Diseño visual | Lo define el equipo del dueño antes de construir el sitio público (fase F1); los programadores implementan contra `docs/diseno/`. |

## 4. Arquitectura

```
Navegador → www.salysoltours.com
   ├─ /es/guia/*, /en/guide/*, /guia-assets/*, /guia-sitemap.xml
   │        ──proxy.ts del sitio: rewrite + cabeceras x-guia-*──►  app Guía (este repo, proyecto Vercel «sunbaja-guia»)
   │                          ├─ Next 16 + Payload 3: sitio público + /admin
   │                          ├─ Neon Postgres (producción; previews en una base aparte)
   │                          └─ R2: bucket «guia-media» con dominio propio
   └─ todo lo demás  ──►  sitio de reservas (otro repo; no se toca desde aquí)
                              └─ Django: API pública del catálogo (la Guía solo la lee)
```

- **Una sola app Next.js.** El sitio público vive en `src/app/(sitio)/[lang]/guia/...` y Payload en
  `src/app/(payload)/...` (admin y API de Payload).
- **Rutas localizadas.** El árbol de rutas usa los segmentos en español (`guia`, `lugares`, `eventos`,
  `articulos`, `categoria`, `aparece-en-la-guia`, `privacidad`). El `proxy.ts` de la Guía (sección 4.1)
  reescribe las rutas en inglés al árbol (`/en/guide/places/:slug` → `/en/guia/lugares/:slug`, etc.) y
  responde 404 a toda combinación cruzada (`/en/guia/...`, `/es/guide/...`, `/es/guia/places/...`), antes de
  llegar a las páginas.
- **El admin no se publica bajo `salysoltours.com`.** El rewrite solo cubre las rutas públicas de la lista de
  arriba; el backoffice se usa en el alias de producción del proyecto (`sunbaja-guia.vercel.app/admin`).
- **`assetPrefix: '/guia-assets'`** en `next.config`, para que los archivos `/_next/...` de la guía no choquen
  con los del sitio de reservas. Los archivos de `public/` de la guía van dentro de `public/guia-assets/`, por
  la misma razón.
- **Links entre las dos apps con `<a>`, no con `<Link>`.** Todo link de la Guía al sitio de reservas (menú,
  tarjetas de tours, pie) y del sitio a la Guía es un `<a>` normal, porque son apps distintas.
- **Server Actions detrás del rewrite.** El formulario público usa una Server Action; la página llega por
  `salysoltours.com`, así que `experimental.serverActions.allowedOrigins` incluye `salysoltours.com` y
  `www.salysoltours.com`.
- **El dominio de Vercel no se indexa.** Ver sección 4.1. Las canónicas apuntan siempre a
  `https://www.salysoltours.com` (`metadataBase` = `SITIO_URL`).
- **Independencia de caídas.** Si la Guía cae, solo fallan sus rutas; el sitio de reservas y su checkout no
  dependen de ella. Si el catálogo cae, la Guía oculta los bloques de tours.

### 4.1 Paso por el sitio de reservas

Un rewrite de un proyecto de Vercel a otro no conserva el host ni la IP del visitante: en la Guía, `host` y
`x-forwarded-host` traen el dominio de Vercel de la Guía, y `x-forwarded-for` no trae la IP real. Por eso el
rewrite no se declara en el `next.config` del sitio de reservas: lo hace su `proxy.ts`, que sí conoce al
visitante.

- Para las rutas de páginas de la Guía (`/es/guia/*`, `/en/guide/*`, `/guia-sitemap.xml`), `proxy.ts`
  responde primero, antes de cualquier otra lógica suya, con
  `NextResponse.rewrite(new URL(ruta + query, GUIA_ORIGEN), { request: { headers } })`. No agrega su CSP ni
  sus cabeceras de seguridad a esas respuestas.
- `/guia-assets/*` no necesita cabeceras: va como rewrite normal en el `next.config` del sitio de reservas
  (no invoca `proxy.ts` por cada archivo estático, y esos archivos sí se pueden cachear).
- Las cabeceras que agrega sobrescriben cualquier valor que mande el cliente:
  - `x-guia-proxy`: el secreto compartido `GUIA_PROXY_SECRET` (misma variable en los dos proyectos).
  - `x-guia-ip`: la IP del visitante como la ve el sitio de reservas (su `x-real-ip`).
  - `x-guia-host`: el host original (`www.salysoltours.com`).
- En la Guía, la función `origenDePeticion(headers)` decide:
  - Si `x-guia-proxy` coincide con el secreto (comparación en tiempo constante), la petición es **pública**
    y su IP es `x-guia-ip`.
  - Si no, es **directa** (llegó por el dominio de Vercel) y su IP es el `x-real-ip` de la propia petición.
- **El origen solo afecta cabeceras, nunca el HTML.** Las páginas se cachean (sección 10), así que el HTML
  no puede depender de quién pidió primero. Por eso:
  - `origenDePeticion` solo se llama en el `proxy.ts` de la Guía (corre en cada petición, antes de la caché).
    **Las páginas no leen `headers()`.**
  - La Server Action del formulario (que necesita la IP) no decide el origen: `origenReenviado` lee lo que dejó el
    `proxy.ts`, y solo lo cree si trae `x-guia-sello`, un HMAC del secreto que pone ese `proxy.ts` y cuyo valor
    recibido del cliente se descarta. Hay peticiones que llegan a la acción sin pasar por él (un idioma fuera del
    matcher, o Next reenviando la acción desde otra página). Sin sello válido, la petición es **directa** y su IP
    es el `x-real-ip` de la propia petición.
  - El `proxy.ts` de la Guía pone en la respuesta `x-guia-origen: publico|directo` y, si es directa,
    `X-Robots-Tag: noindex`.
  - `<meta name="robots">` y `hreflang` dependen solo de reglas que no cambian por petición
    (`GUIA_INDEXABLE`, `noIndexar`, umbral, filtros; sección 9).
  - Las cabeceras `x-guia-proxy` y `x-guia-sello` nunca viajan en la respuesta ni se registran en logs.
- Turnstile se verifica en el servidor mandando `remoteip` = la IP de la petición según esta regla.
- **Comprobaciones en F5** (en producción, con `GUIA_INDEXABLE=false`):
  1. `curl -I https://www.salysoltours.com/es/guia` trae `x-guia-origen: publico` y no trae
     `X-Robots-Tag`.
  2. `curl -I https://sunbaja-guia.vercel.app/es/guia` trae `x-guia-origen: directo` y `X-Robots-Tag: noindex`.
  3. Un cambio publicado se ve por `www.salysoltours.com` al momento (sin caché del CDN del sitio de
     reservas, sección 10).
  - Además, la analítica (sección 13): en una página de la guía servida por www, el script de la
    herramienta carga y un evento de prueba aparece en su panel.
- **Comprobaciones de lanzamiento** (en producción, como último paso de F6, ya con `GUIA_INDEXABLE=true`, el
  aviso publicado y `formularioActivo` encendido):
  4. Visitar primero `https://sunbaja-guia.vercel.app/es/guia/la-paz` y luego
     `curl https://www.salysoltours.com/es/guia/la-paz`: el HTML no tiene `noindex` en `<meta name="robots">`
     y sí tiene sus `hreflang`; `curl -I` de la misma URL no trae `X-Robots-Tag`.
  5. Seis envíos del formulario desde una IP: el sexto se rechaza; un envío desde otra IP pasa.

  Si alguna falla, no se lanza (o se regresa `GUIA_INDEXABLE=false` hasta corregirlo).

### 4.2 Imágenes

- **Sin el optimizador de Next.** `/_next/image` no lleva el `assetPrefix` y llegaría al sitio de reservas.
  Payload genera los tamaños al subir (sharp) y las páginas los usan con `srcset` y `unoptimized`,
  sirviéndolos directo del dominio del bucket R2.
- **Subidas directas.** El adaptador S3 de Payload va con `clientUploads: true` (el navegador sube a R2 con
  una URL firmada) y el CORS del bucket permite `PUT` solo desde el origen del admin.
- **Lectura directa.** El adaptador va con `disablePayloadAccessControl: true` y la URL pública del bucket,
  para que las imágenes nunca se sirvan desde `/api/media/file/...` (ruta que el rewrite no cubre).
- **Límite por archivo:** 20 MB; formatos JPEG, PNG y WebP.
- **Verificación en F2:** subir una foto de teléfono de más de 10 MB y comprobar que se generan los cuatro
  tamaños. Si con `clientUploads` no se generan, el admin reduce la imagen en el navegador a menos de 4 MB
  antes de subirla, y se anota aquí.

### Versiones fijas

- Payload **≥ 3.73** y Next.js **≥ 16.2.6** (mínimo que exige Payload por parches de seguridad). No se usan
  Cache Components / PPR: su soporte en Payload es reciente e inicial, y la caché de esta app (sección 10)
  no los necesita. La caché es `unstable_cache` con etiquetas y `revalidateTag`.
- Editor de texto enriquecido: Lexical (el de Payload por defecto).
- Base: adaptador Postgres oficial de Payload. Imágenes: adaptador de almacenamiento S3 oficial apuntando a R2.
- Node.js 24 LTS.

## 5. Infraestructura, secretos y respaldos

### 5.1 Vercel y Neon

- **Vercel Pro**, proyecto `sunbaja-guia`, conectado a este repo. Producción se despliega solo desde `main`.
  Región de funciones `iad1`.
- **Neon** por la integración del Marketplace de Vercel, región `aws-us-east-1`. Solo la base de
  producción viene de la integración: **la creación automática de branches para previews va apagada** y
  las variables que pone la integración aplican solo al entorno Production, para no pisar las de preview
  (sección 5.3).
- El plan gratis de Neon permite 10 branches, 0.5 GB y 100 CU-horas al mes por proyecto (verificado en
  neon.com el 2026-10-30), y su ventana de restauración es corta; por eso hay respaldos propios (5.4).
- La app usa la URL con pooler (`DATABASE_URL`) en ejecución y la URL directa (`DATABASE_URL_UNPOOLED`)
  para migrar.

### 5.2 R2, correo y Turnstile

- **R2**, en una cuenta de Cloudflare del dueño:
  - `guia-media`: imágenes de producción, con dominio público propio.
  - `guia-media-preview`: imágenes de previews y pruebas.
  - `guia-respaldos`: privado, sin acceso público (5.4).
  - Cada bucket tiene su propia llave, limitada a ese bucket. La llave de producción no sirve en previews.
- **Dominio de las imágenes:** un dominio propio de R2 exige que su zona DNS esté en Cloudflare, en la
  misma cuenta que el bucket. Regla, que se resuelve en F0 y se anota aquí antes de F2:
  - Si la zona de `salysoltours.com` ya está en esa cuenta de Cloudflare: `img-guia.salysoltours.com`.
  - Si no: un dominio de la marca registrado en Cloudflare (el nombre lo elige el dueño), sin mover el DNS
    del sitio de reservas.
- **Correo**: Resend con una llave propia de esta app y el dominio remitente verificado (SPF y DKIM) en F0.
  Previews usan otra llave que solo envía al correo del dueño.
- **Turnstile**: widget con `salysoltours.com` en su lista de dominios. Previews y pruebas usan las llaves de
  prueba de Cloudflare.

### 5.3 Previews de PR

- En un repo privado, los commits de personas que no son miembros del equipo de Vercel no despliegan solos;
  Vercel deja un comentario para pedir autorización. **El dueño lee el diff completo del PR antes de
  autorizar un preview**, porque autorizarlo ejecuta ese código con las variables de preview.
- Las variables de preview son propias y no tocan nada de producción: `DATABASE_URL` de una base de Neon
  `preview` creada vacía y llenada con `npm run seed` (datos inventados, nunca una copia de producción),
  `guia-media-preview` con su llave, la llave de Resend de previews, otro `PAYLOAD_SECRET`, llaves de prueba
  de Turnstile, `GUIA_INDEXABLE=false`.
- Si un preview rompe la base `preview` (por ejemplo, dos PRs con migraciones distintas), se borra y se
  vuelve a crear con el seed. Es un riesgo aceptado.
- El CI no depende de previews (sección 11).

### 5.4 Respaldos

- **Base:** un workflow de GitHub Actions programado (diario) corre `pg_dump` de producción y lo sube cifrado
  a `guia-respaldos`, con retención de 30 días (regla de ciclo de vida del bucket).
  - `pg_dump` corre en la imagen oficial `postgres` de la misma versión mayor que la base de Neon (se fija
    en el workflow y se actualiza si Neon cambia de versión).
  - Cifrado con `age` a una llave pública guardada en el repo. La llave privada la guarda el dueño fuera de
    GitHub y de Vercel (gestor de contraseñas), y solo se usa para restaurar.
- **Imágenes:** el mismo workflow copia semanalmente `guia-media` a `guia-respaldos/media/`.
- Los secretos de ese workflow viven en un environment de GitHub `respaldos` restringido a la rama `main`,
  así que ningún workflow de PR los ve. Usa **dos llaves de R2**: una de solo lectura limitada a
  `guia-media` y otra de lectura y escritura limitada a `guia-respaldos`. Ninguna de las dos puede escribir
  en `guia-media`.
- `guia-respaldos` tiene una regla de bloqueo (bucket lock) de 30 días, para que ni una llave filtrada pueda
  borrar respaldos antes de tiempo.
- **Prueba de restauración:** antes del lanzamiento y luego cada 3 meses, restaurar el último respaldo en una
  base desechable de Neon y abrir el admin contra ella. Se anota la fecha en `docs/operacion.md`.
- Si el dueño prefiere pagar un plan de Neon con historial de 7 días o más, se suma a esto, no lo reemplaza.

### 5.5 Variables de entorno

Ninguna es del sitio de reservas, salvo `GUIA_PROXY_SECRET`, que se comparte. No hay Stripe.

| Variable | Uso | Preview |
|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Neon con pooler (ejecución) y directa (migraciones). | Base `preview`. |
| `PAYLOAD_SECRET` | Firma de sesiones de Payload. | Otro valor. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Imágenes. | `guia-media-preview` y su llave. |
| `CATALOGO_API_URL` | Base de la API pública del catálogo (`https://pescadeportiva-api.onrender.com`). | Igual. |
| `SITIO_URL` | `https://www.salysoltours.com` (canónicas, links a tours). | Igual. |
| `WHATSAPP_NUMERO` | Botón de WhatsApp del pie (el mismo número del sitio de reservas). | Igual. |
| `GUIA_PROXY_SECRET` | Secreto de la cabecera `x-guia-proxy` (sección 4.1). | Otro valor. |
| `IP_HASH_SALT` | Sal del `ipHash` del formulario. | Otro valor. |
| `RESEND_API_KEY`, `CORREO_REMITENTE` | Avisos de Solicitudes. | Llave de previews. |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Formulario público. | Llaves de prueba. |
| `GUIA_INDEXABLE` | `false` hasta el lanzamiento (sección 15). Cambiarla exige un redeploy. | `false`. |
| `CRON_SECRET` | Protege las rutas que llama Vercel Cron. | Otro valor. |

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
  `articles`, `categoria`, `category`, `aparece-en-la-guia`, `get-listed`, `privacidad`, `privacy`, `buscar`,
  `search`.
- Una zona con `activa = false` no tiene página ni aparece en listados.

### Categorías
- `nombre` (es/en), `slug` (es/en: `restaurantes` / `restaurants`), `aplicaA` (lugar, evento o ambos),
  `tipoSchema` (tipo de schema.org para los lugares de la categoría: `Restaurant`, `CafeOrCoffeeShop`,
  `BarOrPub`, `Store`, `TouristAttraction`, `Beach`, `LocalBusiness`…), `orden`.
- `grupo` (obligatorio, lista cerrada): `mar`, `aire-libre`, `comer-y-salir` o `lo-local`. Decide el color de la
  categoría en el sitio (`docs/diseno/lineamientos.md`, «Color por grupo de categorías»). Nadie escribe códigos
  de color.
- Carga inicial: restaurantes, cafés y bares, actividades, playas, tiendas locales, mercados, cultura.

### Lugares
- `nombre` (sin localizar; nombre propio), `slug` (es/en), `zona`, `categorias` (1 o más; la primera es la
  principal y decide el `tipoSchema`), `resumen` (es/en, máx. 160 caracteres), `cuerpo` (es/en), `fotos`
  (1 o más).
- `direccion`, `coordenadas`, `telefono`, `whatsapp`, `web`, `instagram`, `rangoPrecio` ($ a $$$$).
- `horario`: lista de `{ dia, abre, cierra }` + `notaHorario` (es/en). Un día puede tener varios tramos; un
  tramo con `cierra ≤ abre` pasa de medianoche. Sin filas, el horario no se conoce y el sitio no muestra
  «Abierto» ni «Cerrado».
- `caracteristicas` (opcional, varias, lista cerrada definida en código): `para-ninos`, `con-comida`,
  `solo-con-tour`. Alimentan el filtro `?caracteristica=` (sección 7).
- `orden` (número, por defecto 100) para el orden editorial.
- Grupo `patrocinio`: `activo`, `desde`, `hasta` (fechas; cuentan desde las 00:00 de `America/Mazatlan`),
  `notaInterna`.
  - **Vigente** si `activo` y `desde ≤ ahora < hasta`. Solo un patrocinio vigente sube en el orden.
  - **Se declara** (etiqueta «Patrocinado» / «Sponsored» y `rel="sponsored"`) si `activo` y `ahora < hasta`,
    aunque `desde` no haya llegado. Así, con la caché de la sección 10, un patrocinio nunca se muestra sin
    declarar; a lo más, la etiqueta dura hasta una hora de más.

### Eventos
- `nombre` (es/en), `slug` (es/en), `zona`, `lugar` (relación opcional a Lugares) **o** `direccionLibre`,
  `categorias` (1 o más; la primera da la etiqueta y el color), `inicio`, `fin` (opcional), `precio` (texto es/en) o `gratis`, `urlBoletos`, `fotos`,
  `resumen` (es/en), `cuerpo` (es/en), grupo `patrocinio` (igual que Lugares).
- Las fechas se capturan y muestran en `America/Mazatlan` (hora de BCS).
- **Próximo** si `(fin ?? inicio) ≥ ahora`. **Pasado** en otro caso: sale de los listados, su página sigue
  publicada con la marca «Ya pasó» y sigue en el sitemap.

### Artículos
- `titulo` (es/en), `slug` (es/en), `zonas` (opcional, varias), `categorias` (opcional, varias; la primera da
  la etiqueta y el color), `resumen` (es/en), `portada`, `autor` (usuario; se muestra su nombre público),
  `publicadoEl` (se fija la primera vez que se publica), `actualizadoEl` (visible en la página; se actualiza
  cada vez que se publica un cambio).
- `lugaresCitados` (oculto en el admin): los lugares de sus bloques «Tarjeta de lugar», en los dos idiomas.
  Lo llena un hook al guardar; alimenta «Aparece en» de la ficha del lugar.
- `cuerpo` (es/en) con bloques insertables:
  - **Tarjeta de lugar** (relación a Lugares).
  - **Tarjeta de evento** (relación a Eventos).
  - **Tours en esta zona** (relación a Zona; usa el contrato 8.1).
  - **Preguntas frecuentes** (lista de pregunta/respuesta es/en; genera `FAQPage`).

### Textos de zona × categoría
- `zona`, `categoria` (de las que aplican a lugares) e `introduccion` (es/en). Un registro por par.
- Es la introducción de la página «Categoría en zona». Si el par no tiene registro, la página arma un texto
  automático (por ejemplo «8 playas en La Paz, visitadas por el equipo de la Guía»).

### Fotos de tours
- `sedeSlug`, `tipo` (`servicio` o `paquete`) y `slug`: identifican un tour del catálogo (8.1). Únicos juntos.
- `foto` (Media) y `temporada` (texto es/en, opcional, p. ej. «enero a marzo»).
- El catálogo no manda fotos ni temporada; estas tarjetas las toman de aquí. Un tour sin registro se muestra
  como tarjeta de texto (nombre, precio, duración).

### Solicitudes
- `negocio`, `giro`, `zona` (texto libre o relación), `contactoNombre`, `correo`, `telefono`,
  `webOInstagram`, `mensaje`, `aceptoPrivacidad` (con la versión del aviso aceptada), `ipHash`
  (SHA-256 con `IP_HASH_SALT`, solo para el límite de envíos), `estado` (nueva, en contacto, aceptada,
  rechazada), `notasInternas`, `lugarCreado` (relación), `anonimizadaEl`.
- Solo se crean desde el formulario público. El público nunca las lee.
- Conservación y borrado: sección 12.

### Redirecciones
- Plugin oficial de redirecciones de Payload: `desde` (ruta), `hacia` (ruta; las redirecciones a un documento se rechazan porque su destino dependería del idioma y del slug del momento, y la caché del sitio no lo seguiría), tipo `308`.
- Se crean solas (hooks), y un Admin puede crearlas a mano:
  - **Cambio de slug** de un documento publicado: ruta vieja → ruta nueva, por idioma. Si había una
    redirección hacia la ruta vieja, se actualiza para que apunte a la nueva (sin cadenas).
  - **Lugar despublicado o borrado:** su ficha → su página de categoría en zona; si esa combinación no tiene
    página, → la zona.
  - **Artículo despublicado o borrado:** → la zona del primer elemento de `zonas`, o la portada de la guía.
  - Los eventos no se despublican al pasar; si se borra uno, → la página de eventos.
- Cuando una ruta no encuentra su documento, la página consulta las Redirecciones antes de dar 404 y
  responde con `permanentRedirect()`.

### Media
- Imagen subida a R2 con `alt` (es/en, obligatorio), `credito` y tamaños generados: 480, 960, 1600 px de
  ancho en WebP, más uno de 1200×630 que se usa de fondo para la imagen Open Graph (sección 9). Límites de
  subida en la sección 4.2.

### Usuarios
- Slug de la colección fijo: `users` (la ruta de login es `/api/users/login`; la regla del firewall de la
  sección 11 depende de él).
- `nombrePublico`, `correo`, `rol` (`admin` o `editor`).

### Global «Ajustes de la guía»
- `correosAviso` (lista de correos que reciben las Solicitudes; solo personal), `correoPrivacidad` (para
  solicitudes ARCO; de lectura pública, porque el aviso lo muestra), `formularioActivo` (apagado hasta que el
  aviso de privacidad esté publicado), textos de portada (es/en).
- Aviso de privacidad de la Guía: `avisoPrivacidad` (texto enriquecido es/en), `versionAviso` (p. ej.
  `2026-11`) y `avisoVigenteDesde` (fecha). Cada cambio de texto lleva versión nueva; la Solicitud guarda la
  versión aceptada (sección 12).

### Reglas comunes
- **Destacar en portada:** Lugares, Eventos y Artículos tienen `destacadoEnPortada` (casilla) y
  `ordenDestacado` (número). La portada muestra los destacados por ese orden; un evento destacado que ya pasó
  deja de mostrarse. Un lugar o evento destacado con patrocinio declarado lleva su etiqueta también ahí.
- **SEO por documento:** `metaTitulo` y `metaDescripcion` (es/en) opcionales (si faltan se usan nombre/título
  y resumen) y `noIndexar`.
- **Slugs:** se generan del nombre o título, en minúsculas ASCII con guiones, editables, únicos por colección
  e idioma. Cambiarlos crea una redirección (ver Redirecciones).
- **Regla de idioma:** un documento existe en un idioma solo si tiene en ese idioma su `resumen` y su
  `cuerpo` (y su `nombre`/`titulo` cuando es localizado). Si no, esa URL da 404, no entra al sitemap y no
  aparece en el `hreflang` del otro idioma. Nunca se muestra una página a medias.
  - Payload devuelve por defecto el idioma de respaldo, lo que haría parecer que todo existe en inglés. La
    configuración lleva `localization.fallback: false` y toda consulta pública usa `fallbackLocale: false`.
    Una prueba de integración lo comprueba (sección 11).

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
| Búsqueda | `/es/guia/buscar?q=` | `/en/guide/search?q=` |
| Negocios | `/es/guia/aparece-en-la-guia` | `/en/guide/get-listed` |
| Aviso de privacidad | `/es/guia/privacidad` | `/en/guide/privacy` |
| Sitemap | `/guia-sitemap.xml` (ambos idiomas) | |

Qué muestra cada una:

- **Portada:** destacados (los marcados «destacar en portada»), zonas activas, próximos eventos, artículos
  recientes y categorías.
- **Zona:** introducción, artículos de la zona, lugares por categoría, próximos eventos y, si la zona tiene
  `sedeSlug`, «Tours en esta zona».
- **Categoría en zona:** introducción (Textos de zona × categoría), listado de lugares y, si la zona tiene
  `sedeSlug`, «Tours en esta zona». Es la página que compite por «{categoría} en {zona}».
- **Categoría en todas las zonas:** lugares de esa categoría agrupados por zona.
- **Lugar:** ficha completa con galería, mapa, horario, contacto, distancia en línea recta a las coordenadas
  de su zona, eventos en ese lugar, artículos donde aparece (`lugaresCitados`) y, si aplica, «Tours en esta
  zona».
- **Eventos:** próximos eventos por fecha, con filtro por zona.
- **Evento:** detalle; si ya pasó, la marca «Ya pasó» arriba.
- **Artículo:** cuerpo con sus bloques.
- **Negocios:** explicación breve y formulario (si `formularioActivo` está apagado, la página explica que
  pronto se abre y la Server Action rechaza envíos).
- **Aviso de privacidad:** el texto de la sección 12.

### Zonas y categorías: páginas reales que se usan como filtros

- Cada combinación zona × categoría es una página real (URL, título, descripción, introducción, sitemap).
- Arriba de los listados hay píldoras de zona y de categoría; **cada píldora es un link** a la página de esa
  combinación, no un filtro de JavaScript.
- **Todos los umbrales se cuentan por idioma**, con los lugares que existen en ese idioma según la regla de
  idioma.
- Una píldora aparece solo si su combinación tiene **al menos 1** lugar publicado en ese idioma.
- Una combinación con **menos de 3** lugares en un idioma tiene página en ese idioma, pero lleva `noindex` y
  no entra al sitemap. El mismo umbral aplica a «Categoría en todas las zonas».
- Filtros secundarios (`?precio=`, `?abierto=`, `?caracteristica=`, `?zona=` y fechas en eventos) son
  parámetros de consulta.
  Esas variantes llevan canónica a la página sin parámetros y `noindex`.
- Paginación con URL real (`?pagina=2`), sin scroll infinito. La paginación no es un filtro: cada página
  lleva canónica a sí misma y es indexable si la página 1 lo es; `?pagina=1` redirige a la URL sin
  parámetro. Una página fuera de rango da 404.

### Orden de los listados

1. Hasta **2** elementos con patrocinio vigente arriba. Si hay más de 2 vigentes, van arriba los 2 con
   `desde` más antiguo (desempate por nombre); los demás quedan en su lugar normal.
2. El resto por `orden` ascendente y luego por `nombre`. En eventos, el resto va por `inicio`.

La regla aplica igual a lugares y a eventos próximos. Todo elemento que se declara como patrocinado (sección
6, Lugares) lleva la etiqueta «Patrocinado» / «Sponsored» en cualquier lugar donde aparezca (listado, ficha,
tarjeta dentro de un artículo), esté arriba o no, y todos sus links externos llevan `rel="sponsored"`. Lo
aplica el código, no el editor.

En artículos el patrocinio no cambia el texto; solo se muestra la etiqueta junto a la tarjeta del lugar.

### Navegación
- **Cabecera propia de la Guía** (decisión del 2026-11-03; ya no replica la del sitio de reservas). Sello de
  marca (isotipo de Sun Baja y «Guía de la Baja», link a la portada de la guía), zonas activas, búsqueda,
  idioma y un solo link al sitio de reservas que nombra su destino y conoce la zona: «Tours en {zona} →» a la
  página de la sede si la zona tiene `sedeSlug`, o «Tours en la Baja →» a la portada del sitio. En celular va
  en una fila y las zonas, debajo, se esconden al bajar. Diseño en `docs/diseno/propuestas/`.
- **El pie sí replica el del sitio de reservas** (sus textos, links, formas de pago y logo), con los datos
  copiados en el código de la Guía, más el link al aviso de privacidad de la Guía. Si el sitio cambia su pie,
  se actualiza aquí a mano.
- Todos los links al sitio de reservas son `<a>` (sección 4).
- Migas de pan visibles (Guía › La Paz › Restaurantes) con `BreadcrumbList`.
- El cambio de idioma lleva al mismo documento en el otro idioma; si no existe, a la portada de la guía en
  ese idioma.

### Búsqueda
- Busca en lugares, eventos próximos, artículos, zonas activas y categorías, por idioma y con la regla de
  idioma (sección 6). Los eventos que ya pasaron no aparecen; sus páginas siguen publicadas.
- Resultados agrupados por tipo. En cada grupo suben hasta 2 elementos con patrocinio vigente (misma regla que
  los listados) y llevan su etiqueta; el resto va por relevancia.
- Filtros `?tipo=` (lugares, eventos, artículos) y `?zona=`, con links. Paginación como en los listados.
- La página de resultados lleva `noindex` y no entra al sitemap.
- La cabecera sugiere zonas, categorías y documentos mientras se escribe, con una ruta interna de la Guía que
  no forma parte del contrato `v1`.
- El término de búsqueda llega de la URL: se muestra siempre como texto, nunca se interpola en HTML.

## 8. Contratos con el sitio de reservas

Los dos contratos son de **solo lectura**. La Guía nunca escribe en el sistema de reservas.

### 8.1 Guía → catálogo

- `GET {CATALOGO_API_URL}/api/sedes/{sedeSlug}/servicios/` y `GET .../paquetes/` (ya existen, públicos).
- Cada tarjeta muestra nombre, precio «desde» (calculado con `precio_base` o `precio_ancla` y
  `estrategia_precio`, en pesos o en dólares según el idioma) y duración; la foto y la temporada salen de la
  colección Fotos de tours, y sin ese registro la tarjeta es de texto.
- Las tarjetas enlazan a `{SITIO_URL}/{lang}/servicio/{empresa}/{servicio}` y
  `{SITIO_URL}/{lang}/sede/{sedeSlug}/paquete/{paquete}`, con los parámetros de atribución de la sección 13.
- Caché de 1 hora por etiqueta. Límite de espera de 3 s.
- Si la llamada falla, tarda o la respuesta no pasa el esquema de validación, la función lanza un error
  dentro de la caché (así **el fallo no se guarda en caché**), el bloque no se muestra, la página carga
  normal y se registra el error en logs. Como la página misma se cachea, toda página con bloque de tours
  tiene `revalidate = 3600`: a lo más en una hora vuelve a intentarlo.

### 8.2 Sitio de reservas → Guía

`GET https://sunbaja-guia.vercel.app/api/publico/v1/zonas/{sedeSlug}/resumen?lang=es|en` (en el alias de
producción de la Guía, no en la URL de un deployment; el sitio de reservas lo llama desde su servidor).

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
  sigue respondiendo hasta que el sitio de reservas migre. El CI valida la forma exacta (sección 11).

## 9. SEO y GEO

- Todo se genera en el servidor; ningún contenido depende de JavaScript para mostrarse.
- Metadatos por página: título, descripción, canónica absoluta a `https://www.salysoltours.com/...` y
  `hreflang` (`es-MX`, `en-US`, `x-default` → español), con la misma convención que el sitio de reservas.
- **`hreflang` solo entre versiones indexables.** Una página enlaza la versión del otro idioma solo si esa
  versión existe y es indexable (no tiene `noindex` por umbral, por `noIndexar` ni por filtro). Si no, la
  página no lleva `hreflang` hacia ese idioma. Los alternos del sitemap siguen la misma regla.
- Reglas de `noindex`:
  - En el HTML (`<meta name="robots">`), cualquiera basta: `GUIA_INDEXABLE` distinto de `true`,
    `noIndexar` del documento, umbral de lugares (sección 7), variante con filtros. Ninguna depende de la
    petición, así que el HTML cacheado sirve igual para todos.
  - En la cabecera `X-Robots-Tag`: petición directa, puesta por el `proxy.ts` de la Guía (sección 4.1).
- «Indexable», para `hreflang` y sitemap, se refiere solo a las reglas del HTML.
- JSON-LD:
  - Lugar: el `tipoSchema` de su categoría principal, con `address`, `geo`, `openingHoursSpecification`,
    `telephone`, `priceRange`, `image`, `url`.
  - Evento: `Event` con `startDate`, `endDate`, `location`, `offers` (o gratis), `eventStatus`, `image`.
  - Artículo: `Article` con `author`, `datePublished`, `dateModified`, `image`; más `FAQPage` si tiene el
    bloque de preguntas.
  - Listados: `ItemList`. Todas las páginas: `BreadcrumbList`.
- **Imagen Open Graph:** `og:image` es la que genera `next/og` por página (marca + título sobre el tamaño
  1200×630 de su foto principal; sin foto, fondo de marca). URL absoluta vía `metadataBase` = `SITIO_URL`.
- Para asistentes de IA: datos duros arriba y en texto (dirección, horario, precio, fechas), «Actualizado el»
  y autor visibles, respuestas directas al inicio de los artículos.
- `/guia-sitemap.xml` con todas las URLs indexables de los dos idiomas y sus alternos indexables. Con
  `GUIA_INDEXABLE` distinto de `true` responde 404. El `robots.txt` del sitio de reservas lo enlaza (lo
  cambia el dueño en su repo, en F6).
- Metas en móvil (datos de campo, Search Console): LCP < 2.5 s, INP < 200 ms, CLS < 0.1. Los umbrales de
  laboratorio del CI están en la sección 11.

## 10. Caché y revalidación

Toda lectura de Payload para el sitio público pasa por `unstable_cache` con etiquetas. Etiquetas:

| Etiqueta | La llevan |
|---|---|
| `lugar:{id}`, `evento:{id}`, `articulo:{id}` | La ficha del documento y toda página que muestre su tarjeta (listados, artículos que la insertan, portada, endpoint 8.2). |
| `zona:{id}`, `categoria:{id}` | Páginas de esa zona o categoría y toda página que muestre su nombre. |
| `listados` | Portada, zonas, categorías, eventos y el endpoint 8.2. |
| `redirecciones` | La consulta de redirecciones. |
| `ajustes` | Lo que lee el Global. |
| `catalogo:{sedeSlug}` | Las llamadas al catálogo (8.1). |
| `textos:{zona}:{categoria}` | La página de esa categoría en zona (su introducción). |
| `tours-fotos` | Toda página con tarjetas de tours (las fotos y temporadas de la colección Fotos de tours). |

- **Al editar:** hooks `afterChange` y `afterDelete` de cada colección (incluye publicar, despublicar,
  programar y cambiar slug) revalidan la etiqueta del documento, `listados` y las de su zona y categorías.
  - `revalidateTag` solo existe dentro del runtime de Next. Los hooks no revalidan si
    `req.context.disableRevalidate` es verdadero (lo ponen `npm run seed`, los scripts de `payload run` y
    las migraciones), y en cualquier caso envuelven la llamada en `try/catch` y registran el error sin
    romper el guardado.
- **Con el paso del tiempo** (Vercel Cron cada hora, minuto 5, protegido con `CRON_SECRET`):
  1. Corre la cola de trabajos de Payload (publicación programada; sus hooks revalidan como arriba).
  2. Busca lugares y eventos cuyo `patrocinio.desde`, `patrocinio.hasta`, `inicio` o `fin` cayó en los
     últimos 65 minutos y revalida sus etiquetas y `listados`. La ventana se traslapa a propósito; revalidar
     dos veces no hace daño.
- Se usa `revalidateTag(tag, { expire: 0 })` (firma de Next 16, expiración inmediata), no el perfil `'max'`,
  para que la siguiente visita ya vea el cambio.
- Red de seguridad: las páginas tienen `revalidate = 3600`.
- **Sin caché en el CDN del sitio de reservas.** El rewrite del sitio no debe guardar en su CDN las
  respuestas de páginas de la Guía, porque `revalidateTag` de la Guía no lo limpiaría. El sitio desactiva
  la caché de rewrites para esas rutas (`x-vercel-enable-rewrite-caching: 0`). La documentación de Vercel
  solo describe esa cabecera para rewrites de `vercel.json`, así que la comprobación 3 de la sección 4.1 es
  la que manda: si falla, el rewrite de páginas se mueve a `vercel.json` del sitio de reservas con esa
  cabecera y las `x-guia-*` como transformaciones de petición, y se repiten las comprobaciones 1–3 y, en el
  lanzamiento, la 5. Si con el plan B la IP del visitante no llega en `x-guia-ip`, el límite de envíos deja
  de ser por IP y pasa a ser por correo y teléfono de la Solicitud (5 por hora), además de Turnstile.

## 11. Calidad, barreras y pruebas

### Barreras del repo

- **Plan de GitHub** que permita proteger ramas y exigir revisiones en repos privados (GitHub Pro para una
  cuenta personal, o Team para una organización). Es requisito de F0: sin eso estas barreras no existen.
- `main` protegida (ruleset): solo por PR, con aprobación de CODEOWNERS y CI verde; sin force push ni
  borrado. Solo el dueño puede saltar la aprobación, y solo en sus propios PRs (GitHub no deja aprobar un PR
  propio); el CI verde no se salta nunca.
- `CODEOWNERS`: el dueño en todo el repo, con mención explícita de `payload.config.ts`,
  `src/collections/**`, `src/migrations/**`, `src/app/api/publico/**`, `.github/**`, `AGENTS.md`,
  `CLAUDE.md` y `docs/**`.
- `AGENTS.md` (y `CLAUDE.md` que lo importa) con: alcance del repo, versiones fijas, comandos, la regla de
  no tocar el contrato `v1` ni migraciones ya aplicadas, que toda dependencia nueva se justifica en el PR, y
  que el diseño de referencia es `docs/diseno/`.
- **Migraciones** con `payload migrate:create`, commiteadas. En producción nunca se usa el modo `push`; el
  build de Vercel corre `payload migrate` (con `DATABASE_URL_UNPOOLED`) antes de `next build`. Como la
  migración corre antes de que el deploy nuevo quede activo, **toda migración debe ser compatible con el
  código anterior** (expandir y luego contraer: primero se agregan columnas o tablas; se borran o renombran
  en un PR posterior, cuando ningún deploy activo las usa).
- El CI corre con permisos de solo lectura y sin secretos de producción. El único workflow con secretos es
  el de respaldos (sección 5.4).

### Seguridad de Payload

- Acceso **negado por defecto** en todas las colecciones. Público: solo leer documentos publicados de Zonas,
  Categorías, Lugares, Eventos, Artículos, Redirecciones y Media. Solicitudes: el público solo puede crear,
  y únicamente a través de la Server Action (no por la API REST de Payload). Usuarios: nunca público.
- Editor: todo el contenido y las Solicitudes; no administra Usuarios, Redirecciones ni el Global. Admin: todo.
- GraphQL de Payload apagado.
- Login del admin con bloqueo tras 5 intentos fallidos durante 10 minutos, contraseñas de 12 caracteres o
  más, y una regla del firewall de Vercel que limita las peticiones a `/api/users/login` por IP.

### Formulario de negocios

- Validación de campos en el servidor, Turnstile verificado en el servidor (con `remoteip`), casilla de
  aceptación del aviso de privacidad de la Guía (sección 12), y máximo 5 envíos por `ipHash` por hora. La IP
  sale de la regla de la sección 4.1.
- Solo funciona si `formularioActivo` está encendido.
- Si el correo de aviso falla, la Solicitud queda guardada igual y el error va a los logs.
- Los logs nunca llevan correo, teléfono ni IP.

### CI (GitHub Actions, en cada PR y en `main`)

1. Tipos, lint y build.
2. Unitarias (Vitest): slugs reservados y formato de slugs, regla de idioma, patrocinio vigente / declarado
   / vencido, evento próximo/pasado, umbrales de 1 y 3 lugares por idioma, orden de listados (incluye más de
   2 patrocinios vigentes), `hreflang` solo entre versiones indexables, `origenDePeticion` (secreto válido,
   inválido y ausente), etiquetas que revalida cada tipo de cambio, ventana del cron.
3. Integración contra Postgres (servicio de GitHub Actions) usando la API local de Payload: permisos (el
   público no ve borradores ni Solicitudes; un Editor no administra Usuarios), sin idioma de respaldo (un
   documento solo en español no aparece en inglés), redirección creada al cambiar un slug y al despublicar
   un lugar, anonimización de Solicitudes, y la forma exacta de `/api/publico/v1/...` validada con un esquema
   congelado en el repo.
4. E2E (Playwright) contra un build de producción local con datos de prueba: portada, zona, categoría, ficha,
   evento pasado, artículo, formulario (llave de prueba de Turnstile), 404 por idioma faltante, 308 de un
   slug viejo, `noindex` con `GUIA_INDEXABLE=false`, `X-Robots-Tag: noindex` sin la cabecera
   `x-guia-proxy` y sin ella con la cabecera (y `GUIA_INDEXABLE=true`), el HTML de una página pedida con la
   cabecera después de pedirla sin ella no tiene `noindex` y conserva sus `hreflang`, 404 en una ruta de
   idioma cruzado (`/en/guia/...`), sitemap 404 con `GUIA_INDEXABLE=false`.
5. Lighthouse CI contra ese mismo build, emulación móvil, mediana de 3 corridas, en portada, zona, ficha y
   artículo: LCP < 2.5 s, TBT < 200 ms (en lugar de INP, que solo existe en campo), CLS < 0.1.

### Errores

- `error.tsx` y `not-found.tsx` por idioma.
- Fallas de los contratos: el bloque se oculta, la página carga, y se registra el error.

## 12. Privacidad y datos personales

El formulario recaba datos personales de contacto en México, así que aplica la LFPDPPP. El texto legal lo
redacta o aprueba el dueño (entregable de F0); el código solo garantiza lo siguiente.

- **Aviso de privacidad propio de la Guía** en `/es/guia/privacidad` y `/en/guide/privacy`, distinto del
  aviso del sitio de reservas porque la finalidad es otra. Su texto vive en el Global (`avisoPrivacidad`, con
  `versionAviso` y `avisoVigenteDesde`) y la página muestra `correoPrivacidad`. Debe decir: responsable y contacto; finalidad
  (contactar al negocio para evaluar su inclusión en la guía y ofrecerle patrocinio); datos que se piden;
  encargados que los procesan (Vercel, Neon, Resend, Cloudflare) y que están en EE. UU.; plazo de
  conservación; cómo ejercer los derechos ARCO; uso de Turnstile y de la analítica.
- La casilla del formulario enlaza ese aviso y guarda qué versión se aceptó.
- El formulario no se activa (`formularioActivo`) hasta que el aviso esté publicado en los dos idiomas.
- **Conservación** (cron diario, protegido con `CRON_SECRET`):
  - `ipHash` se borra a las 24 horas; solo sirve para el límite de envíos.
  - Una Solicitud `rechazada`, o sin cambio de estado en 12 meses, se anonimiza: se borran `contactoNombre`,
    `correo`, `telefono`, `webOInstagram` y `mensaje`; quedan `negocio`, `giro`, `zona`, `estado` y fechas,
    y se llena `anonimizadaEl`.
  - Una Solicitud `aceptada` conserva sus datos mientras dure la relación; al terminar, un Admin la
    anonimiza con una acción del admin.
- **Derechos ARCO:** las peticiones llegan a `correoPrivacidad`. Un Admin puede ver, corregir, exportar y
  anonimizar o borrar la Solicitud de esa persona desde el admin. Se responde en el plazo que marca la ley.
- Las bases de previews, pruebas y local nunca tienen datos reales (sección 5.3).

## 13. Medición

- **Herramienta:** la misma analítica y la misma propiedad que ya usa el sitio de reservas, para ver el
  recorrido guía → reserva en un solo lugar. En F0 el dueño confirma cuál es y se anota aquí. Si es Vercel
  Web Analytics, su script y su endpoint (`/_vercel/insights/*`) los atiende el proyecto del sitio de
  reservas, porque esa ruta no se reescribe a la Guía; la comprobación se hace en F5. Si la herramienta usa
  cookies, el aviso de privacidad lo declara y la Guía usa el mismo consentimiento que el sitio.
- **Eventos** que manda la Guía:
  - `tour_clic` (`zona`, `origen`: zona, lugar, artículo, categoría o cabecera).
  - `contacto_lugar` (`lugar`, `canal`: whatsapp, teléfono, web, instagram o mapa). Sirve para mostrarle
    valor a un negocio patrocinado.
  - `boletos_clic` (`evento`).
  - `solicitud_enviada` (`zona`).

  Cada evento lleva como máximo 2 propiedades, que es lo que admite Vercel Web Analytics en el plan Pro. El
  detalle (servicio o paquete, pieza exacta) viaja en los parámetros de atribución.
- **Atribución de reservas:** los links a tours llevan `?desde=guia&pieza={tipo}-{slug}` (por ejemplo
  `pieza=articulo-que-hacer-en-la-paz`; desde la cabecera, `pieza=cabecera`). El sitio de reservas guarda `desde`/`pieza` del primer toque y los
  registra con la reserva (cambio en su repo, sección 16). No se usan UTM en links internos.
- **Tráfico orgánico:** Google Search Console y Bing Webmaster Tools.
- **Revisión mensual** con: visitas orgánicas a la guía y consultas principales (Search Console), páginas
  indexadas, tasa de `tour_clic` por visita, reservas con `desde=guia`, Solicitudes nuevas y su estado.
- **Criterios de éxito iniciales** (hipótesis; se ajustan con datos a los 3 meses del lanzamiento). A los 6
  meses: 3,000 visitas orgánicas al mes o más en la guía; `tour_clic` en el 3 % de las visitas o más; al
  menos 1 reserva al mes atribuida a la guía; al menos 5 Solicitudes por trimestre.

## 14. Fases

| Fase | Quién | Qué | Depende de |
|---|---|---|---|
| F0 Preparación | Dueño | Repo privado en GitHub con plan Pro o Team, Vercel Pro, proyecto Vercel, integración Neon (`aws-us-east-1`, sin branches automáticos), base `preview`, buckets R2 y sus llaves, dominio de imágenes resuelto (5.2), Turnstile con el dominio, Resend con dominio verificado, `GUIA_PROXY_SECRET`, environment `respaldos` en GitHub. Además: texto del aviso de privacidad (sección 12) y confirmación de la herramienta de analítica (sección 13). | — |
| F1 Diseño | Dueño (con su equipo de diseño) | Pantallas clave en móvil y escritorio: portada, zona/categoría, ficha, evento, artículo, formulario. Paleta, tipografías y formas de la marca. Se entregan en `docs/diseno/`. Entregado el 2026-11-03: lineamientos, propuesta C (10 pantallas) y las decisiones de `docs/diseno/decisiones-frontend-backoffice.md`, que cambian el modelo de datos de la sección 6. | — |
| F2 Base | Programadores | App Next + Payload, colecciones (con Redirecciones), permisos, migraciones, Global, seed, subidas a R2 (verificación de 4.2), workflow de respaldos, CI pasos 1–3. Se despliega a producción con `GUIA_INDEXABLE=false`. | F0 |
| F3 Sitio público | Programadores | Páginas, SEO, JSON-LD, sitemap, redirecciones, formulario, aviso de privacidad, eventos de analítica, caché y crones (sección 10 y 12), CI pasos 4–5. | F1 aprobada, F2 |
| F4 Contratos | Programadores | `/api/publico/v1` y «Tours en esta zona». | F2 |
| F5 Integración | Dueño (en el repo del sitio de reservas) | Cambios 1–5 de la sección 16 y las comprobaciones 1–3 de la sección 4.1. Menú y robots esperan a F6. | F3 y F4 en producción |
| F6 Contenido y lanzamiento | Equipo de contenido y dueño | Carga del contenido mínimo (puede empezar en cuanto F2 esté en producción); prueba de restauración del respaldo; publicar el aviso y encender `formularioActivo`; `GUIA_INDEXABLE=true` (con redeploy); comprobaciones 4–5 de la sección 4.1; luego link en el menú y sitemap en robots. | Carga: F2. Lanzamiento: F3, F5 |

F1 y F2 corren en paralelo.

## 15. Lanzamiento

- Hasta F6 la guía corre con `GUIA_INDEXABLE=false` y sin link en el menú del sitio; el rewrite puede estar
  en producción para probar sin que los buscadores vean una guía vacía.
- **Contenido mínimo para lanzar:** zona La Paz con unos 15 lugares en al menos 3 categorías, 4–5
  artículos y los eventos próximos, todo en español e inglés. Las otras zonas se activan cuando tengan su
  propio mínimo.
- **Lista de lanzamiento:** comprobaciones 1–3 de la sección 4.1 pasadas en F5; prueba de restauración
  hecha; aviso de privacidad publicado; analítica recibiendo eventos; con eso se enciende
  `GUIA_INDEXABLE=true` y deben pasar las comprobaciones 4–5 antes de poner el link en el menú y el sitemap
  en robots.
- Después: alta en Google Search Console y Bing Webmaster Tools, y revisión mensual de la sección 13.

## 16. Lo que cambia en el sitio de reservas (referencia; se hace en su repo, no aquí)

1. En `proxy.ts`, antes de cualquier otra lógica: rewrite de `/es/guia/:path*`, `/en/guide/:path*` y
   `/guia-sitemap.xml` hacia `GUIA_ORIGEN` (alias de producción de la Guía, variable de entorno del sitio),
   con las cabeceras `x-guia-proxy`, `x-guia-ip` y `x-guia-host` de la sección 4.1. Esas respuestas no
   reciben la CSP ni las cabeceras de seguridad propias del sitio, y no se cachean en su CDN
   (`x-vercel-enable-rewrite-caching: 0`; plan B en la sección 10). `/guia-assets/:path*` va como rewrite
   normal en `next.config`, sin cabeceras.
2. Variables `GUIA_ORIGEN` y `GUIA_PROXY_SECRET`.
3. Prueba con una respuesta de ejemplo del contrato `v1`.
4. Bloque «Qué hacer en {sede}» en la página de cada sede (límite de espera 2 s, caché 10 min; si falla, no
   aparece). Sus links a la Guía son `<a>`.
5. Guardar `desde`/`pieza` del primer toque y registrarlos con la reserva (sección 13). Las canónicas de
   las páginas de tours ignoran esos parámetros.
6. En F6: «Guía» en menú y pie (como `<a>`); `/guia-sitemap.xml` en `robots.txt`.

## 17. Riesgos

- **Contenido flaco o genérico.** Google castiga el contenido de bajo valor hecho en volumen. Mitigación:
  mínimo de lanzamiento, fotos propias, datos verificados, umbral de 3 lugares por idioma para indexar.
- **Patrocinios sin declarar.** Mitigación: etiqueta visible y `rel="sponsored"` forzados por el código, no
  por el editor, en toda aparición; se declara desde que el patrocinio se activa, aunque no haya empezado,
  así que la caché nunca lo muestra sin etiqueta.
- **La Guía no ve al visitante detrás del rewrite.** Si las cabeceras de la sección 4.1 no llegan, la guía
  queda en `noindex` y el límite del formulario no funciona. Mitigación: cabecera firmada, el origen solo
  afecta cabeceras (nunca el HTML cacheado), pruebas E2E y las comprobaciones de la sección 4.1, que
  bloquean el lanzamiento.
- **Límites del plan gratis de Neon** (0.5 GB, restauración corta). Mitigación: imágenes fuera de la base,
  previews en una base aparte, respaldos diarios propios con prueba de restauración.
- **Código de PRs externos en previews.** Mitigación: el dueño revisa el diff antes de autorizar; las
  variables de preview no dan acceso a datos ni archivos de producción.
- **Datos personales de negocios.** Mitigación: aviso propio, conservación limitada, anonimización
  automática, sin datos reales fuera de producción.
- **Choques de rutas con el sitio de reservas** (`/_next`, CSP, `proxy.ts`, caché del CDN). Mitigación:
  `assetPrefix`, imágenes sin optimizador de Next, cambios de la sección 16 y comprobaciones de F5.
- **Slugs que cambian o contenido que se retira.** Mitigación: redirecciones 308 automáticas.
