# Paquete 3: «¿Qué tour es para mí?» y mapa con tours

Fecha: 2026-11-07. Estado: aprobado por el crítico.
Base: `docs/specs/2026-10-30-guia-baja-design.md` (spec principal), `docs/specs/2026-11-07-presencia-reservas-design.md`,
`docs/specs/2026-11-07-paquete-1-fichas-y-articulos-design.md` y `docs/specs/2026-11-07-paquete-2-itinerarios-y-temas-design.md`.
Se implementa después de los paquetes 1 y 2: usa la temporada de los tours (paquete 1) y la página de tema (paquete 2).

## 1. Problema

- **Quien llega no sabe qué tour elegir.** Una sede tiene muchos tours con nombres que el visitante no conoce
  («Espíritu Santo», «Tiburón ballena», «Snorkel con lobos marinos»). La lista de «Tours en esta zona» ordena por el
  catálogo y por temporada, pero no por lo que busca cada persona: viaja con niños o en pareja, quiere aventura o
  descansar, tiene medio día o varios. El indeciso se va sin reservar.
- **El mapa no dice qué se puede hacer con tour.** Las páginas de categoría en zona tienen un mapa con los lugares,
  pero el popup de cada lugar solo trae su nombre. Que a Espíritu Santo se llega con tour, y con cuál, no se ve.
- **`maplibre-gl` 5.6.0 tiene un aviso crítico de seguridad** (XSS, anotado en F3d). Este paquete toca el mapa, así
  que lo actualiza.

## 2. Qué se entrega

### 2.1 Perfil de los tours (dato que llena el editor)

El catálogo no dice para quién es cada tour. La colección «Fotos y temporadas de tours» (paquete 1) suma campos
opcionales:

- `paraQuien` (varios): `pareja`, `familia`, `amigos`, `solo`.
- `gustos` (varios): `mar-y-animales`, `aventura`, `playa-y-descanso`, `cultura-y-comida`.
- `jornada` (uno): `medio-dia`, `dia-completo` o `varios-dias`. Si falta, un paquete del catálogo cuenta como
  `varios-dias` y un servicio no tiene jornada.

Las listas se definen en código, como `CARACTERISTICAS`, con sus etiquetas en es/en. Un tour **tiene perfil** si
tiene al menos un `gusto`.

- `foto` ya es opcional desde el paquete 1, así que se puede dar perfil a un tour sin foto.
- La regla del paquete 1 que rechaza un registro vacío se amplía: un registro necesita foto, `meses`, `temporada` o
  algún dato de perfil.

### 2.2 «¿Qué tour es para mí?»

**Dónde:**

- En la página de zona, después de «Tours en esta zona», si la sede tiene al menos 3 tours con perfil en el catálogo
  visible.
- En la página de tema (paquete 2) con zona, con la misma condición.
- No en la portada. Ahí faltaría la zona, y preguntarla primero alarga el quiz.
- Nunca se abre solo. Es una sección más de la página, con su título; no es una capa encima ni un popup.

**Las tres preguntas**, una debajo de otra, cada una en un `<fieldset>` con su `<legend>` y botones de opción:

1. «¿Con quién viajas?»: en pareja, en familia con niños, con amigos, solo.
2. «¿Qué te gusta más?»: mar y animales, aventura, playa y descanso, cultura y comida.
3. «¿Cuánto tiempo tienes?»: medio día, un día completo, varios días.

El botón «Ver mis tours» se activa con la pregunta 2 contestada. Las otras dos ajustan el resultado, pero no hacen
falta.

**Cómo se elige**, con una función pura `puntuarTours(tours, respuestas, mesActual)`:

- **Solo cuentan los tours con perfil que tienen el gusto elegido.** El gusto es obligatorio; nunca gana un tour de
  otro gusto.
- Entre esos tours se suman puntos:
  - +1 si tiene el «para quién» elegido;
  - +1 si la jornada coincide;
  - +1 si está en temporada (paquete 1).
- Salen los 2 de más puntos. Un empate se resuelve por el orden de `toursDeSede`.
- Si ningún tour tiene ese gusto: «No encontramos uno exacto; mira estos tours en {zona}», con los 2 primeros tours de
  `toursDeSede`. No se dice que son los más pedidos: la Guía no tiene datos de reservas.

**Resultado:**

- Hasta 2 tarjetas de tour del paquete 1, con una línea de por qué salió («Para familias · mar y animales · en
  temporada»).
