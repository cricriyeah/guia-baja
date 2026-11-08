# Paquete 2: itinerarios y páginas temáticas

Fecha: 2026-11-07. Estado: aprobado por el crítico.
Base: `docs/specs/2026-10-30-guia-baja-design.md` (spec principal), `docs/specs/2026-11-07-presencia-reservas-design.md`
y `docs/specs/2026-11-07-paquete-1-fichas-y-articulos-design.md`. El paquete 2 se implementa **después** del 1 y usa
sus piezas: bloque y tarjeta de tour, JSON-LD `TouristTrip` y enlaces automáticos.

## 1. Problema

Dos clases de búsqueda grandes no tienen página en la Guía:

- **Planes por días:** «qué hacer en La Paz en 3 días», «itinerario Todos Santos un día». Es la pregunta típica a
  ChatGPT o Gemini antes de un viaje, y en cada día cabe un tour. Hoy solo se puede contestar con un artículo libre,
  sin estructura de días que un buscador o un asistente lea como plan.
- **Intenciones:** «tours con niños en La Paz», «qué hacer si hace viento en La Ventana», «planes en pareja». Las
  páginas con filtros (`?caracteristica=para-ninos`) llevan `noindex` y canónica a la página sin filtros
  (spec principal §7), a propósito, para no llenar Google de combinaciones. Así que esas búsquedas no tienen página
  indexable, y el filtro tampoco muestra tours ni texto propio.

## 2. Qué se entrega

Dos colecciones nuevas con su página pública indexable:

- **Itinerarios:** planes de 1 a 7 días con paradas.
- **Temas:** una página por intención, armada por el editor.

Las dos siguen las reglas comunes de contenido del spec principal §6: borradores, versiones, publicación
programada, SEO por documento, slugs por idioma con redirecciones, regla de idioma y destacar en portada.

### 2.1 URLs

| Página | Español | Inglés |
|---|---|---|
| Itinerario | `/es/guia/itinerarios/{slug}` | `/en/guide/itineraries/{slug}` |
| Tema | `/es/guia/temas/{slug}` | `/en/guide/topics/{slug}` |

- Se agregan a `SEGMENTOS` en `src/dominio/rutas.ts`: `itinerarios`/`itineraries` y `temas`/`topics`. Con eso,
  `resolverRutaPublica` traduce el inglés al árbol en español sin cambios propios.
- `rutas.itinerario(l, slug)` y `rutas.tema(l, slug)` son la única fuente de estas URLs.
- Las cuatro palabras entran a `SLUGS_RESERVADOS_ZONA`, así que la validación de Zonas las rechaza desde ese momento.
  Hoy ninguna zona usa esos slugs: no hay producción y el seed solo tiene La Paz, La Ventana y similares. Si el
  deploy ocurre antes, el plan agrega una comprobación con `payload run` que lista las zonas en conflicto, para
  renombrarlas antes de publicar.
- **No hay página de listado** (`/es/guia/itinerarios` da 404 por el `[...resto]` de siempre). Los dos tipos se
  enlazan desde la zona, la portada, la ficha y la búsqueda (2.6). Un listado con pocos elementos sería contenido
  delgado.
- Los dos son ISR (`revalidate = 3600`, `generateStaticParams = () => []`), con el mismo patrón de 404 y redirección
  de la ficha: `NoEncontradoEnSuspense`.
- `tipoDePagina` (spec de presencia) los trata como `otra`. La barra de tours toma como zona de contexto la del
  documento (2.2 y 2.3), igual que en un artículo.
- **La barra y la tarjeta de presencia ponen primero los tours del plan,** igual que hacen en la ficha con los
  relacionados (`PresenciaTours`, con `relacionadosVisibles`):
  - en un itinerario, los tours distintos de sus paradas;
  - en un tema, los de `tours` cuya zona es la zona de contexto.

  Las tarjetas de lista (`TarjetaItinerario` y `TarjetaTema`) llevan esas claves, como `TarjetaLugar` lleva
  `toursRelacionados`.
