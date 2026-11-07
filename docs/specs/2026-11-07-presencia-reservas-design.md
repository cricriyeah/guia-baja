# Más presencia de las reservas en la Guía

Fecha: 2026-11-07. Extiende `docs/specs/2026-10-30-guia-baja-design.md` (el «spec principal»). Donde este
documento no dice nada, manda el spec principal.

## 1. Problema

La Guía existe para captar búsquedas (Google, Bing y asistentes de IA como ChatGPT o Gemini) y llevar a esas
personas a reservar en el sitio de reservas. Hoy las reservas aparecen en la cabecera («Tours en {zona} →»), en
la banda de video de la portada de zona y en el bloque «Tours en esta zona» (zona, categoría en zona, lateral
de la ficha y bloque de artículo). Faltan en eventos y búsqueda, en móvil quedan lejos del pulgar, y la ficha
de un lugar no dice qué tour lleva a ese lugar, que es la pregunta de quien lo buscó.

**Meta:** subir `tour_clic` por visita (meta del spec principal §13: 3 % o más) sin bajar el ranking ni empeorar
las métricas de la sección 9 del spec principal.

**Fuera de alcance:** cambios en el sitio de reservas o en su API; el contrato `/api/publico/v1`, que no
cambia; y todo lo que Google trata como intersticial intrusivo (abajo).

**Regla de Google que limita el diseño.** La guía de Google sobre intersticiales intrusivos castiga un popup que
tapa el contenido principal «justo después de llegar desde los resultados de búsqueda **o mientras se recorre
la página**», y permite los banners que usan «una cantidad razonable de la pantalla». Por eso nada de este
documento tapa el contenido de forma significativa en móvil en ningún momento: en móvil solo hay banners de
altura acotada (2.2), y la tarjeta flotante (2.3) existe solo en escritorio, donde ocupa una esquina pequeña.

## 2. Piezas

### 2.1 Tours relacionados de un lugar

**Dato.** Campo nuevo en Lugares: `toursRelacionados`, texto con `hasMany`, no localizado, hasta 3 valores.
Cada valor es la clave del tour tal como la arma `toursDe` en `src/dominio/catalogo.ts`: `servicio:{slug}` o
`paquete:{slug}`. Validación al guardar: solo el formato (`^(servicio|paquete):` más un slug válido de
`esSlugValido`) y el máximo de 3. No se valida contra el catálogo al guardar, porque el catálogo puede estar
caído; la lectura pública filtra (abajo).

Cambio de esquema según las reglas de `AGENTS.md`: como todavía no hay deploy a producción, se rehacen las
migraciones con `npm run migracion:regenerar -- --no-hay-deploy`; si para cuando se programe ya hubo deploy,
es una migración nueva que solo agrega.

**Admin.** El campo usa un componente propio en lugar del campo de texto: un selector múltiple con los tours
del catálogo de la sede de la zona elegida en el mismo formulario, cada uno con su nombre en español y su
precio «desde» para reconocerlo. Las opciones las da una ruta interna del admin, fuera de `/api/publico/v1`:

- `GET /api/guia/tours-de-zona?zona={id}` responde `[{ clave, nombre, precio }]`, donde `precio` es el texto
  «desde» ya formateado en MXN (por ejemplo `"$11,290 MXN por grupo"`) o `null`.
- Solo responde a un usuario del personal con sesión válida de Payload (misma regla que `soloPersonal`); a
  cualquier otro, `401`. No escribe nada.
- La zona se lee por id con la Local API e **incluye zonas inactivas** (una zona puede llenarse antes de
  activarse); no usa `zonasActivasCacheadas`. Zona que no existe: `404`.
- Lee el catálogo con la lectura cacheada que **lanza** ante un fallo (`catalogoCacheado` de
  `src/sitio/datos/cacheadas.ts`, que hoy no se exporta; se exporta) y arma la lista con
  `toursDe(items, 'es')`. No usa `toursDeSede`, que atrapa el error y devuelve `[]`, porque así no se
  distinguiría «catálogo caído» de «sede sin tours».
