# Lineamientos de diseño de la Guía

La Guía vive bajo `salysoltours.com`, junto al sitio de reservas de Sun Baja Experience, y tiene que sentirse
parte del mismo sitio. Por eso hereda su sistema de diseño: los valores de origen están en
`sistema-pescadeportiva/docs/design/design.md` (rama `main`, revisado el 2026-11-03), sección «Sitio público
campaña». Este documento fija lo que usa la Guía y agrega lo propio: los tonos permitidos y el color por grupo
de categorías.

Decisiones del dueño (2026-11-03): se adopta el estilo «campaña»; la marca es Sun Baja; se usan tonos de las
cuatro familias de color con una escala fija; el color identifica grupos de categorías, no categorías sueltas
(propuesta revisada con Perception-First Design, ver el final).

## Colores

### Base

Al menos el 85 % de cada pantalla es base. El texto va siempre en `tinta`; no hay texto gris tenue.

Decisión del dueño (2026-11-03): el fondo de página es **blanco**, como en un portal de noticias; `arena` queda
para superficies suaves (tarjetas secundarias, franjas).

| Token | Hex | Uso |
|---|---|---|
| `tinta` | `#1F1A14` | Texto, titulares, fondos oscuros (nunca negro puro) |
| `blanco` | `#FFFFFF` | Fondo de página y superficies de lectura |
| `arena` | `#FCF6ED` | Superficies suaves y franjas |
| `borde` | `#E6E4DF` | Solo decorativo |
| `borde-control` | `#8B8B86` | Bordes de campos de formulario |

### Escala fija de tonos

Cuatro familias, seis tonos cada una. No se usa ningún tono fuera de esta tabla.

| Tono | Azul | Café | Coral | Verde |
|---|---|---|---|---|
| `profundo` | `#0E3040` | `#3E1E01` | `#702219` | `#1A2002` |
| `hondo` | `#14485F` | `#5D2C02` | `#A83226` | `#272F03` |
| `base` | `#1B607F` | `#7C3B02` | `#E04332` | `#343F04` |
| `medio` | `#76A0B2` | `#B08967` | `#EC8E84` | `#5D6536` |
| `claro` | `#DDE6EB` | `#FEE0AC` | `#F6C7C2` | `#DFFFA8` |
| `bruma` | `#E8EFF2` | `#FCF6ED` | `#FCECEB` | `#EBECE6` |

Cada tono tiene un solo papel, igual en las cuatro familias:

| Papel | Tono | Texto encima |
|---|---|---|
| Bloque del grupo (campo de color grande) | `base` (en café: `medio`) | blanco; en coral base y café medio, `tinta` y solo en letra de 24 px o más |
| Hover o pulsado sobre un bloque | `hondo` | blanco |
| Etiqueta chica de categoría | fondo `claro`, texto `profundo` | — |
| Franja de fondo suave de una sección | `bruma` | `tinta` |
| Líneas e ilustración decorativa | `medio` | — |

Reservados, nunca para categorías:

- **Café base `#7C3B02`**: marca y acción (hover de los botones).
- **Coral hondo `#A83226`**: errores.

### Estados

Siempre con icono y texto, nunca solo color.

| Estado | Texto | Fondo |
|---|---|---|
| Éxito | `#2F5D0A` | `#E7F5D3` |
| Error | `#A83226` | `#FCECEB` |
| Aviso | `#6B3A00` | `#FEE0AC` |
| Información | `#0F3D52` | `#DDE6EB` |
| Enfoque | anillo de 2 px `#1B607F` con desfase de 2 px | — |

## Color por grupo de categorías

El color dice el **grupo**; el nombre de la categoría siempre va escrito. Los grupos conservan el significado
que tienen en el sitio de reservas (azul = mar, verde = aire libre, coral = ciudad), así el visitante que viene
de un sitio al otro no tiene que aprender nada nuevo, y una playa en azul lleva a tours de mar en azul.

| Grupo | Bloque | Categorías |
|---|---|---|
| Mar | azul base `#1B607F` | Playas, Torneos y deportes |
| Aire libre | verde base `#343F04` | Actividades |
| Comer y salir | coral base `#E04332` | Restaurantes, Cafés y bares, Música y fiestas |
| Lo local | café medio `#B08967` | Mercados, Tiendas locales, Cultura, Ferias y festivales |
| Artículos | sin acento (`tinta` sobre `arena`) | — |

- Un evento toma el grupo de su categoría principal (la primera).
- «Patrocinado» no lleva color de grupo: texto `tinta`.
- Máximo 2 colores de acento por pantalla. Una página de zona que mezcla grupos los muestra como etiquetas
  chicas (claro + profundo), no como bloques grandes.