- La imagen Open Graph usa `TipoOg` nuevos, `itinerario` y `tema`, con el mismo generador.

### 2.2 Itinerarios

**Campos:**

- `titulo` (es/en), `slug` (es/en), `zona` (obligatoria, una sola), `resumen` (es/en, máximo 160), `portada`
  (Media, opcional), `cuerpo` (es/en, introducción, con los mismos bloques que Artículos, incluido «Tour»), `autor`,
  `publicadoEl` y `actualizadoEl` (como en Artículos).
- `dias`: lista de 1 a 7. La estructura es la misma en los dos idiomas y los textos van localizados dentro de ella.
  Cada día lleva:
  - `titulo` (es/en, opcional), por ejemplo «Balandra y El Tecolote». Sin título en un idioma, el encabezado es
    solo «Día {n}».
  - `paradas`: lista de 1 a 8. Cada parada lleva:
    - `hora` (texto opcional, `HH:MM`, validado).
    - `lugar` (relación opcional a Lugares).
    - `tour` (clave opcional `servicio:slug` o `paquete:slug`), con el selector del paquete 1.
      - La zona no es un campo hermano: es la `zona` del documento. El selector recibe la opción `rutaZona: 'zona'`,
        una ruta absoluta en el formulario. El paquete 1 define esa opción.
      - Si en el formulario anidado no se puede leer la ruta absoluta, el campo queda como texto con su validación,
        la misma salida de emergencia del paquete 1 §2.1.
    - `nota` (es/en, texto largo opcional, máximo 400).
  - Una parada necesita al menos uno de `lugar`, `tour` o `nota`. La regla solo se valida al guardar en `es`, el
    idioma fuente; el admin rechaza la parada vacía ahí. Al guardar en `en`, una parada con nota solo en español
    pasa: la página en inglés ya la oculta. Así una corrección en el `resumen` en inglés nunca queda bloqueada por
    notas sin traducir.
- `lugaresCitados` (oculto): los lugares de las paradas y de los bloques «Tarjeta de lugar» del cuerpo, en los dos
  idiomas. Lo llena un hook al guardar, igual que en Artículos.
- `preguntas`: el mismo campo de preguntas frecuentes del paquete 1 (es/en, hasta 8).

**Regla de idioma:** la misma de Artículos. El itinerario existe en un idioma si en ese idioma tiene `titulo`,
`resumen` y `cuerpo`, con los `CAMPOS_IDIOMA` y `existeEnIdioma` de siempre, así que las redirecciones, el índice de
búsqueda, el sitemap y `contextoDe` no necesitan otra regla.

- Los textos de los días (`titulo` y `nota`) **no** deciden si el itinerario existe.
- Un día sin título en ese idioma se muestra como «Día {n}».
- Una parada cuya única cosa es una nota que falta en ese idioma no se pinta.
- Por eso, agregar un día en español no hace desaparecer la versión en inglés: esa versión muestra el día con su
  número, sus tarjetas de lugar y sus tours.
- La guía de editores pide traducir las notas.

**Página:**

- Migas: Guía › {zona} › {titulo}.
- Cabeza: portada (si hay), título, resumen, «{n} días en {zona}», autor y «Actualizado el».
- El cuerpo de introducción.
- Un bloque por día, con su título como `<h2>` («Día 1: Balandra y El Tecolote»), y cada parada en orden:
  - La hora, si hay.
  - Si tiene `lugar` existente en el idioma, su tarjeta (la de «Tarjeta de lugar» del artículo). Si el lugar no
    existe en ese idioma o ya no está publicado, solo se omite la tarjeta: la parada sigue con su nota.
  - Si tiene `tour` y está en el catálogo, la tarjeta de tour del paquete 1, con pieza `itinerario-{slug}-dia{n}` y
    `data-origen="itinerario"` (origen nuevo de `tour_clic`). Si el tour ya no está o el catálogo está caído, se
    omite la tarjeta.
  - La nota, en texto.
  - Una parada que se queda sin nada que mostrar no se pinta.
