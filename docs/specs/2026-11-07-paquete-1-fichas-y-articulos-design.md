# Paquete 1: fichas y artículos que llevan a reservar

Fecha: 2026-11-07. Estado: aprobado por el crítico.
Base: `docs/specs/2026-10-30-guia-baja-design.md` (spec principal) y `docs/specs/2026-11-07-presencia-reservas-design.md`
(spec de presencia, ya implementado).

## 1. Problema

La Guía existe para que la gente que llega desde Google o desde un asistente de IA termine reservando un tour. Hoy:

- **El artículo no puede recomendar un tour concreto.** Un artículo como «Cómo ver tiburón ballena» solo tiene el
  bloque «Tours en esta zona», que lista los tours de la sede en el orden del catálogo. El tour del que habla el
  texto puede no salir.
- **La ficha no contesta las preguntas que la gente hace antes de ir.** En una playa o un sitio natural, lo que se
  busca es cuánto cuesta entrar, cómo se llega, cuánto se tarda, si hay sombra o baños y a qué hora conviene ir.
  La ficha solo tiene horario, rango de precio y tres características. Los asistentes de IA citan justo esos
  datos, y la ficha no los da.
- **No hay preguntas frecuentes en la ficha.** Solo existen como bloque dentro de un artículo.
- **Nada dice qué tour está en temporada.** La colección Fotos de tours guarda la temporada como texto libre
  («enero a marzo»). La Guía no sabe en qué meses aplica, así que no puede poner primero los tours de este mes.
- **Los tours no viajan como datos.** Precio y nombre están en el HTML, pero no en JSON-LD. Un buscador o un
  asistente no los lee como una oferta asociada al lugar.
- **Las menciones no enlazan.** Si un artículo dice «Balandra», el nombre enlaza a la ficha solo cuando el editor
  pone el link a mano. La ficha es donde está «Reservar tour».
- **Quien quiere preguntar antes de reservar no tiene a quién cerca de los tours.** El único WhatsApp del negocio
  está en el pie (`WHATSAPP_NUMERO`, spec principal §5.5), lejos de donde la persona decide, y su clic no se mide.

## 2. Qué se entrega

Siete piezas. Todas se pintan en el servidor y no agregan JavaScript al cliente.

### 2.1 Bloque «Tour» en artículos

- Bloque nuevo `tour` en el cuerpo de Artículos, junto a los cuatro que ya existen. Campos:
  - `zona` (relación a Zonas, obligatoria).
  - `tour` (texto, obligatorio): una clave `servicio:slug` o `paquete:slug`, el mismo formato de
    `toursRelacionados` (spec de presencia §2.1). Se valida con `esClaveDeTour`.
- **Selector en el admin:** el mismo componente de «Tours relacionados», en modo de una sola elección. Lee la zona
  del campo hermano y pide las opciones a `GET /api/guia/tours-de-zona?zona={id}`, que ya existe. Sus mensajes
  (sin zona, catálogo caído, zona sin sede, sin tours, clave que ya no está) son los mismos.
  - El componente encuentra el campo hermano a partir de su propio `path`: cambia el último segmento por `zona`.
    Así sirve igual en un documento (`zona`) y dentro de un bloque.
  - Acepta además la opción `rutaZona`, una ruta absoluta en el formulario (por ejemplo `'zona'`), para cuando la
    zona no es un campo hermano. El paquete 2 la usa en las paradas de un itinerario, que toman la zona del
    documento.
  - **Riesgo, se prueba primero:** que `useFormFields` vea el campo hermano dentro del formulario de un bloque
    Lexical. Si no lo ve, el campo `tour` queda como texto con su validación y una descripción que explica el
    formato. El sitio público no cambia.
- **En el sitio:** una tarjeta grande con foto (si la tiene en Fotos de tours), nombre, precio «desde», duración y
  temporada, más el botón «Ver tour».
  - Debajo de la tarjeta, una frase en texto plano para buscadores y asistentes: «{nombre}, desde {precio en texto}.»,
    con el mismo `precioEnTexto` de `PrecioTour.tsx` (por ejemplo «desde $11,290 MXN por grupo»).
  - Enlace: `{SITIO_URL}{ruta del tour}?desde=guia&pieza=tour-articulo-{slugArticulo}`, con
    `data-evento="tour_clic"`, `data-zona={slug de la zona}` y `data-origen="articulo"`.
    - Se usa el mismo origen que el bloque de zona porque `tour_clic` admite como máximo 2 propiedades; el detalle
      viaja en la pieza (spec principal §13).
    - El prefijo `tour-articulo-` no puede chocar con la pieza del bloque de zona (`articulo-{slug}`), ni aunque un
      slug termine en «-tour».
    - Varios bloques «Tour» del mismo artículo comparten la pieza. El tour exacto ya va en la URL de destino.
