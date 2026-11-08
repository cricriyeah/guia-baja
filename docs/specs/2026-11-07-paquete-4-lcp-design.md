# Paquete 4: velocidad de carga (LCP)

Fecha: 2026-11-07. Estado: aprobado por el crítico.
Base: spec principal §9 y §11, el plan de F3d (`docs/superpowers/plans/2026-11-04-f3d-e2e-lighthouse.md`) y el estado
anotado al cerrar F3d.

## 1. Problema

- **La barrera de Lighthouse del CI está en rojo desde F3d.** El spec principal §11 pide LCP < 2.5 s (laboratorio,
  móvil simulado, mediana de 3). En GitHub Actions (corrida 42320723002, 2026-11-06) dio 2667 ms en `/es/guia`,
  2912 ms en `/es/guia/la-paz`, 2755 ms en la ficha y 2667 ms en el artículo.
  - FCP queda entre 914 y 1065 ms, TBT entre 25 y 32 ms y CLS en 0.
  - El plan de F3d prohíbe subir los umbrales.
- **El LCP pesa en la posición en Google.** Todo el trabajo de los paquetes 1 a 3 rinde menos si la página es lenta en
  celular. La meta de campo (Search Console) es LCP < 2.5 s.
- **El origen no está probado.** En F3d se probó, sin mejora suficiente:
  - `fetchpriority=high` en la imagen principal (se quedó);
  - un solo CSS (se quedó; ganó entre 0.1 y 0.3 s);
  - `decoding="sync"` (se quitó, no cambió nada);
  - `experimental.inlineCss` (se quitó, empeoró).
- **La pista abierta:** FCP simulado ≈ 1 s y LCP simulado ≈ 3 s, mientras que el LCP observado en localhost
  (≈ 600 ms) llega después de cargar el JavaScript. Eso sugiere que el modelo de Lighthouse (Lantern) cuenta unos
  170 KiB de JavaScript antes del LCP. Con throttling real de DevTools, además, el TBT es de 440 a 560 ms, aunque el
  simulado pase.
- **Mecanismos de opacidad 0 que tocan las imágenes LCP.** El elemento LCP probable de las 4 páginas es una imagen
  `prioridad`: la primera `Destacada` de la portada, la diapositiva activa del `Carrusel` en la zona, la primera foto de
  `Galeria` en la ficha y `.art-portada` en el artículo. Ninguna lleva `.entra`. Lo que sí las toca:
  - **(a)** `Efectos.fotoLista` (`src/sitio/ui/Efectos.tsx:48-51`) llama a `aparecer(img)` en el `load` de cada
    `img[data-img]`. Es un fundido desde opacidad 0, con WAAPI, sobre la propia imagen LCP, y solo existe después de que
    el JavaScript corrió. Encaja con «el LCP llega después de cargar el JS».
  - **(b)** `#contenido { animation: aparecer 180ms }` desde opacidad 0 en cada carga directa (`base.css:145`), sin
    JavaScript.
  - **(c)** `.js .entra` (`base.css:153`), que solo importa donde está arriba del pliegue. En estas 4 URLs no lo
    está: solo lo llevan tarjetas que van debajo de la imagen principal.
- **El artefacto posible del banco.** En Lantern (el simulador de Lighthouse), un script cuenta para el LCP simulado
  solo si terminó de bajar y empezó a evaluarse antes del LCP observado (`FirstContentfulPaint.js` de
  `@paulirish/trace_engine`, que usa `LargestContentfulPaint.js`). En loopback, los scripts `async` pueden bajar y
  evaluarse antes del primer pintado de la imagen aunque nada esté oculto. En ese caso, los ~170 KiB cuentan hagamos lo
  que hagamos en la página, y el resultado dice más del banco que del sitio.
- Del JavaScript inicial, el framework (`rootMainFiles` de `build-manifest.json`) pesa ~133 KiB comprimido. Lo propio
  de la app que se podría diferir es, a lo más, ~37 KiB.

## 2. Qué se entrega

Un trabajo en dos etapas. La segunda solo hace los cambios que la primera justifique con números.

### 2.1 Etapa 1: diagnóstico con números (no cambia el sitio)

En el banco de medición del CI que ya funciona (rama temporal con `push`, líneas `::notice::` legibles por la API
pública; anotado en F3d), para las 4 URLs de `scripts/lighthouse.mjs`, se registra lo siguiente.

**Punto de partida:** se mide el `main` actual (01f2bae o posterior, con presencia), que no se ha medido; los números
de F3d son de antes de presencia. Esa medición es la línea base de todos los paquetes (2.3).

1. **El elemento LCP** (`largest-contentful-paint-element`): qué es y su selector.
2. **Corridas de control,** solo en la rama de medición:
   - **Una por mecanismo,** cada una apagando solo uno, para atribuir la diferencia:
     - (a) sin `aparecer` en `fotoLista`;
     - (b) sin la animación de `#contenido`;
     - (c) sin la clase `js`;
     - (d) sin la animación de `.resultados-entran > *`.
   - **Una combinada,** con (a), (b), (c) y (d) apagados a la vez. Dos fundidos que se tapan entre sí no se ven
     apagando uno por uno.