- **«Reserva los tours de este plan»:** al final, la lista de los tours distintos del itinerario que sí están en el
  catálogo, en orden de aparición, con pieza `itinerario-{slug}-resumen` y el mismo origen. Si no hay ninguno, no hay
  sección.
- Las preguntas frecuentes, si hay.
- **Enlaces automáticos** (paquete 1) en el cuerpo y en las notas:
  - Cada nota se envuelve como un párrafo Lexical mínimo, para pasar por el mismo algoritmo.
  - `enlazarMenciones` recibe la lista de cuerpos en orden de lectura: el cuerpo de introducción y luego las notas,
    día por día y parada por parada. El paquete 1 define que la función acepta varios cuerpos que comparten un solo
    presupuesto, así que «la primera mención» y el máximo de 10 cuentan para todo el itinerario.
  - Todo lugar que aparece como tarjeta de una parada se trata como si ya tuviera una «Tarjeta de lugar»: nunca se
    enlaza automáticamente.
- **JSON-LD:**
  - `TouristTrip` con `name`, `description`, `url` e `itinerary`. El `itinerary` es un `ItemList` con, por cada
    parada con lugar, su `TouristAttraction` (`name` y `url` de la ficha) en orden.
  - El `ItemList` de `TouristTrip` del paquete 1 para los tours.
  - `BreadcrumbList` y, si hay preguntas, `FAQPage`.

### 2.3 Temas

**Campos:**

- `titulo` (es/en), que es el `<h1>`: «Tours y planes con niños en La Paz».
- `slug` (es/en), `zona` (opcional; sin zona, el tema es de toda la Baja), `resumen` (es/en, máximo 160), `portada`
  (opcional) e `introduccion` (texto enriquecido es/en, con los bloques de Artículos).
- `autor`, `publicadoEl` y `actualizadoEl`, con el mismo hook `fechasDePublicacion` de Artículos
  (`src/hooks/articulos.ts`).
- **Regla de idioma:** `titulo`, `resumen` e `introduccion`, igual que en Artículos.
- **Criterios para armar la lista de lugares** (todos opcionales; si se llenan varios, se combinan con «y»):
  - `categorias` (varias relaciones; cualquiera de ellas).
  - `caracteristicas` (varias, de la lista de Lugares; todas a la vez).
  - `servicios` (varios, de la lista de visita del paquete 1; todos a la vez).
- `lugaresFijos` (relación a Lugares, hasta 12): los que el editor quiere sí o sí, primero y en su orden.
- `tours`: lista de hasta 6 filas `{ zona, tour }`, como el bloque «Tour» del paquete 1, que lleva su propia zona.
  - El selector toma la zona del campo hermano de su fila.
  - Así, un tema sin zona («Planes en pareja en la Baja») puede tener tours de varias sedes.
  - La zona de la fila debe tener sede; el admin lo rechaza si no.
- `preguntas` (como en el paquete 1).

**Lista de lugares:**

1. Los `lugaresFijos` que existen en el idioma, en su orden.
2. Luego, los que cumplen los criterios, de la zona (o de todas las zonas activas si no hay zona), sin repetir, con
   el orden de los listados (spec principal §7, patrocinio incluido).
3. Máximo 24 en total y sin paginación.
4. Sin ningún criterio, la lista es solo `lugaresFijos`.

**Página:**

- Migas: Guía › {zona} › {titulo}, o Guía › {titulo} sin zona.
- Cabeza: título, resumen y portada.
- La introducción.
- «Tours para este plan»: los `tours` que siguen en el catálogo de su sede, en su orden, con la tarjeta del paquete 1,
  pieza `tema-{slug}` y `data-origen="tema"` (origen nuevo).
  - Cada sede se lee con `toursDeSede`, con su caché y su manejo de errores. Una sede caída solo quita sus filas.
  - Si no queda ninguno, no hay sección.
  - Sin `tours` y con zona, se muestra en su lugar «Tours en esta zona» (formato riel).