- Zona sin `sedeSlug`: lista vacía, y el componente dice «Esta zona no tiene sede en el sitio de reservas».
- Catálogo caído (la lectura lanzó): `503`. El componente dice «No se pudo leer el catálogo; los tours ya
  marcados se conservan» y muestra los valores guardados como texto, con opción de quitarlos pero no de
  agregar.
- Un valor guardado que ya no está en el catálogo de esa zona (tour desactivado, o el editor cambió la zona)
  se muestra marcado como «No está en el catálogo de esta zona» para que el editor lo quite. No se borra solo.

**Lectura pública.** `toursRelacionados` viaja en la ficha (`FichaLugar`) y en la lista de lugares que usa
`contextoDe`. Al pintar, se toman los tours de la sede (`toursDeSede`, en el idioma de la página) y se queda
con los que tienen una clave guardada, en el orden guardado. Las claves sin tour en el catálogo, o sin nombre
en ese idioma (regla de `toursDe`), se ignoran sin error. «Tours relacionados visibles» significa este
resultado ya filtrado.

**Ficha.** Si hay al menos un tour relacionado visible:

- En la columna principal, antes del cuerpo, una sección «Tours para conocer {lugar}» con una tarjeta por tour
  (foto de Fotos de tours si existe, nombre, precio «desde», duración o noches y «Reservar →»). El primero va
  en tamaño grande; el diseño exacto lo fija el plan con `docs/diseno/lineamientos.md`.
- Debajo de cada tarjeta, en texto visible y servido en el HTML (no depende de JavaScript, spec principal §9):
  «Para conocer {lugar}: {tour}, desde {monto} {moneda} {por}.» (`{por}` es el texto de `textos.tours.por`; si
  el tour no tiene precio, la frase termina en el nombre del tour). Es la frase que leen los buscadores y los
  asistentes.
- El bloque «Tours en esta zona» del lateral deja fuera los tours relacionados (sin repetir). Si al quitarlos
  queda vacío, no se pinta.
- Sin tours relacionados visibles, la ficha queda como hoy.
- Los links llevan `tour_clic` con `origen=relacionado` y `pieza=relacionado-{slug del lugar}`.

**Barra inferior de la ficha (móvil).** Hoy solo tiene «Cómo llegar» y solo aparece con coordenadas. Pasa a:

- «Cómo llegar» si el lugar tiene coordenadas (igual que hoy).
- «Reservar tour» **solo si el lugar tiene al menos un tour relacionado visible en ese idioma**, y lleva al
  primero. No hay respaldo a la página de la sede: así una ficha de restaurante, café o lugar patrocinado sin
  tours relacionados no pone un «Reservar» que compita con sus propios contactos ni se confunda con reservar
  en ese lugar. `tour_clic` con `origen=barra-ficha` y `pieza=barra-lugar-{slug del lugar}`.
- Sin ninguno de los dos botones, no hay barra.

### 2.2 Barra fija de tours (solo móvil)

- Visible en pantallas angostas (el mismo corte en el que hoy aparece `.barra-inferior` en `ficha.css`); en
  escritorio no existe, porque la cabecera ya trae el link a reservas.
- Va en todas las páginas de la Guía **excepto**: la ficha de lugar (tiene su barra, 2.1), «Aparece en la
  Guía» (formulario) y el aviso de privacidad.
- **Zona de la barra** (regla única, la misma para la tarjeta de 2.3 y para los bloques de 2.4):
  1. En el listado de eventos y en la búsqueda, si la URL trae `?zona={slug}` de una zona activa, esa zona.
  2. Si no, la zona que da `contextoDe` para esa ruta.
  3. Si es `null` (portada, listado de eventos sin filtro, categoría en todas las zonas, búsqueda sin filtro,
     404), la **zona principal**: la primera zona activa con `sedeSlug` según el orden de
     `zonasActivasCacheadas`.
  4. Si la zona resultante no tiene `sedeSlug` (una zona concreta sin sede, o ninguna zona activa con sede), la
     barra se comporta como el Puente: «Tours en la Baja →» a la portada del sitio de reservas, sin precio. No
     se cambia a la zona principal: la página es de esa zona.