- Botón «Volver a empezar».
- Enlaces con pieza `quiz-{zona}` y `data-origen="quiz"` (origen nuevo de `tour_clic`).
- Si WhatsApp está activo (paquete 1), «¿Dudas? Pregunta por WhatsApp» con origen `quiz`.

**Cómo funciona sin cargar la página:**

- El servidor pinta el formulario y, ocultas con `hidden`, las tarjetas de dos grupos de tours, sin repetir:
  - todos los tours con perfil de la sede (a lo más 12, los primeros de `toursDeSede`);
  - los 2 primeros de `toursDeSede`, que son los del caso sin coincidencias.

  El perfil va en atributos `data-*` de cada tarjeta.
- **El módulo del quiz:**
  - Es pequeño, sin dependencias y de menos de 3 KiB comprimido.
  - Se descarga la primera vez que la persona toca el formulario (`pointerdown`, `focusin` o `keydown`), con el patrón
    de `activarTours` de presencia.
  - Lee los `data-*`, llama a `puntuarTours` y muestra las tarjetas que ganan. No pide nada al servidor.
- **«Ver mis tours» antes de que llegue el módulo:** un activador mínimo, el componente cliente que engancha la
  descarga, intercepta el clic del botón con `preventDefault` y espera al módulo hasta 3 s. Si llega, muestra el
  resultado. Si falla o tarda más, sigue el link. Así una persona rápida en una conexión lenta no sale de la página
  sin necesidad.
- **Sin JavaScript** (o si el módulo no carga), el botón es un link a la sede del sitio de reservas («Ver todos los
  tours en {zona}»), con pieza `quiz-{zona}-sin-js`. La página nunca queda sin salida.
- **El botón no lleva `data-evento`.** El listener de analítica escucha en captura y mandaría `tour_clic` antes del
  `preventDefault`, así que cada resultado mostrado contaría como clic a reservas. En cambio, el activador llama
  `track('tour_clic', { zona, origen: 'quiz' })` solo cuando de verdad sigue el link: el módulo falló o pasaron los
  3 s. Sin JavaScript no hay listener, así que en ese caso no se cuenta, igual que cualquier clic sin JS. Las tarjetas
  del resultado sí llevan sus `data-*` de siempre.
- Nada de esto lee la consulta de la URL, así que la página de zona sigue siendo ISR.
- El resultado se anuncia con una región `aria-live="polite"`. El foco pasa al título del resultado.

**Medición:**

- `quiz_resultado` (`zona`, `gusto`): el módulo del quiz llama directo a `track('quiz_resultado', { zona, gusto })` al
  mostrar el resultado. No pasa por los `data-*` del listener de clics. `EVENTOS` de `track.ts` lo agrega.
- Los clics en las tarjetas van como `tour_clic` con origen `quiz`, con sus `data-*` de siempre.
- Los dos eventos respetan el máximo de 2 propiedades (spec principal §13).
- **Para probarlo:** `enviarEvento` (`adaptador.ts`) también emite `window.dispatchEvent(new CustomEvent(
  'guia:evento', { detail: { evento, props } }))`. No envía nada fuera de la página y no lleva datos personales. Las
  E2E lo escuchan para comprobar qué eventos salen, sin depender de la herramienta de analítica.

**Admin:** si una sede tiene menos de 3 tours con perfil, la página de la zona no muestra el quiz. La guía de editores
explica cómo llenar el perfil en «Fotos y temporadas de tours».

### 2.3 Mapa con tours

**Dónde:**
- El mapa de la página «Categoría en zona», el único con varios puntos hoy.
- La página de tema **con zona** (paquete 2), que suma un mapa con las mismas reglas.
- Un tema sin zona no lleva mapa: mezcla lugares de varias zonas lejanas y necesitaría leer varias sedes por punto.

- Cada punto suma `tours`: los tours relacionados del lugar (`toursRelacionados`, spec de presencia) que siguen en el
  catálogo, a lo más 2, ya armados en el servidor con nombre, precio en texto y `href` con atribución
  `mapa-{zona}-{categoria}` (o `mapa-tema-{slug}`).
- **Marcador distinto, que no depende solo del color:** un lugar con tours lleva un elemento propio de `Marker`
  (`element`), hecho con nodos DOM.
  - Es el mismo pin azul con una insignia de texto «Tour» encima, en blanco sobre el color de acento con contraste AA.
  - El marcador por defecto de MapLibre, que es el de hoy, ya tiene un punto blanco al centro. Por eso no sirve como
    diferencia.
  - El marcador lleva `aria-label` «{nombre}, con tour disponible».
  - Una leyenda bajo el mapa muestra la misma insignia y el texto «Con tour disponible».
  - El popup repite la pista en texto, con la línea «Tours».