- La lista de lugares con `TarjetaLugar`.
- Las preguntas frecuentes.
- Hasta 3 itinerarios y artículos de la misma zona, como «Para planear».
- **JSON-LD:** `ItemList` de los lugares, `ItemList` de `TouristTrip` para los tours, `BreadcrumbList` y `FAQPage`
  si hay preguntas.

**Indexable** solo si la lista de lugares tiene al menos 3 lugares en ese idioma (el mismo `UMBRAL_INDEXABLE` de
las combinaciones), además de las reglas de siempre (`GUIA_INDEXABLE` y `noIndexar`). Con menos, la página existe con
`noindex` y no entra al sitemap.

**Aviso para el editor:** un campo virtual de solo lectura, `lugaresQueCoinciden`, muestra en el admin cuántos lugares
tiene la lista en cada idioma y si la página se indexa («es: 5, se indexa · en: 2, no se indexa»).
- Se calcula en un `afterRead`.
  - En Payload, los hooks de campo corren **antes** de revisar el acceso de lectura. Por eso el hook termina de
    inmediato cuando `!esPersonal(req.user)`, y además `access.read` es `campoSoloPersonal`. Así el público no lo
    dispara ni lo recibe.
  - Usa el documento guardado, así que se actualiza al guardar, no al cambiar un criterio en el formulario. No hay
    endpoint nuevo.
- Sale de la misma función pura `lugaresDeTema(tema, listas, lang)` que usan la página y el sitemap.
  - En el hook, las listas se leen con los lectores **sin caché**, con `req.payload`: `lugaresPublicados(req.payload,
    lang)` y `zonasActivas(req.payload, lang)` (`src/sitio/datos/lecturas/`). Aplican las mismas reglas públicas que
    las versiones cacheadas.
  - El hook **no** importa `src/sitio/datos/cacheadas`, por dos razones: `unstable_cache` falla fuera de una petición
    de Next, y crearía un import circular con `payload.config`.
  - Las listas se guardan en `req.context` por idioma, para que la vista de lista del admin las lea una sola vez y
    no una por fila.
  - Por eso el número del admin y lo que se indexa nunca difieren.
- `TarjetaLugar` suma `servicios` (del grupo `visita` del paquete 1) para que la función pueda filtrar por servicios.

### 2.4 Sin choque con las páginas de filtros

Un tema como «Restaurantes para niños en La Paz» se parece a `/es/guia/la-paz/restaurantes?caracteristica=para-ninos`.
No compiten:

- La variante con filtros sigue con `noindex` y canónica a la categoría.
- El tema tiene canónica a sí mismo, texto propio y tours.

Para que la gente encuentre el tema desde el filtro, la variante con filtros muestra arriba «Hay una guía sobre esto:
{titulo del tema}». Sale cuando existe un tema publicado en ese idioma con la misma zona, exactamente esa categoría y
exactamente esa característica, y sin servicios. La variante con filtros ya es dinámica, así que esto no cambia su
caché.

### 2.5 Revalidación

- Etiquetas nuevas: `itinerario:{id}` y `tema:{id}`. Las llevan su página y las páginas que muestran su tarjeta.
- Los hooks `afterChange` y `afterDelete` de las dos colecciones revalidan su etiqueta, `listados`, la de su zona y
  `lugar:{id}` de cada lugar citado (por «Aparece en», 2.6). Al quitar un lugar del itinerario también se revalida
  ese lugar: el hook compara con `previousDoc`.
- Las páginas leen los listados de lugares con la etiqueta `listados` que ya existe. Un lugar nuevo que cumple los
  criterios de un tema aparece en el tema cuando se revalida `listados`.