- **Texto** (zona con sede): «Tours en {zona} desde {monto} por persona →». El precio es el más bajo entre los
  **servicios** (no paquetes: un paquete de varias noches no es un precio de entrada) con estrategia
  `por_persona` y precio, en la moneda del idioma (MXN en español, USD en inglés, mismo cálculo que
  `toursDe`). Si no hay ninguno, o el catálogo está caído, el texto es «Tours en {zona} →» sin precio. Nunca se
  compara un precio por grupo con uno por persona.
- **Destino:** la página de la sede (`rutasReservas.sede`) con `?desde=guia&pieza=barra-zona-{slug de la
  zona}`; `tour_clic` con `origen=barra` y `zona={slug de la zona}`. Con la regla 4, `pieza=barra-baja` y
  `zona` vacía.
- **Altura:** una fila, fija abajo, con `env(safe-area-inset-bottom)`. Como es `position: fixed`, no mueve el
  contenido (CLS 0). El contenido deja abajo un espacio igual a su altura para que el final no quede tapado.
  Al llegar al pie de página se esconde para no tapar sus links.
- **Fila extra (la versión móvil de la tarjeta de 2.3).** Con los mismos disparadores y la misma frecuencia de
  2.3, la barra crece una fila con el primer tour de la zona (nombre y precio «desde», sin foto) y una X para
  quitar esa fila. La barra completa nunca pasa del **20 % del alto de la pantalla**, contando la zona segura.
  Solo aparece en zonas con sede y con al menos un tour. Links con `origen=tarjeta` y
  `pieza=tarjeta-{slug de la zona}`.
- **Dónde se pinta.** No puede vivir dentro de la cabecera: `.barra` usa `backdrop-filter`, que vuelve a la
  cabecera el bloque contenedor de sus hijos `fixed`. Tampoco puede salir del layout: `LayoutGuia` solo
  recibe `lang`, y leer la ruta con `headers()` volvería dinámicas todas las páginas. Se pinta desde un
  **segundo slot paralelo** (nombre a elegir en el plan, p. ej. `@tours`), con la misma estructura que
  `@idioma`: `page.tsx`, `[...resto]/page.tsx` con `generateStaticParams = () => []`, y `default.tsx`. El
  layout lo pone fuera de la cabecera.
- **Contexto que necesita el slot.** `contextoDe` hoy devuelve `{ alterno, zona }`. Se extiende con el tipo de
  página (`ficha`, `formulario`, `privacidad`, `eventos`, `busqueda` u `otra`) y, en una ficha, los
  `toursRelacionados` del lugar. El slot lee `?zona=` solo en eventos y búsqueda, que ya son dinámicas; el
  resto de las páginas sigue siendo ISR.

### 2.3 Tarjeta de tours que aparece después (solo escritorio)

Una tarjeta pequeña, no modal, en la esquina inferior derecha (unos 340 px de ancho), para pantallas anchas
con puntero fino. En móvil no existe: su lugar lo toma la fila extra de 2.2.

- **Cuándo** (los mismos disparadores para la fila extra de 2.2): lo primero que ocurra de estos, nunca antes de
  5 segundos en la página:
  - la persona bajó a la mitad de lo que se puede bajar: `scrollY ≥ 0.5 × (scrollHeight − innerHeight)`.
    Solo cuenta si la página se puede bajar al menos un alto de pantalla
    (`scrollHeight − innerHeight ≥ innerHeight`); en una página más corta este disparador no existe;
  - solo en escritorio: el puntero sale de la ventana por arriba (intención de irse).
  Sin ninguno de los dos, no aparece. Nunca aparece solo por tiempo.
- **Nunca encima de otra capa.** No aparece mientras esté abierto el visor de fotos (`.visor`), o la hoja de
  búsqueda (`.busqueda.abierta`), y si alguno se abre mientras está visible, se esconde
  (sin contarlo como cierre). Va por debajo de esas capas en el orden de apilado. La tecla Esc la cierra solo
  si no hay otra capa abierta.
- **Frecuencia:** una vez por sesión del navegador. Se marca en `sessionStorage` en cuanto se muestra (no solo
  al cerrarse). Si `sessionStorage` no está disponible, se muestra a lo más una vez por carga de página. No
  guarda datos personales ni identificadores; no es una cookie.
