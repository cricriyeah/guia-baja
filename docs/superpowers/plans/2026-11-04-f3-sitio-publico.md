# F3 Sitio público — índice de planes

**Spec:** `docs/specs/2026-10-30-guia-baja-design.md` (§4, 6–13). **Diseño:** `docs/diseno/` (propuesta C,
`docs/diseno/decisiones-frontend-backoffice.md`, `docs/diseno/lineamientos.md`).

F3 se divide en cuatro planes que se ejecutan en orden. Cada uno deja la rama en verde (tipos, lint, unitarias,
integración y build) y se puede mezclar por separado.

| Plan | Archivo | Entrega |
|---|---|---|
| F3a Base | `2026-11-04-f3a-base-sitio.md` | `proxy.ts` (origen, rutas en inglés, 404 cruzado), esqueleto `(sitio)/[lang]`, cabecera y pie, 404 y error, capa de datos con caché y etiquetas, revalidación desde Payload, SEO base (metadatos, `hreflang`, robots, JSON-LD de migas), redirecciones antes del 404, orden de listados y paginación. |
| F3b Páginas | `2026-11-04-f3b-paginas.md` | Portada, zona, categoría en zona, categoría en todas las zonas, ficha de lugar (mapa), eventos y evento, artículo con sus bloques. JSON-LD de cada tipo. |
| F3c Búsqueda, formulario y crones | `2026-11-04-f3c-busqueda-formulario-crones.md` | Índice de búsqueda por idioma, página de resultados y sugerencias; aviso de privacidad; formulario «Aparece en la guía» (Server Action, Turnstile, límite por IP, correo con Resend); crones (cola de Payload, ventana de patrocinios y fechas, conservación de Solicitudes); acción de anonimizar; sitemap; imágenes Open Graph; analítica. |
| F3d E2E y Lighthouse | `2026-11-04-f3d-e2e-lighthouse.md` | Playwright contra un build de producción con datos del seed (lista del spec §11, paso 4), Lighthouse CI (paso 5) y los dos pasos nuevos del CI. |

## Decisiones tomadas para F3 (2026-11-04)

- **Mapa (decisión 20):** MapLibre GL JS con teselas de **OpenFreeMap** (`https://tiles.openfreemap.org/styles/liberty`),
  sin llave ni registro. La librería se carga solo cuando el mapa entra en pantalla o el visitante lo pide; antes se
  ve un recuadro con la dirección y el botón «Cómo llegar» (link a Google Maps, que manda `contacto_lugar` con
  canal `mapa`). La dependencia `maplibre-gl` se justifica en el PR de F3b.
- **Búsqueda (decisión 13):** full-text de Postgres por idioma (`spanish` / `english`) con `unaccent` e índices GIN.
  Los documentos se copian a una colección oculta `indice-busqueda` (la mantiene un hook; respeta la regla de
  idioma y el estado publicado). La extensión, la función inmutable y los índices GIN van en una migración escrita
  a mano, `busqueda`, que `migracion:regenerar` vuelve a crear después de `inicial` (F3c).
- **Analítica (§13):** la herramienta no está confirmada. F3c deja un solo módulo `track()` con un adaptador que no
  hace nada y los eventos marcados en el HTML; conectar la herramienta es cambiar ese adaptador.
- **«Tours en esta zona»:** sigue en F4 (spec §14). F3 no muestra tarjetas del catálogo; la banda fija «Sal al mar
  con Sun Baja» (video del código, link a reservas) sí es de F3b. El bloque `toursZona` de los artículos no
  muestra nada hasta F4.
- **Contenido de prueba:** F3b amplía el seed con destacados, características, textos de zona × categoría, aviso
  de privacidad y eventos pasados y próximos, para que las páginas y el E2E tengan qué mostrar.
- **Decisiones que salieron de las revisiones de los planes:**
  - Redirecciones solo de tipo ruta (`custom`): se actualiza el spec §6.
  - Variable nueva `WHATSAPP_NUMERO` para el pie.
  - Las rutas de «Explora» del pie salen del diseño; el dueño las confirma.
  - La zona no lleva hoja inferior.
  - Las sugerencias de búsqueda no se cachean (excepción a §10).
  - La imagen OG usa la fuente de `next/og` y la marca en texto.
  - Presupuesto de caché: el plan B (listas por idioma y zona) se activa antes de unos 800 lugares por idioma.
  - Las E2E corren dos builds (`GUIA_INDEXABLE` false y true) en un job aparte del CI.

Estado (2026-11-04): los cuatro planes tienen el visto bueno de sus críticos (de arquitectura y de plan completo).