- El popup de ese lugar muestra el link a la ficha y, debajo, «Tours: {nombre}, desde {precio}», cada uno como link
  al sitio de reservas con `data-evento="tour_clic"`, `data-zona` y `data-origen="mapa"` (origen nuevo). El listener
  delegado de analítica (`src/sitio/analitica/escucha.ts`) ya atrapa los links creados después, porque usa
  `closest('[data-evento]')` sobre el documento.
- Los popups se siguen armando con nodos de texto y `href` asignado, nunca con HTML. El `href` se valida con
  `esEnlaceSeguro`, la misma regla de `CuerpoRico`, extraída a `src/dominio/enlaces.ts` para usarla en los dos.
- Los lugares sin tours se ven y funcionan igual que hoy.
- El catálogo caído deja los puntos sin tours y el mapa normal.
- **ISR:** el servidor arma los datos con lecturas cacheadas que ya existen (`toursDeSede`, etiqueta
  `catalogo:{sede}`).

### 2.4 Actualizar `maplibre-gl`

- **Versión exacta: 6.4.1.** Es la más baja que corrige GHSA-jrc7-96c5-q579, que afecta a `<=6.4.0`, toda la serie 5
  incluida. El «6.16.0» anotado en F3d estaba mal. No se toma la 6.17.0 que sugiere `npm audit` porque salió el
  2026-11-07 y no tiene uso todavía. Se confirma con `npm audit` al implementar.
- **Cambios que exige la 6:**
  - El paquete es solo ESM (`"type": "module"`, solo exporta `import`) y no tiene `export default`.
    `Mapa.tsx` deja de usar `({ default: maplibregl })` y usa los exports con nombre: `const m = await
    import('maplibre-gl')`, luego `m.Map`, `m.Marker`, `m.Popup`, `m.LngLatBounds` y `m.NavigationControl`.
  - **El worker es un archivo aparte** que la librería busca con `new URL('./maplibre-gl-worker.mjs',
    import.meta.url)`. Turbopack no lo emite, y detrás de `assetPrefix: '/guia-assets'` la ruta no existiría.
    - **Se copian dos archivos, juntos:** `maplibre-gl-worker.mjs` y `maplibre-gl-shared.mjs`. El worker empieza con
      `import … from "./maplibre-gl-shared.mjs"`; sin ese archivo al lado, el worker no arranca y el error es
      asíncrono, así que no lanza.
    - **Ruta con versión:** `public/guia-assets/maplibre/{version}/`, con la versión leída de
      `node_modules/maplibre-gl/package.json`. Así la caché del CDN nunca junta un worker viejo con un paquete principal
      nuevo.
    - El script es `scripts/copiar-worker-maplibre.mjs`. **Se llama desde los dos caminos de build:**
      - al principio de `scripts/build-vercel.mjs`, antes de `next build`, porque Vercel corre `npm run build:vercel`
        y no `prebuild`;
      - desde `prebuild` y `predev`, para `npm run build` (CI, E2E, Lighthouse) y `npm run dev`.
    - Si los dos archivos no existen después de copiar, el script termina con error y el build falla.
    - `Mapa.tsx` arma la misma ruta con la versión. La importa en tiempo de compilación desde un módulo generado
      junto con la copia (`src/sitio/ui/mapa-version.ts`, en `.gitignore`), o desde `maplibre-gl/package.json`. El plan
      elige uno, con prueba.
    - Antes de crear el mapa llama a `m.setWorkerUrl('/guia-assets/maplibre/{version}/maplibre-gl-worker.mjs')`.
      `/guia-assets/*` ya pasa por el rewrite del sitio de reservas (spec principal §4.1).
    - Los archivos copiados van en `.gitignore`.
  - Se revisan contra la guía de migración de la 6: `Map`, `Marker` (con `element`), `Popup.setDOMContent`,
    `LngLatBounds`, `NavigationControl`, `attributionControl` y la ruta del CSS.