- **Contenido:** título «Tours en {zona}», 2 o 3 tours (foto si existe, nombre, precio «desde») y «Ver todos
  los tours →». En la ficha de un lugar con tours relacionados visibles, esos van primero. La zona sigue la
  regla única de 2.2; con la regla 4 (sin sede) la tarjeta no aparece.
- **Cierre:** botón con la X (con `aria-label`), Esc (con la condición de arriba), o al hacer clic en un tour.
  No toma el foco al aparecer, no bloquea el scroll y no oscurece la página. Es un `<aside>` con su
  `aria-label`. Con `prefers-reduced-motion`, aparece sin animación.
- **Dónde no sale:** formulario y aviso de privacidad (en la ficha sí sale); ni cuando no hay tours que
  mostrar (catálogo caído, zona sin sede o sede sin tours).
- **Cómo se arma:** el HTML de la tarjeta se genera en el servidor con la página, oculto (`hidden`). El
  JavaScript que decide cuándo mostrarla (y el que esconde la barra de 2.2 al llegar al pie) es un módulo
  aparte que se carga con importación dinámica cuando el navegador queda libre (`requestIdleCallback`, o un
  `setTimeout` si no existe), no en el JavaScript inicial de la página. Las fotos van con carga diferida. Sin
  JavaScript la tarjeta nunca aparece y la barra queda visible.
- Si en el futuro la Guía muestra un aviso de consentimiento abajo, ni la tarjeta ni la fila extra aparecen
  mientras esté visible.
- Links con `tour_clic`, `origen=tarjeta` y `pieza=tarjeta-{slug de la zona}`.

### 2.4 Tours en evento y búsqueda

- **Evento:** si la zona del evento tiene sede, «Tours en esta zona» en formato fila (hasta 3) debajo del
  detalle. `origen=evento`, `pieza=evento-{slug del evento}`. Un evento que ya pasó también lo muestra.
- **Página de resultados de búsqueda** (`/es/guia/buscar`, `/en/guide/search`): debajo de los resultados (y
  también cuando no hay resultados), «Tours en esta zona» en formato fila (hasta 3), con la zona de la regla
  única de 2.2 (filtro `?zona=` o zona principal). Con zona sin sede, no se pinta. `origen=busqueda`,
  `pieza=busqueda`. La hoja de búsqueda de la cabecera no cambia.

### 2.5 Escribir para buscadores y asistentes

Documento nuevo para el equipo de contenido, `docs/editores/escribir-para-buscadores.md`, corto y práctico:

- Responder arriba y en una frase la pregunta que trae a la gente («A Espíritu Santo solo se llega en lancha
  desde La Paz»).
- Cuando un lugar se visita con un tour, nombrar el tour en el texto y marcarlo en «Tours relacionados» del
  lugar. El precio no se escribe: lo pone la ficha desde el catálogo, y un precio escrito a mano envejece.
- Datos duros en texto (horarios, distancias, temporada), nunca solo en una foto.

## 3. Medición

`tour_clic` suma los orígenes `relacionado`, `barra-ficha`, `barra`, `tarjeta`, `evento` y `busqueda` a los de
hoy (zona, lugar, artículo, categoría y cabecera). Las propiedades siguen siendo `zona` y `origen` (máximo 2,
spec principal §13); el detalle viaja en `pieza`, con prefijos que no chocan entre sí (`barra-lugar-…`,
`barra-zona-…`, `barra-baja`, `tarjeta-…`, `relacionado-…`, `evento-…`, `busqueda`). Se actualiza la lista de
§13 del spec principal en el mismo cambio. No hay evento nuevo de impresión de la tarjeta.

## 4. Fallos y casos raros

- **Catálogo caído o lento:** sin tours relacionados, sin tarjeta ni fila extra, sin bloques de tours, y la
  barra sin precio. La página carga normal y se registra el error, como en spec principal §8.1. Las páginas ya
  tienen `revalidate = 3600`.