- **Cuándo no se pinta:** si la zona no existe para el público, no tiene sede, el catálogo está caído o la clave ya
  no está en el catálogo de esa sede. No se cambia por otro tour, no deja hueco y no rompe la página. El editor ve
  el aviso en el admin la próxima vez que abra el artículo.
- Un artículo puede tener varios bloques «Tour». Cada uno se pinta solo.

### 2.2 Preguntas frecuentes en la ficha del lugar

- Campo nuevo en Lugares: `preguntas` (lista, localizada es/en, hasta 8 filas), con `pregunta` (texto, máximo 120
  caracteres) y `respuesta` (texto largo, máximo 600 caracteres), las dos obligatorias.
- **En la ficha:** sección «Preguntas frecuentes» después de «Lo que hay que saber», con el mismo `<details>` del
  bloque de artículos (`.faq`). Sin preguntas en ese idioma, no hay sección.
- **JSON-LD:** `FAQPage` con `faqLd` (ya existe). Google solo muestra resultados enriquecidos de FAQ en sitios de
  gobierno y de salud; el marcado se pone igual porque lo leen Bing y los asistentes de IA, y no hace daño.
- **Regla de idioma:** las preguntas no cuentan para saber si el lugar existe en un idioma (siguen mandando el
  `resumen` y el `cuerpo`).

### 2.3 Datos de visita («Antes de ir»)

- Grupo nuevo en Lugares, `visita`, todo opcional. La descripción en el admin dice «Para playas y sitios naturales».
  - `costoEntrada` (texto es/en, máx. 120): «$100 MXN por persona; menores de 5, gratis».
  - `entradaGratis` (casilla): se usa cuando no hay costo. Si está marcada, el sitio muestra «Gratis» e ignora
    `costoEntrada`.
  - `minutosDesdeZona` (número entero, 1 a 600) y `medio` (lista cerrada: `auto`, `lancha`, `a-pie`, `4x4`).
    Juntos dan «45 min en auto desde La Paz». Uno sin el otro no se muestra, y el admin lo rechaza al guardar.
  - `comoLlegar` (texto largo es/en, máx. 600): indicaciones en texto.
  - `servicios` (varios, lista cerrada en código, como `CARACTERISTICAS`): `sombra`, `banos`, `regaderas`,
    `estacionamiento`, `renta-de-equipo`, `comida-cerca`, `sin-servicios`. `sin-servicios` no se puede combinar
    con otro; el admin lo rechaza.
  - `mejorHora` (texto es/en, máx. 160): «Temprano, antes de las 10; después se llena».
- **En la ficha:** sección «Antes de ir» como primera sección del `<article>`, antes de «Tours para conocer». Es una
  tabla de dos columnas (dato y valor), con texto real, sin iconos que reemplacen palabras. Solo aparecen las filas
  con valor. Sin ningún dato, no hay sección.
- **Arriba, en `.datos`:** si hay costo (o «Gratis») y tiempo, también salen ahí como chips, para que se vean sin
  bajar. La regla del spec principal §9 pide los datos duros arriba y en texto.
- **JSON-LD del lugar** (`lugarLd`): `isAccessibleForFree: true` con `entradaGratis`; `amenityFeature` con un
  `LocationFeatureSpecification` por servicio (`name` en el idioma de la página, `value: true`), salvo
  `sin-servicios`, que no se publica como servicio. `costoEntrada` no va al JSON-LD: es texto libre y no hay un
  campo de schema.org que lo describa sin inventar el número.

### 2.4 Temporadas de los tours

- Campo nuevo en Fotos de tours: `meses` (varios, lista cerrada de 1 a 12, con etiquetas «enero»…«diciembre»).
  Opcional. La colección pasa a llamarse en el admin «Fotos y temporadas de tours» (el `slug` no cambia).
- **`foto` deja de ser obligatoria**, para poder poner la temporada de un tour sin foto. El sitio ya pinta como
  tarjeta de texto un tour sin foto. Un registro sin foto, sin `meses` y sin `temporada` se rechaza al guardar,
  porque no aporta nada.