- **Los fallos ya no se tragan:**
  - `Mapa.tsx` registra con `console.error` el fallo de importar la librería o del estilo, sin datos de la persona.
  - **Fallos duros**, solo estos tres:
    1. falla el import de la librería;
    2. el constructor de `Map` lanza (por ejemplo, sin WebGL);
    3. falla el estilo: un evento `error` sin `sourceId` ni `tile`, antes de `style.load`.

    Con un fallo duro se registra `console.error`, se quita el esqueleto, se quita el lienzo y vuelve a verse el texto
    de antes de activar el mapa (la dirección o «Ver mapa»). Hoy ese texto desaparece al activar el mapa y no vuelve.
  - **Fallos de una tesela, un sprite o un rango de glifos** (eventos `error` con `sourceId` o `tile`, o después de
    `style.load`): no son fatales. `console.warn` y el mapa sigue.
  - La decisión la toma una función pura, `clasificarErrorMapa(evento, estiloCargado)` → `'duro' | 'leve'`, con
    pruebas unitarias.
  - **Lento** (sin `load` a los 10 s): un worker roto no lanza, y una red móvil lenta también tarda. A los 10 s no se
    puede saber cuál de los dos es, así que:
    - se registra un `console.warn` («mapa sin cargar a los 10 s»), no un error;
    - se quita el esqueleto y se muestra el texto de respaldo **debajo del mapa, sin destruirlo**;
    - si `load` llega después, el texto de respaldo se oculta y queda el mapa.
- **E2E nuevas del mapa,** que hoy no existen y son requisito de este paquete:
  - En la ficha y en la categoría en zona, el mapa se inicia. El contenedor recibe `data-mapa-listo="1"` en el evento
    `load` de MapLibre.
  - Hay un `canvas`.
  - Al hacer clic en un marcador se abre su popup.
  - Para que esto corra en CI sin GPU:
    - Chromium arranca con `--use-angle=swiftshader` y `--enable-unsafe-swiftshader` (en `playwright.config.ts`, solo
      para el proyecto que prueba mapas).
    - `page.route` responde `tiles.openfreemap.org` con un estilo mínimo local (`tests/e2e/fixtures/estilo-mapa.json`),
      para no depender de un servidor externo. El estilo trae:
      - una fuente GeoJSON con un punto y una capa `circle`;
      - una capa `background`.

      El GeoJSON lo procesa el worker, así que `load` y `data-mapa-listo` **no pueden llegar si el worker no arranca**:
      la prueba detecta un worker roto.
  - Otra E2E bloquea con `page.route` los archivos del worker. Comprueba que, pasados los 10 s, se ve el texto de
    respaldo y sale el `console.warn`, y que nunca llega `data-mapa-listo`.
  - Otra E2E aborta una petición de tesela del estilo de prueba (que suma una fuente de teselas vectoriales local) y
    comprueba que el mapa igual llega a `data-mapa-listo="1"`.
  - Otra E2E retrasa 12 s la respuesta del estilo. Comprueba que a los 10 s se ve el texto de respaldo y que después el
    mapa termina con `data-mapa-listo="1"` y el texto oculto.
  - Una prueba del build comprueba que, después de `npm run build`, existen los dos archivos en
    `public/guia-assets/maplibre/{version}/`. `scripts/build-vercel.mjs` hace la misma comprobación.
- La dependencia ya existe, así que no hace falta justificarla como nueva. La razón de seguridad va en el mensaje del
  commit.

## 3. Datos y migraciones

- Campos nuevos en «Fotos y temporadas de tours»: `paraQuien`, `gustos` y `jornada`. Como en los paquetes 1 y 2, si
  no hubo deploy a producción se rehacen las migraciones previas; si ya lo hubo, va una migración nueva.
- **Seed:**
  - El catálogo falso de E2E suma un servicio activo en La Paz, «Kayak de prueba» (por persona). Con «Pesca de prueba» y
    «Ballenas de prueba» son 3 activos.
  - `tests/e2e/preparar.ts` deja 3 tours de La Paz con perfil en «Fotos y temporadas de tours», **sin foto**:
    - «Ballenas de prueba»: `mar-y-animales`, `familia` y `medio-dia`. Ya tiene registro del seed del paquete 1, con
      `meses`, así que se **actualiza** buscando por sede, tipo y slug, que forman un índice único.
    - «Pesca de prueba»: `aventura`, `amigos` y `dia-completo`. Se crea.
    - Un servicio nuevo del catálogo falso, «Kayak de prueba»: `playa-y-descanso`, `pareja` y `medio-dia`. Se crea.
  - Con eso, la E2E de «mar y animales» espera a «Ballenas de prueba» primero, y la de un gusto sin tours
    (`cultura-y-comida`) espera el texto de respaldo. No hace falta crear Media.