- **Tour relacionado desactivado o de otra zona:** no aparece en el sitio; en el admin se marca para quitarlo.
- **Tour sin nombre en inglés:** no aparece en inglés (regla de `toursDe`); la ficha en inglés puede quedarse
  sin relacionados (y sin «Reservar tour») aunque en español los tenga.
- **Zona sin sede:** regla 4 de 2.2 en todas las piezas: la barra dice «Tours en la Baja →»; no hay tarjeta,
  fila extra, bloques de tours ni relacionados.
- **Código viejo con datos nuevos y al revés:** el campo nuevo solo se agrega; el código actual lo ignora y el
  código nuevo trata la falta del campo como lista vacía.
- **Patrocinio:** los tours no son patrocinios; no llevan «Patrocinado» ni `rel="sponsored"`.
- **Interruptor «Guía visible al público» (F5):** con la guía cerrada, estas piezas no se ven, porque la
  página entera no se ve.

## 5. Rendimiento y SEO

- **Intersticiales:** en móvil nada pasa del 20 % de la pantalla (2.2); la tarjeta de 2.3 es solo de
  escritorio, en una esquina, y nunca aparece solo por tiempo.
- **CLS:** la barra y la tarjeta son `position: fixed`; la fila extra crece hacia arriba dentro de un elemento
  fijo. CLS 0.
- **LCP.** El Lighthouse del CI ya está en rojo antes de este cambio (móvil simulado, mediana de 3, límite
  2.5 s): portada 2671 ms, zona `la-paz` 2912 ms, ficha 2755 ms, artículo 2667 ms (CI de `c60283d`). Ese rojo
  depende de la decisión pendiente sobre el LCP (medirlo en producción) y no lo resuelve este cambio. El
  criterio de aceptación de este cambio es **no empeorar**: en las mismas 4 páginas, mismo CI, el LCP no sube
  más de 100 ms ni el TBT más de 50 ms respecto a la corrida anterior al cambio. Para cumplirlo, la tarjeta y el
  JavaScript de la barra se cargan con importación dinámica en tiempo libre (2.3) y sus fotos son diferidas.
- La frase de relacionados y los bloques de tours se sirven en el HTML.

## 6. Pruebas

- **Unitarias:** filtrar y ordenar relacionados por clave (incluye claves viejas, sin nombre en inglés y
  catálogo vacío); precio de la barra (solo servicios `por_persona`, moneda por idioma, sin precio si no hay);
  la regla única de zona (filtro `?zona=`, contexto, zona principal, zona sin sede); validación del campo
  (formato y máximo 3); la lógica de cuándo mostrar la tarjeta y la fila extra (5 s, mitad de lo que se puede
  bajar, página corta sin disparador, salida por arriba, otra capa abierta, Esc, una vez por sesión, sin
  `sessionStorage`).
- **Integración:** `GET /api/guia/tours-de-zona` responde `401` sin sesión y con sesión de alguien que no es
  del personal, la lista (con `precio`) con sesión del personal, la lista para una zona inactiva, lista vacía
  para zona sin sede, `404` para zona inexistente y `503` con el catálogo caído.
- **E2E** con el catálogo falso (`scripts/catalogo-falso.mjs`, que suma un servicio `por_persona` activo):
  - ficha con relacionado: sección, frase en el HTML, lateral sin repetir y «Reservar tour» en la barra de
    móvil; ficha sin relacionados: sin «Reservar tour»;
  - barra en móvil en zona y en portada (zona principal), con `?zona=` en eventos, ausente en ficha,
    formulario y privacidad, y ausente en escritorio;
  - fila extra en móvil: aparece al bajar a la mitad y la barra no pasa del 20 % de la pantalla;
  - tarjeta en escritorio: no sale antes de 5 s, sale al bajar a la mitad, no sale con el visor abierto, se
    cierra con Esc, y no vuelve en la siguiente página de la misma sesión;
  - tours en evento y en búsqueda;
  - con el catálogo falso apagado, las páginas cargan sin tours y la barra sin precio;
  - las páginas siguen siendo ISR (`x-nextjs-cache: HIT`), como en `tests/e2e/tours.spec.ts`.
- **Lighthouse:** el criterio de «no empeorar» de la sección 5.