- **Texto de temporada:** si el editor escribió `temporada`, se usa ese texto. Si no y hay `meses`, el sitio lo
  arma solo con `mesesATexto(meses, lang)`:
  - Agrupa los meses consecutivos en rangos, contando que diciembre sigue a enero: `[11,12,1,2,3,4]` da
    «noviembre a abril».
  - Varios rangos se unen con «y»: `[1,2,7]` da «enero a febrero y julio».
  - Un mes solo da su nombre. Los 12 meses dan «todo el año».
- **En temporada** = el mes actual, en `America/Mazatlan`, está en `meses`. Un tour sin `meses` nunca está en
  temporada.
- **Efectos:**
  1. `toursDeSede` ordena primero los tours en temporada y deja el orden del catálogo dentro de cada grupo. Eso
     cambia el orden en todos lados a la vez: «Tours en esta zona», la barra y la tarjeta de presencia, eventos y
     búsqueda. Los tours relacionados de una ficha conservan el orden que eligió el editor (spec de presencia §2.1).
  2. Las tarjetas de tours en temporada llevan la etiqueta «En temporada» / «In season» junto al precio.
  3. Portada: sección «En temporada este mes» después de las zonas, con hasta 3 tours en temporada, tomados por
     zona en el orden de las zonas activas (un tour por zona mientras haya). Sin tours en temporada, no hay sección.
     Origen `tour_clic` = `zona`; la pieza es `portada-temporada`.
- **Cambio de mes:** las páginas tienen `revalidate = 3600`, así que el orden y la etiqueta cambian a lo más una
  hora después de medianoche del día 1. No hace falta un cron nuevo.

### 2.5 Tours como datos (JSON-LD)

- Cada bloque que pinta tours (ficha: «Tours para conocer» y «Tours en esta zona»; zona; categoría en zona;
  artículo: bloques «Tours en esta zona» y «Tour»; portada: «En temporada») agrega su propio JSON-LD: un
  `ItemList` de `TouristTrip`.
- Cada `TouristTrip` lleva:
  - `name` (el que se ve), `url` (el link al sitio de reservas, sin parámetros de atribución) e `image` (si la
    tarjeta tiene foto).
  - `offers`: un `Offer` con `url` y `priceSpecification`, que es un `UnitPriceSpecification` con:
    - `minPrice`: un **número**, nunca el texto con formato. En MXN es `Number(precioMxn)`; en USD es
      `aDolares(precioMxn, tipoCambio)`, el mismo cálculo que el monto que se ve.
    - `priceCurrency`: MXN en español, USD en inglés, como en la página.
    - `unitText`: la misma unidad que muestra la tarjeta, `textos.tours.por[estrategia]` en el idioma de la página
      (por ejemplo «por persona» o «por grupo»). Con `tarifa_fija`, cuyo texto de unidad está vacío, se omite la
      llave: nunca sale `unitText: ""`.

    Así un precio por grupo nunca se lee como precio por persona.
  - `provider`: `{ "@type": "Organization", "name": "Sun Baja", "url": SITIO_URL }`.
- **En la ficha, el tour queda asociado al lugar:**
  - `lugarLd` lleva `@id` = `{url absoluta de la ficha}#lugar`.
  - Cada `TouristTrip` de «Tours para conocer» lleva `itinerary: { "@id": "{url absoluta de la ficha}#lugar" }`.
  - Los de «Tours en esta zona» no, porque no son del lugar.
- Un tour sin precio en el catálogo, o con estrategia `por_ruta` (donde `precioDesde` da `null`), va sin `offers`.
- No se usa `Product`: los resultados de comerciante de Google piden envío, devoluciones y existencias, y aquí no
  aplican.
- Lo que se ve y lo que dice el JSON-LD sale de los mismos datos, así que nunca se contradicen.

### 2.6 Enlaces automáticos a las fichas

- Campos nuevos en Lugares:
  - `otrosNombres` (texto, varios, hasta 5, sin localizar): nombres con los que la gente conoce el lugar. Ejemplo: el
    lugar es «Playa Balandra» y `otrosNombres` lleva «Balandra».
  - `enlazarMenciones` (casilla, encendida por defecto). El editor la apaga cuando el nombre del lugar es una palabra
    común que aparece en otros textos con otro sentido («Rancho», «La Costa»).
