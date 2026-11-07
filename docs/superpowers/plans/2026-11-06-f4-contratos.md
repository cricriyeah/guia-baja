# F4 Contratos: plan de implementación

**Meta:** los dos contratos de solo lectura del spec §8: «Tours en esta zona» desde el catálogo (8.1) y `GET /api/publico/v1/zonas/{sedeSlug}/resumen` (8.2).

**Spec:** `docs/specs/2026-10-30-guia-baja-design.md` §6, §7, §8, §11, §13.

## Reglas

- Solo lectura contra el catálogo. Nunca se llama al catálogo real desde el CI: el E2E usa `scripts/catalogo-falso.mjs`.
- Sin dependencias nuevas: el esquema del catálogo y el del contrato se validan a mano.
- La forma de `v1` queda congelada en `tests/contrato/resumen-v1.ts`. No se edita; un cambio incompatible es `v2`.

## Decisiones tomadas con la API real (2026-11-06)

- **Precio «desde»:** `precio_base` en servicios, `precio_ancla` en paquetes. En inglés se divide entre `tipo_cambio_usd` y se redondea hacia arriba al dólar, igual que `aMoneda` del sitio de reservas.
- **`estrategia_precio`:** `por_grupo`, `por_persona`, `tarifa_fija`, `por_noche` y `por_ruta`. Otro valor no pasa el esquema. `por_ruta` no muestra precio porque el sitio de reservas lo cotiza.
- **Duración:** `duracion` / `duracion_en` en servicios y `noches` en paquetes, que no traen duración.
- **Idioma:** sin `nombre_en`, el tour no sale en inglés (sin idioma de respaldo, spec §6).
- **Una sede sin catálogo** (hoy `puerto-chale` da 404) cuenta como fallo: no hay bloque, la página carga y queda en logs.
- **Evento sin foto o artículo sin portada:** `imagen` es `null` en el contrato.
- **`lang` inválido en el contrato:** `400`. El spec no lo define.
- **Pieza de atribución:** `zona-{slug}`, `categoria-{slug}`, `lugar-{slug}` y `articulo-{slug}`, como en `docs/diseno/propuestas`.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `src/dominio/catalogo.ts` | Validar respuestas del catálogo, calcular precio y armar tours. Sin E/S. |
| `src/dominio/rutas.ts` | `rutasReservas` y `atribucion`: URLs del sitio de reservas. |
| `src/dominio/fechas.ts` | `isoEnMazatlan`: fecha con desfase `-07:00` para el contrato. |
| `src/sitio/datos/lecturas/catalogo.ts` | `fetch` con límite de 3 s y fotos de la colección Fotos de tours. |
| `src/sitio/datos/llaves.ts`, `cacheadas.ts` | Caché de 1 h por etiqueta. `toursDeSede` atrapa el fallo y lo registra. |
| `src/sitio/ui/ToursEnZona.tsx` | Los tres formatos del diseño: riel, fila y bloque de artículo. |
| `src/sitio/datos/resumen.ts` | `armarResumen`: la respuesta de `v1`. Sin E/S. |
| `src/app/api/publico/v1/zonas/[sedeSlug]/resumen/route.ts` | La ruta del contrato. |
| `tests/contrato/resumen-v1.ts` | Esquema congelado. |

## Tareas

1. **Catálogo y tours (TDD):** `tests/unit/catalogo.test.ts` y `tests/unit/lectura-catalogo.test.ts`, luego dominio, lectura y caché. El fallo se lanza dentro de `unstable_cache` para que no se guarde.
2. **Bloques en páginas:** zona (riel), categoría en zona (riel), ficha de lugar (fila, 3 tours) y artículo (bloque, 3 tours). Sin bloque en eventos (decisión de diseño). Enlaces con `data-evento="tour_clic"`, `data-zona` y `data-origen`.
3. **Contrato `v1` (TDD):** esquema congelado, `tests/unit/resumen.test.ts`, `tests/int/publico-v1.int.test.ts`, `armarResumen` y la ruta.
4. **E2E:** catálogo falso en `playwright.config.ts` y `tests/e2e/tours.spec.ts`: tarjetas, precio por idioma, enlaces, catálogo caído sin romper la página, y el contrato con sus cabeceras.
5. **Verificar:** `typecheck`, `lint`, unitarias, integración y E2E. Subir a `main`.