- Cada categoría guarda su grupo en el admin, elegido de una lista cerrada (Mar, Aire libre, Comer y salir,
  Lo local). Nadie escribe códigos de color. Esto agrega un campo a Categorías, con su migración.

## Formas

- Solo rectángulo de esquina recta o círculo y píldora (`rounded-none`, `rounded-full`).
- Botones píldora de 44 px de alto: `campana` (negro) y `campana-claro` (blanco, sobre foto). El café aparece
  solo en el hover.
- Superficies planas: la jerarquía la hacen el color y el espacio. Sombra solo en lo que flota (menú, hoja,
  popover): `0 8px 24px rgb(31 26 20 / .14)`.
- Espaciado en múltiplos de 4 px (`4, 8, 12, 16, 24, 32, 48, 64`). Margen lateral: 16 px en móvil, 24 px en
  tableta, 32 px en escritorio. Ancho máximo del contenido: 1120 px.

## Tipografía

| Rol | Fuente |
|---|---|
| Titulares | **Consola Mono Bold** (700), servida desde el sitio con `next/font/local`. Archivo y licencia (SIL OFL 1.1) en `recursos/fuentes/`. Fallback: `Consolas, "SF Mono", Menlo, ui-monospace, monospace` |
| Texto, botones y formularios | Fuente del sistema: `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. No se descarga nada |
| Cifras | Fuente del sistema con `font-variant-numeric: tabular-nums` |

- Titulares **siempre en mayúsculas** (`text-transform`; el texto fuente queda en caja de oración), con
  `text-wrap: balance`, y nunca más de dos renglones.
- Tamaños de campaña: `texto-gigante` `clamp(72px, 13vw, 220px)` y `texto-grande` `clamp(40px, 5.4vw, 84px)`,
  solo para una o dos palabras. Consola Mono mide 0,586 em por carácter: una palabra de 12 letras a 13vw no
  cabe en un teléfono; se calcula antes de fijar el tamaño.
- Cuerpo de 16 a 18 px, interlineado 1,5. Mínimo 16 px en campos de formulario.
- Para destacar se usa peso o color, nunca otra fuente.

## Fotos

- Fotos de pesca solo en contenido de pesca.
- Lugares y eventos siempre tienen al menos una foto (obligatoria en el backoffice). El bloque de color con una
  palabra en grande queda solo para la tarjeta de un tour que todavía no tiene foto en la Guía.
- Las fotos de `propuestas/img/` vienen del banco de Pexels del sitio de reservas y son solo para las propuestas.

## Video

- Hoy la colección `Media` solo acepta imágenes (JPG, PNG, WebP). No hay sección de videos tipo reels: la Guía no es
  una red social, nadie produciría clips verticales con regularidad y los videos horizontales pierden casi el 70 %
  del cuadro al recortarlos a 9:16 (decisión del dueño, 2026-11-03).
- Único video en la portada: la banda de tours, con un clip fijo de Sun Baja que vive en el código, no en el admin.
- Mejora futura, fuera del alcance actual: video dentro de un artículo o ficha, en 16:9 y con imagen de portada. Un
  post destacado con video podría mostrarlo en el carrusel de la portada. Requiere cambiar el esquema, el spec y el
  flujo de subida (directo a R2 por el límite de 4.5 MB de Vercel).

## Movimiento y accesibilidad

- Una sola curva: `cubic-bezier(0.2, 0, 0, 1)`. 150 ms al tocar, de 220 a 300 ms al abrir o cerrar, de 600 a
  900 ms al entrar en pantalla. Solo `transform` y `opacity`.
- Con `prefers-reduced-motion: reduce` solo cambia la opacidad.
- WCAG 2.2 AA. Los contrastes de las tablas se calcularon en el sitio de reservas.

## Recursos

- `recursos/fuentes/`: Consola Mono Bold (woff2, 23,7 KB, subconjunto latino) con `OFL.txt` y `FONTLOG.txt`.
- `recursos/logos/`: logo Sun Baja en cuatro formatos (`logolg`, `logomed`, `logosm`, `logotall`), en negro;
  se recolorea con CSS.
- `propuestas/`: prototipos en HTML para decidir cómo se arman las páginas.

## Por qué el color va por grupo y no por categoría

La primera propuesta daba un tono a cada una de 10 categorías. La revisión con Perception-First Design (2026-11-03)
encontró que nadie memoriza 10 asociaciones; que 7 de los 11 colores eran casi tan oscuros como `tinta`; y que
había pares casi iguales (Cafés y bares contra Mercados, con distancia OKLab de 0,052, y Actividades contra
Mercados, con 0,014 en deuteranopia). Con cuatro grupos la distancia mínima sube a 0,136. El único par algo
cercano con daltonismo es coral contra café medio (0,064), y la etiqueta escrita lo resuelve.