- **Redirecciones,** como en Artículos:
  - un cambio de slug crea la redirección del slug viejo al nuevo;
  - despublicar o borrar un documento lo manda a su zona, o a la portada si no tiene zona.

### 2.6 Dónde se enlazan

- **Zona:** sección «Planes en {zona}» después de los artículos, con hasta 6 itinerarios y temas de la zona
  publicados en ese idioma: primero los destacados en portada, luego por `actualizadoEl`, del más nuevo al más viejo.
  Las tarjetas de itinerario dicen «{n} días».
- **Portada:** los destacados entran a la sección de destacados como los artículos. Además, la sección «Planes en la
  Baja» lista hasta 6 temas **sin zona**, publicados e indexables en ese idioma, con el mismo orden de «Planes en
  {zona}». Así un tema de toda la Baja armado por criterios tiene un enlace interno fijo.
- **Zona (además de lo anterior):** «Planes en {zona}» también incluye los temas sin zona cuya lista de lugares
  (`lugaresDeTema`) tiene lugares de esa zona. Van después de los de la zona, dentro del mismo máximo de 6.
- **Ficha del lugar:** «Aparece en» incluye, además de los artículos:
  - los itinerarios que lo citan en `lugaresCitados`;
  - los temas cuya lista `lugaresDeTema` lo contiene.

  Para los temas se calcula en la página con las listas que ya tiene en memoria. Lo mantiene al día la revalidación de
  `listados`.
- **Búsqueda:** dos tipos nuevos en el índice, `itinerario` y `tema`, que se muestran juntos en un grupo nuevo,
  «Planes», después de «Artículos». No tienen filtro `?tipo=`. El índice tiene su texto: título, resumen, títulos de
  día y notas.
  - Hooks de indexado como los de Artículos (`src/busqueda/`).
  - La migración de búsqueda escrita a mano (`scripts/migraciones/busqueda.ts.txt`) se revisa por si su SQL depende
    de la lista de tipos.
  - **Todo lo que lee el índice conoce los dos tipos nuevos**, y ninguno cae en el caso de «categoría» por omisión:
    - `visibles` y el armado de URLs de `buscar/page.tsx`;
    - `buscar/sugerencias/route.ts`;
    - `src/busqueda/filas.ts`.

    Las sugerencias de la cabecera sí muestran itinerarios y temas, con su URL.
- **Sitemap:** las versiones indexables, con sus alternos indexables.
- **Selector de idioma y puente a reservas:** `contextoDe` (`src/sitio/contexto.ts`) resuelve los dos tipos nuevos:
  el documento en el otro idioma y su zona.
- **Contrato v1:** no cambia. El endpoint 8.2 sigue con artículos y eventos.

## 3. Datos y migraciones

- Dos colecciones nuevas, más los tipos nuevos de `indice-busqueda` y los campos ocultos `lugaresCitados`.
- Si para entonces no hubo deploy a producción, se rehacen las dos migraciones con
  `npm run migracion:regenerar -- --no-hay-deploy`. Si ya lo hubo, va una migración nueva.
- **Acceso:** lectura pública solo de lo publicado; crear, editar y borrar, solo el personal (`src/acceso/reglas.ts`).
  `lugaresCitados` es de solo lectura en el admin.
- **Seed:** datos inventados.
  - Un itinerario de 2 días en La Paz con lugar, tour y nota.
  - Un tema «con niños» en La Paz con 3 lugares, para que se indexe.
  - Un tema sin zona con menos de 3 lugares, para que lleve `noindex`.
- **Documentación:**
  - Spec principal: secciones 6, 7, 9, 10 y 13 (orígenes `itinerario` y `tema`).
  - Guía de editores: cuándo conviene un itinerario y cuándo un tema; cómo saber si un tema se va a indexar.

## 4. Fallos y casos raros