- Función pura `enlazarMenciones(cuerpos, lugares, opciones)`. Recibe una lista de JSON de Lexical en orden de
  lectura y devuelve otra lista igual en la que las menciones son nodos `link` internos a `lugares`.
  - Todos los cuerpos de la lista comparten un solo presupuesto: «primera mención» y «máximo 10» cuentan para toda la
    página.
  - Una página normal pasa un solo cuerpo. El paquete 2 pasa el cuerpo y las notas de un itinerario.
  - `opciones.excluir` lleva ids de lugares que nunca se enlazan. Por ahí el llamador pasa el id del propio lugar
    (cuando el cuerpo es el de su ficha) y, en el paquete 2, los lugares que salen como tarjeta de una parada.
- El conversor de links de `CuerpoRico`, que ya existe, pinta esos nodos. No se guarda nada; se aplica al pintar.
- **Reglas:**
  - Busca el `nombre` y los `otrosNombres` de los lugares que existen en el idioma de la página (la lista del
    resolutor), con `enlazarMenciones` encendida y **sin patrocinio declarado**. Un lugar patrocinado nunca recibe
    un enlace automático desde texto editorial: el código no agrega enlaces a lugares pagados (spec principal §7).
    El editor puede enlazarlo a mano o con una «Tarjeta de lugar», que ya lleva su etiqueta.
  - Solo palabras completas: «Balandra» no coincide dentro de «Balandras».
  - No distingue acentos, ni mayúsculas después de la primera letra, pero **la primera letra de la mención debe ser
    mayúscula** en el texto: se enlaza «Balandra», no «balandra». Así una palabra común en minúsculas a media frase no
    se confunde con un nombre propio.
  - Gana la coincidencia más larga: «Playa Balandra» antes que «Balandra».
  - Solo enlaza la **primera** mención de cada lugar en toda la lista de cuerpos (la página).
  - No enlaza dentro de encabezados, dentro de un link que ya existe ni dentro de bloques.
  - **Antes de agregar ningún enlace,** la función reúne de **todos** los cuerpos de la lista los lugares que ya están
    enlazados a mano y los que tienen un bloque «Tarjeta de lugar». Ninguno de esos se enlaza automáticamente en
    ningún cuerpo, aunque la mención esté antes que el enlace manual.
  - No enlaza los lugares de `opciones.excluir`, entre ellos la propia ficha.
  - Un nombre de menos de 4 letras, o que comparten dos lugares, no se enlaza nunca.
  - Máximo 10 enlaces automáticos en toda la lista de cuerpos (la página).
  - Una mención partida entre dos nodos de texto (por ejemplo, la mitad en negritas) no se enlaza.
- **Dónde aplica:** cuerpos de artículos, eventos y lugares. No aplica al aviso de privacidad.
- `lugaresCitados` y «Aparece en» no cambian: siguen contando solo los bloques «Tarjeta de lugar».
- **Caché:** un lugar nuevo empieza a enlazarse en los artículos cuando se regeneran, a lo más en una hora
  (`revalidate = 3600`).

### 2.7 WhatsApp para preguntar por tours

- **El número es uno solo:** la variable `WHATSAPP_NUMERO`, que ya usa el botón del pie (spec principal §5.5; se
  lee con `whatsappNumero()` de `src/sitio/entorno.ts`). El dueño la pone en Vercel con el número del negocio; nunca
  va en el código ni en el seed. No se agrega otro campo de número.
- Campo nuevo en el global «Ajustes de la guía»: `whatsappToursActivo` (casilla, apagada por defecto). Solo prende y
  apaga los links nuevos; el botón del pie no depende de ella.
- Con `WHATSAPP_NUMERO` con 10 a 15 dígitos y la casilla encendida, aparece un link
  `https://wa.me/{dígitos}?text={mensaje}`, con `target="_blank"` y `rel="noopener"`, en estos lugares:
  1. **«Tours para conocer» de la ficha,** debajo de las tarjetas: «¿Dudas? Pregunta por WhatsApp». No sale si el
     lugar tiene patrocinio declarado, para no competir con los contactos de un negocio que paga.
     - Es el único lugar de la ficha donde sale. En el lateral, «Tours en esta zona» (formato fila) no lo lleva,
       porque ahí ya está el WhatsApp propio del lugar y la gente confundiría los dos.
  2. **«Tours en esta zona» en formato riel** (zona y categoría en zona), junto a «Ver todos».
  3. **La tarjeta de presencia** (escritorio), en su pie.
  4. **La barra fija del celular,** como botón cuadrado de solo icono a la derecha del link de tours, con
     `aria-label="Preguntar por WhatsApp"`. La barra sigue sin pasar del 20 % de la pantalla (spec de presencia).