- `scripts/catalogo-falso.mjs` y `tests/e2e/preparar.ts` se actualizan con esos datos inventados.
- **Documentación:**
  - Spec principal §13: el evento `quiz_resultado` y los orígenes `quiz` y `mapa`.
  - Guía de editores: cómo llenar el perfil de los tours.

## 4. Fallos y casos raros

| Caso | Qué pasa |
|---|---|
| Catálogo caído | No hay quiz (no hay tours) ni tours en el mapa. La página carga normal. |
| Menos de 3 tours con perfil | No hay quiz en esa zona. |
| El módulo del quiz no carga | El botón sigue siendo un link a la sede del sitio de reservas. |
| Una sola respuesta (el gusto) | Funciona: puntúan gusto y temporada. |
| Dos tours con los mismos puntos | Gana el primero en el orden de `toursDeSede`; los dos tienen el gusto elegido. |
| Clic en «Ver mis tours» con el módulo aún bajando | Se espera hasta 3 s; después, el link a la sede. |
| Falla el import, lanza el constructor (sin WebGL) o falla el estilo | `console.error`, sin esqueleto ni lienzo, vuelve el texto de respaldo. La página sigue bien. |
| Falla una tesela, un sprite o un glifo | `console.warn`; el mapa sigue con lo demás. |
| Sin `load` a los 10 s (worker roto o red lenta) | `console.warn`, el texto de respaldo debajo del mapa sin destruirlo; si `load` llega después, se oculta el texto. |
| Tour relacionado que ya no está en el catálogo | No sale en el popup. |
| `sessionStorage` bloqueado | No aplica: el quiz no guarda nada. |

## 5. Pruebas y criterios de aceptación

- **Unitarias:**
  - `puntuarTours`: gusto obligatorio, puntos, desempate, sin perfil, temporada y respaldo sin coincidencias.
  - Jornada derivada de paquete y servicio.
  - `clasificarErrorMapa`: error del estilo antes de `style.load` (duro), error con `sourceId` o `tile` (leve) y error
    después de `style.load` (leve).
  - Armado de los puntos del mapa con tours y atribución.
  - `esEnlaceSeguro` en su módulo nuevo; las pruebas que ya tiene `CuerpoRico` siguen pasando.
- **E2E (indexable, catálogo falso):**
  - En La Paz, el quiz aparece. Al elegir «mar y animales» muestra los tours esperados con la pieza `quiz-la-paz`, y
    sale `quiz_resultado`, que se escucha con el evento `guia:evento`.
  - Con un gusto que ningún tour tiene, salen los 2 primeros tours con su texto de respaldo.
  - Con el chunk del módulo retrasado 1 s, «Ver mis tours» espera y muestra el resultado sin salir de la página.
  - En La Ventana (catálogo caído) no hay quiz.
  - Con el módulo bloqueado (`page.route` que aborta su chunk), el botón lleva a la sede.
  - En la categoría en zona, el popup del lugar con tour relacionado muestra el tour con `data-origen="mapa"`.
  - La zona sigue dando `x-nextjs-cache: HIT`.
- **Accesibilidad:** el quiz se puede usar entero con teclado, con nombres y leyendas leídos correctamente
  (`getByRole('radio', { name })`).
- **Rendimiento:** criterio del spec de presencia §5 en la página de zona (la que más cambia). El módulo del quiz no
  está en el JavaScript inicial: se comprueba que no aparece en las peticiones antes de la primera interacción.
- **Seguridad:** `npm audit --omit=dev` ya no reporta el aviso de `maplibre-gl`.

## 6. Fuera de alcance

- Guardar las respuestas o recomendar en otras páginas (no hay perfil del visitante).
- Quiz en la portada o con preguntas de presupuesto: el precio ya se ve en cada tarjeta.
- Mapa con la ruta del itinerario.
- Los otros avisos de `npm audit` (`sharp`, `happy-dom`): no los toca este paquete. Siguen anotados en F3d.
- Lo excluido por el dueño y lo que toca al sitio de reservas: igual que el paquete 1, §6.

---
Status: APPROVED
Critic verdict: §2.4, §4 y §5 ya coinciden con el comportamiento de MapLibre (fallos duros acotados, errores de teselas no fatales, cada camino con su prueba) y nada contradice a los paquetes 1 y 2, al spec de presencia ni al código.