| Caso | Qué pasa |
|---|---|
| Catálogo caído | Sin tarjetas de tours ni la sección del resumen. El plan se lee completo. |
| Lugar de una parada despublicado | Se omite su tarjeta. Su ficha redirige como siempre. |
| Tema con criterios que ya no encuentran lugares | Muestra los fijos. Con menos de 3, `noindex`. |
| Zona del documento desactivada | La página da 404, como un lugar de una zona inactiva (spec principal §6). |
| Itinerario con un día sin textos en inglés | La versión en inglés existe: muestra «Day {n}» con sus tarjetas de lugar y tours. |
| Tema sin zona con tours de dos sedes, una caída | Solo se muestran los tours de la sede que respondió. |
| Slug de zona igual a un segmento nuevo | La validación lo rechaza (ver 2.1). |

## 5. Pruebas y criterios de aceptación

- **Unitarias:**
  - La lista de lugares de un tema: fijos, criterios con «y», sin repetir, máximo 24 y patrocinio.
  - El día sin título y la parada con nota faltante en un idioma.
  - El resumen de tours: distintos y en orden.
  - `resolverRutaPublica` con los segmentos en inglés.
  - Las entradas nuevas del sitemap.
  - `contextoDe` con los tipos nuevos.
- **Integración:**
  - Las validaciones: parada vacía, `hora`, `tours` sin zona y los límites.
  - El hook de `lugaresCitados` y su revalidación, incluida la del lugar que se quita.
  - El acceso público de borradores.
  - El indexado de búsqueda, y que las sugerencias de un término que coincide con el itinerario del seed responden 200
    con su URL de itinerario.
  - Las redirecciones al cambiar el slug.
  - Los campos localizados dentro de listas que no se localizan:
    1. guardar en español, luego en inglés;
    2. reordenar y agregar un día en español;
    3. comprobar, fila por fila, el `titulo` y la `nota` de los dos idiomas;
    4. restaurar una versión y comprobar que se conservan los dos idiomas;
    5. comprobar que `lugaresCitados` sale de la última versión con `locale: 'all'`.
  - Que `lugaresQueCoinciden` no llega a una lectura pública, que su hook no lee nada sin usuario del personal y que
    coincide con lo que indexa el sitemap.
  - Parada vacía: rechazada al guardar en `es`. Parada con nota solo en español: el guardado en `en` pasa.
- **E2E (modo indexable):**
  - El itinerario del seed en los dos idiomas, con días, tarjetas, la pieza de atribución y el JSON-LD `TouristTrip`
    con su `itinerary`.
  - El tema con 3 lugares es indexable y está en el sitemap; el de menos de 3 lleva `noindex` y no está.
  - «Planes en La Paz» en la zona.
  - «Aparece en» de la ficha.
  - El aviso «Hay una guía sobre esto» en la variante con filtros.
  - La búsqueda encuentra el itinerario.
  - `/es/guia/itinerarios` da 404.
  - El ISR da `HIT` en la segunda visita de las dos páginas.
- **E2E (modo no indexable):** las dos páginas llevan `noindex`.
- **Rendimiento:** el criterio del spec de presencia §5, medido además sobre la página del itinerario contra la ficha
  como referencia de tamaño (LCP sin pasar de la ficha + 100 ms).

## 6. Fuera de alcance

- Mapa del itinerario con su ruta dibujada: va en el paquete 3 si se pide.
- Itinerarios de varias zonas: uno por zona; un viaje que cruza zonas son dos itinerarios enlazados en el cuerpo.
- Páginas de tema generadas automáticamente por combinación: las arma siempre un editor, para no producir contenido
  delgado.
- Lo excluido por el dueño y lo que toca al sitio de reservas: igual que el paquete 1, §6.

---
Status: APPROVED
Critic verdict: Los tres puntos de la segunda revisión quedaron resueltos de forma consistente con el código (conteo del admin con lectores sin caché y salida temprana sin personal, parada vacía validada solo en es, enlaces internos a temas sin zona) y no hay contradicciones nuevas con el paquete 1.