3. **Las fases simuladas del LCP:** la segunda tabla de `largest-contentful-paint-element` (`LCPBreakdown` sobre
   Lantern, en Lighthouse 12.6.1 de `@lhci/cli` 0.15.1). `lcp-phases-insight` es observado sin throttling: se anota
   solo como referencia, no decide.
4. **Para detectar el artefacto,** medido sobre la corrida combinada:
   - de `metrics`, `observedLargestContentfulPaint` y `observedFirstContentfulPaint`;
   - por cada script, cuándo terminó su petición (`network-requests`) y cuándo empezó su primera evaluación.

   El reporte de LHCI no guarda la traza, y `main-thread-tasks` no trae URL. Por eso, en la rama de medición también se
   corre el `lighthouse` 12.6.1 ya instalado (`node_modules/.bin/lighthouse`) con `--save-assets`, y se leen los
   eventos `EvaluateScript` de la traza guardada.
5. **El JavaScript inicial por página,** con el framework (`rootMainFiles`) separado de los chunks de la app. Es el
   techo de bytes que podría quitar la opción (a) de la fila «Retraso de pintado por JS o fuentes» de la etapa 2.

**URLs extra fuera de la barrera.** Además de las 4 de `lighthouserc.json`, la etapa 1 y la medición de antes y
después de cada cambio de la etapa 2 cubren:
- `/es/guia/la-paz/restaurantes`, una categoría en zona del seed. En celular, la foto de portada de la categoría está
  oculta (`.portada-cat__fotos` debajo de 900 px), así que lo primero que se ve es la primera `TarjetaLugar`, que lleva
  `.entra` y está dentro de `.resultados-entran`.
- `/es/guia/eventos`.

No entran a `lighthouserc.json`, pero un cambio que las empeore se descarta.
6. **Las fuentes**: las que se precargan (`next/font/local` en `src/app/(sitio)/[lang]/layout.tsx`), sus bytes y si
   el elemento LCP es texto que espera la fuente.
7. **Cada medición se hace dos veces**: con throttling simulado (la barrera) y con `--throttling-method=devtools`
   (el real). En F3d los dos divergieron.

**Resultado de la etapa 1:** una tabla en `docs/rendimiento/lcp-2026-11.md` con esos datos por página y la fase que
domina. Esa fase decide qué se toca en la etapa 2. **No se cambia código del sitio en esta etapa.**

### 2.2 Etapa 2: cambios, según la fase que domine

Se aplican **solo** los de la fase que la etapa 1 marque como dominante, en este orden de costo y riesgo. Cada uno se
mide por separado contra la corrida anterior:

| Fase dominante | Cambios candidatos |
|---|---|
| La corrida combinada **no** baja el LCP **y** el punto 4, medido en esa misma corrida, muestra scripts evaluados antes del LCP observado | **Artefacto del banco.** No se cambia el sitio: los ~170 KiB cuentan en loopback hagamos lo que hagamos. Se documenta y se va directo a las opciones del dueño (2.3). |
| Retraso de pintado por un fundido (una corrida de control de la etapa 1 baja el LCP, o solo la combinada lo baja; en ese caso se quitan todos los de la combinada) | Se quita **solo** lo que la etapa 1 culpó, con (d) = `.resultados-entran > *` no se anima en la carga directa: (a) `fotoLista` no llama a `aparecer` sobre `img[data-img]` de las imágenes `prioridad` (las marca el atributo `fetchpriority="high"`, que ya ponen); (b) `#contenido` no se anima en la carga directa, solo al navegar (la animación al navegar la lanza `NavegacionConEsqueleto`, que no cambia); (c) `.entra` no se aplica a elementos arriba del pliegue en las páginas donde la etapa 1 lo encuentre. Las demás animaciones no cambian. |
| Retraso de pintado por JS o fuentes (sin fundido culpable, y no es artefacto) | (a) Diferir con `import()` dinámico, como `ActivadorTours`, solo componentes cliente sin HTML propio del servidor: `Efectos`, `Analitica` y la parte de efectos de `CabeceraCliente`. **`Efectos` no se difiere** mientras `.js .entra` dependa de él para hacerse visible, salvo que antes se haya aplicado (c) a lo que está arriba del pliegue en las URLs extra; si no, esas páginas quedarían ocultas más tiempo. La cabecera y `NavegacionConEsqueleto` pintan HTML, así que no se difieren. Techo: los bytes de la app medidos en la etapa 1 (~37 KiB), no los del framework. Un `requestIdleCallback` solo no saca bytes del paquete inicial. (b) Fuentes: `display: 'optional'` o precargar solo el peso del título, si el elemento LCP es texto. |
| Retraso de carga del recurso (la imagen se pide tarde) | Precargar la imagen LCP con `ReactDOM.preload` (`as: 'image'`, con `imageSrcSet` e `imageSizes`) desde la página, para que el navegador la pida antes de leer el CSS. |
| Tiempo de carga del recurso | Revisar el tamaño de la variante elegida por `sizes` en móvil. Con las fotos de prueba de 2 KiB no debería dominar; si domina, es un artefacto del banco y se anota. |
| TTFB | No se toca: en local y en CI no representa a Vercel. Se anota y se mide en producción (F5). |