- **Mensaje prellenado**, en el idioma de la página:
  - En la ficha: «Hola, vengo de la Guía ({nombre del lugar}). Quiero información de tours.».
  - En los demás lugares: lo mismo con el nombre de la zona de los tours. Es la que ya conocen la barra, la tarjeta
    y el riel; no se resuelve el título de cada página.
- **Medición:** evento nuevo `whatsapp_clic` (`zona`, `origen`: relacionado, zona, tarjeta, barra o pie).
  - El botón del pie también lo manda (sin `zona`). Hoy no lleva evento.
  - No es `contacto_lugar`: ese mide contactos con el negocio del lugar.
  - `track.ts` agrega el evento.
- **Privacidad:** la Guía no recibe ni guarda nada; es un link de salida. No cambia el aviso.
- Si se apaga la casilla, los links nuevos desaparecen al revalidar `ajustes` (el hook `revalidarAjustes` que ya
  existe). Si falta la variable, no sale ningún link de WhatsApp, igual que el pie hoy.

## 3. Datos y migraciones

- **Cambios de esquema:**
  - el bloque `tour`;
  - en Lugares: `preguntas`, el grupo `visita`, `otrosNombres` y `enlazarMenciones`;
  - en Fotos de tours: `meses`, y `foto` pasa a opcional;
  - en Ajustes: `whatsappToursActivo`.

  Todo es opcional o nuevo, y `foto` solo se relaja, así que no hay datos viejos que migrar.
- **Todavía no hay deploy a producción.** Se rehacen las dos migraciones previas con
  `npm run migracion:regenerar -- --no-hay-deploy`, como pide AGENTS.md. Si para cuando esto se implemente ya hubo
  un deploy, se hace una migración nueva con `npm run payload migrate:create`.
- `payload-types.ts` e `importMap.js` se regeneran (el CI lo comprueba).
- **Seed:** datos inventados para todo lo nuevo:
  - la playa del seed lleva visita, preguntas y `otrosNombres`;
  - un artículo lleva un bloque «Tour»;
  - «Fotos y temporadas de tours» tiene un registro sin foto para «Ballenas de prueba» (catálogo falso), con `meses` =
    el mes en que corre el seed, calculado al correr.
  - Otro lugar del seed tiene patrocinio declarado y `otrosNombres`, para probar que no se enlaza.

  `whatsappToursActivo` va apagado. `tests/e2e/preparar.ts` lo enciende, y el entorno de E2E (`scripts/entorno-e2e.mjs`)
  pone `WHATSAPP_NUMERO` con un número inventado (`5210000000000`).
- **Documentación:** se actualizan las secciones 6, 9 y 13 del spec principal y la guía de editores
  (`docs/editores/escribir-para-buscadores.md`): cómo llenar «Antes de ir», cuándo usar el bloque «Tour», cómo
  escribir preguntas y `otrosNombres`.

## 4. Fallos y casos raros

| Caso | Qué pasa |
|---|---|
| Catálogo caído | Ningún bloque de tours ni JSON-LD de tours. Las secciones de datos, FAQ y enlaces se pintan igual. |
| Bloque «Tour» con una clave que ya no existe | No se pinta. En el admin aparece «No está en el catálogo de esta zona». |
| Lugar sin datos en inglés | La sección «Antes de ir» en inglés muestra solo lo no localizado (tiempo y medio, servicios, «Gratis»). |
| Dos lugares con el mismo nombre alterno | Ese nombre no se enlaza. Las demás menciones sí. |
| `WHATSAPP_NUMERO` vacío o con menos de 10 dígitos | No sale ningún link de WhatsApp nuevo, aunque la casilla esté encendida. |
| Lugar con su propio WhatsApp | La ficha solo muestra el WhatsApp de tours dentro de «Tours para conocer», nunca en el lateral junto al del lugar. |
| Mes sin tours en temporada | Orden del catálogo y la portada sin sección. |
| `meses` vacío y `temporada` con texto | Se muestra el texto; el tour nunca está «En temporada». |

## 5. Pruebas y criterios de aceptación