- **Reglas que no cambian:**
  - Todo el contenido sigue en el HTML del servidor (spec principal §9).
  - Las páginas siguen siendo ISR (`x-nextjs-cache: HIT`).
  - No se usan Cache Components ni PPR (AGENTS.md).
  - No se suben los umbrales.
  - `experimental.inlineCss` y `decoding="sync"` no se vuelven a probar sin evidencia nueva.
- **Las E2E en los dos modos siguen pasando,** incluidas las de presencia: diferir un componente no puede romper la
  barra, la tarjeta ni la analítica. La analítica diferida no pierde clics: el listener se engancha antes de que el
  usuario pueda tocar algo útil, o el clic se registra con `sendBeacon` al navegar. El plan decide cuál, con prueba.

### 2.3 Cuándo se termina

- **Éxito:** las 4 URLs con LCP < 2500 ms en la mediana de 3 corridas del CI, TBT < 200 ms y CLS < 0.1. Es decir, la
  barrera del CI en verde sin tocar `lighthouserc.json`.
- **Sin éxito después de la etapa 2:** el documento de rendimiento queda con lo medido, lo probado y lo que falta, y
  la decisión pasa al dueño con estas opciones, sin elegir por él:
  1. Medir el LCP real en un preview de Vercel cuando haya Pro, y decidir con datos de campo.
  2. Mantener la barrera en rojo como aviso y no como bloqueo hasta tener esos datos.
  3. Cambiar el diseño de la página que no pasa (por ejemplo, la imagen de cabeza en celular).

  Nada de esto se aplica sin su respuesta.
- **Línea base de los paquetes 1 a 3** (la misma regla que el paquete 1 §5):
  - Es la medición del `main` actual que hace la etapa 1 (01f2bae o posterior).
  - Si esa medición muestra que presencia empeoró contra c60283d más del margen (+100 ms de LCP o +50 ms de TBT), se
    reporta al dueño antes de seguir.
  - Si este paquete termina con éxito, la nueva línea base es su commit final, y los paquetes que lleguen después no
    pueden volver a pasar de 2500 ms.

## 3. Orden con los otros paquetes

- La etapa 1 puede correr ya, en paralelo, porque no cambia el sitio.
- La etapa 2 va **antes** de los paquetes 2 y 3 si es posible: cambia el layout, que los dos usan.
- Si el paquete 1 ya se implementó, se mide encima de él.

## 4. Fallos y casos raros

| Caso | Qué pasa |
|---|---|
| El banco del CI no deja leer las auditorías nuevas | Se escriben a `::notice::` con un script propio que lee el JSON de LHCI (`.lighthouseci/`), como en F3d. |
| Una mejora del simulado empeora el real (o al revés) | Se anota. Decide el simulado, que es la barrera, siempre que el real no empeore más de 10 %. |
| Diferir un componente cambia lo que se ve (CLS) | Se descarta ese cambio. CLS tiene que seguir < 0.1. |
| Las 4 URLs difieren en la fase dominante | Se ataca la fase de cada una, empezando por la que más se pasa del umbral (`/es/guia/la-paz`). |

## 5. Pruebas y criterios de aceptación

- La etapa 1 deja `docs/rendimiento/lcp-2026-11.md` con la tabla completa de las 4 URLs, simulado y real.
- Cada cambio de la etapa 2 es su propio commit, con su medición antes y después en el mensaje.
- Las E2E en los dos modos, las unitarias y las de integración pasan.
- Si se tocan componentes cliente diferidos: E2E de que la cabecera (menú, búsqueda), la analítica (un `tour_clic`
  espiado) y la barra de presencia siguen funcionando.
- La barrera de Lighthouse del CI en verde, o el documento con la decisión pendiente del dueño (2.3).

## 6. Fuera de alcance

- Optimizar el sitio de reservas, por donde pasa la Guía con un rewrite.
- El LCP de campo, que no existe hasta el deploy (Vercel Pro).
- Cambiar umbrales, el CDN o el hosting.
- Los avisos de `npm audit` de `sharp` y `happy-dom` (siguen anotados en F3d).

---
Status: APPROVED
Critic verdict: Corrige todo lo de las dos pasadas anteriores (controles por mecanismo y combinado, regla doble del artefacto, trazas con --save-assets, URLs extra de listados, no diferir Efectos mientras .entra dependa de él y línea base igual al paquete 1) y no hay nada que lleve a construir algo equivocado.