- **Unitarias** (funciones puras):
  - `mesesATexto`: rango que cruza diciembre, varios rangos, un mes y todo el año.
  - `enTemporada` con la zona horaria de BCS, incluido el último día del mes a las 23:30.
  - El orden de `toursDeSede` con temporada.
  - `enlazarMenciones`:
    - primera mención, la más larga, sin acentos y palabra completa;
    - primera letra minúscula (no enlaza);
    - encabezados, links ya hechos, tarjeta del mismo lugar y propia ficha;
    - ambiguos, menos de 4 letras, máximo 10 y nodo partido;
    - lugar patrocinado y lugar con `enlazarMenciones` apagada (no enlazan);
    - dos cuerpos: si la primera mención está en el 1, el 2 no recibe enlace;
    - el máximo de 10 alcanzado entre dos cuerpos;
    - un lugar enlazado a mano en el cuerpo 2 no se enlaza solo en el cuerpo 1;
    - `excluir`.
  - `whatsappLink`: normalización, número inválido y mensaje.
  - `tourLd`:
    - un tour por persona, uno por grupo (con `unitText` «por grupo»), un paquete y uno `por_ruta` (sin `offers`);
    - en inglés, USD con `aDolares`;
    - con y sin `itinerary` hacia el lugar.
  - `lugarLd` con visita y con `@id`.
- **Integración** (Payload real):
  - Las validaciones de `visita` (tiempo sin medio, `sin-servicios` combinado).
  - `preguntas` (límites).
  - El registro de Fotos de tours vacío (rechazado) y sin foto con `meses` (aceptado).
  - El bloque `tour` con una clave mal formada.
  - Que el público lee `meses` y no lee nada nuevo que sea solo del personal.
- **E2E** (modo indexable, catálogo falso):
  - La ficha de la playa del seed muestra «Antes de ir», preguntas, `FAQPage` y `amenityFeature`.
  - El artículo muestra el bloque «Tour» con su pieza, y una mención enlazada a la ficha.
  - El tour en temporada sale primero, con su etiqueta, y aparece en la portada.
  - Hay `TouristTrip` con el precio que se ve.
  - Con WhatsApp encendido:
    - el link sale en «Tours para conocer», en el riel de zona, en la tarjeta y en la barra, y la barra sigue en
      ≤ 20 % de la pantalla;
    - una ficha con WhatsApp propio no lo muestra en el lateral;
    - el pie manda `whatsapp_clic`.
  - El lugar patrocinado del seed no recibe enlace automático.
  - Sin catálogo, la ficha carga sin tours.
- **Rendimiento:** el criterio del spec de presencia §5, con otra línea base.
  - **Antes de implementar,** se mide 01f2bae (presencia), que no se ha medido, en el banco del CI. Las páginas son
    las 4 de `scripts/lighthouse.mjs`: `/es/guia`, `/es/guia/la-paz`, `/es/guia/lugares/cocina-marea-alta` y
    `/es/guia/articulos/que-hacer-en-la-paz-prueba`.
  - Si presencia pasó del margen contra c60283d (+100 ms de LCP o +50 ms de TBT), se reporta al dueño y se corrige
    antes de empezar este paquete.
  - La línea base de este paquete es esa medición de 01f2bae, o el commit final del paquete 4 si termina antes
    (spec del paquete 4, §2.3). Este paquete no sube más de 100 ms de LCP ni más de 50 ms de TBT contra ella.
- **El ISR no se rompe:** la ficha, la zona y el artículo siguen dando `x-nextjs-cache: HIT` en la segunda visita.

## 6. Fuera de alcance

- El paquete 2 (itinerarios y páginas por intención), el 3 (quiz y mapa con tours) y el 4 (LCP) tienen spec propio.
- Excluidos por el dueño el 2026-11-07: «Hoy en La Paz», sello «Recomendado por la guía», boletín semanal y guía
  descargable.
- Lo que solo puede hacer el sitio de reservas (se anota en la sección 16 del spec principal para F5): opiniones y
  estrellas de los tours, disponibilidad, reporte de reservas por `pieza`, código de descuento para quien viene de la
  Guía y recordatorio al que no terminó de reservar.
- Retargeting: espera la decisión del dueño sobre analytics y el texto del aviso de privacidad.

---
Status: APPROVED
Critic verdict: El spec ya no tiene problemas críticos ni importantes; está listo para planear contra él (tercera revisión: precio numérico en JSON-LD, un solo WhatsApp, enlaces automáticos con presupuesto por página, `rutaZona` y línea base en 01f2bae).
