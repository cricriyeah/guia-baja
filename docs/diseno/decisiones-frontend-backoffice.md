# Decisiones: frontend contra backoffice (2026-11-03)

Se cruzó todo lo que muestran las propuestas de `propuestas/` (estilo C: `c-portal.html`, `c-ficha.html`,
`c-categoria.html`) contra el esquema de Payload (`src/collections`, `src/globals`) y el spec
(`docs/specs/2026-10-30-guia-baja-design.md`). El dueño decidió, punto por punto, si se quita del frontend o
se cambia el backoffice o el spec.

## Cambios al backoffice

| # | Qué muestra el frontend | Cambio |
|---|---|---|
| 1 | Color por grupo (Mar, Aire libre, Comer y salir, Lo local) | Campo `grupo` en Categorías (select cerrado). |
| 3 | Filtros «Para niños», «Con comida», «Solo con tour» | Campo `caracteristicas` en Lugares (lista cerrada, varias). Filtro como parámetro `noindex` (cambio de spec). |
| 4 | Carrusel de destacados en la portada | Casilla «destacar en portada» y orden en Artículos, Lugares y Eventos. Un lugar o evento destacado con patrocinio declarado lleva su etiqueta también ahí. |
| 5 | Etiqueta y color de categoría sobre artículos | Campo `categorias` en Artículos. |
| 6 | «Aparece en» en la ficha del lugar | Campo oculto `lugaresCitados` en Artículos, que llena un hook al guardar a partir de los bloques «Tarjeta de lugar». |
| 7 | Introducción de cada página zona × categoría (el spec ya la pedía) | Colección nueva de textos por zona × categoría (zona, categoría, introducción es/en). |
| 9 | Color y etiqueta de los eventos | `categorias` obligatoria en Eventos (al menos una). |
| 11 | Foto en las tarjetas de tour | Colección nueva en la Guía con una foto por tour, ligada al slug del servicio o paquete del catálogo (8.1). |
| 12 | Temporada del tour («ene a mar») | Texto opcional por tour en la misma colección del punto 11. |
| 13 | Buscador | La búsqueda de texto libre entra a v1 (cambio de spec: índice por idioma, página de resultados). |

## Cambios al spec sin cambio de esquema

| # | Qué | Cambio |
|---|---|---|
| 17 | Cabecera | Deja de replicar la del sitio de reservas (§7, Navegación); el pie sí la replica. `tour_clic` puede venir de la cabecera. |
| 3 | Filtro por características | Parámetro de consulta con canónica a la página sin parámetros y `noindex`, como `?precio=` y `?abierto=`. |
| 13 | Búsqueda | Sale de «Fuera de v1» y se define en la sección 7. |
| 18 | Tours en la página de categoría en zona | Se permiten; `tour_clic` agrega el origen `categoria`. |

## Se resuelve en el frontend, sin cambios

| # | Qué | Decisión |
|---|---|---|
| 2 | Distancias | Km en línea recta entre las coordenadas del lugar y las de su zona (ya existen). Se quitan los «min en auto». |
| 8 | Video | Solo fotos en el carrusel y en las tarjetas; el único video es el fijo de la banda de tours. Video en posts queda como mejora futura. |
| 10 | Eventos sin hora de fin | Solo muestran «Empieza en…»; «En curso · termina en…» solo si hay fin. |
| 14 | Filtros con JavaScript | Píldoras de categoría como links a su página; «Abierto ahora» como `?abierto=1`. |
| 15 | «Ver más» | Paginación numerada con URL real (`?pagina=2`). |
| 16 | Selector de orden | Se quita; siempre el orden del spec. |
| 17 | Cabecera y pie | **Cambio de spec (2026-11-03):** se quita la cabecera del sitio de reservas. La Guía usa su propia cabecera, derivada con PFD: sello de marca (isotipo + «Guía de la Baja»), zonas, búsqueda que se expande, ES/EN y un solo puente a reservas que nombra su destino y conoce la zona («Tours en La Paz →», con `?desde=guia&pieza=cabecera`); en celular, una fila y las zonas se esconden al bajar. No se usa «Volver»: la mayoría llega de Google y no tiene adónde volver. El pie sí es el mismo del sitio de reservas (`site-footer.tsx`), más el link al aviso de privacidad de la Guía. |
| 19 | Portada | Se diseña una portada general (`/guia`) con próximos eventos, artículos recientes, zonas activas y categorías. La propuesta actual queda como página de zona. |
| 20 | Proveedor de mapas | Se decide en F3 (MapTiler o Stadia, con llave); Leaflet se justifica en el PR. |

Ajustes del frontend que no requerían decisión: horario con varios tramos por día y tramos que pasan de
medianoche; sin insignia de «abierto» cuando no hay horario; crédito de cada foto en el visor; introducción de
la zona desde `Zonas.descripcion`; patrocinio con máximo 2 arriba y `rel="sponsored"`; «abierto ahora» y
cuentas regresivas calculados en el navegador (las páginas se cachean hasta una hora).

## Pantallas de F1 (estilo C)

| Pantalla | Archivo |
|---|---|
| Portada general | `propuestas/c-portada.html` |
| Zona | `propuestas/c-portal.html` |
| Categoría en zona | `propuestas/c-categoria.html` |
| Ficha de lugar | `propuestas/c-ficha.html` |
| Evento | `propuestas/c-evento.html` |
| Artículo (con sus cuatro bloques) | `propuestas/c-articulo.html` |
| Aparece en la Guía | `propuestas/c-aparece.html` |
| Resultados de búsqueda (`noindex`) | `propuestas/c-busqueda.html` |
| Aviso de privacidad (texto de ejemplo; el legal lo entrega el dueño) | `propuestas/c-privacidad.html` |
| Página 404 | `propuestas/c-404.html` |

La búsqueda filtra por tipo (`?tipo=`) y por zona (`?zona=`) con links, resalta la coincidencia y, dentro de cada
grupo, pone primero los patrocinados vigentes. El correo de privacidad sale de `AjustesGuia.correoPrivacidad`.

Notas que salieron al armar las pantallas:

- Formulario: pedir correo **o** teléfono (al menos uno) es una regla de la Server Action de F3; el esquema
  de Solicitudes no la exige. Con `formularioActivo` apagado la página muestra «Muy pronto».
- Evento: no lleva bloque de tours, porque `tour_clic` no tiene el origen `evento`. Si se quiere, es un cambio
  de spec como el del punto 18. Con `urlBoletos` el botón «Comprar boletos» manda `boletos_clic`.
- «Agregar al calendario» (archivo .ics) y «Compartir» se arman en el navegador; no tocan el backoffice.

## Segunda revisión: vistas nuevas (2026-11-03)

| Qué | Decisión |
|---|---|
| Texto del aviso de privacidad | En el admin: `avisoPrivacidad` (texto enriquecido es/en) en «Ajustes de la guía», con migración. |
| Correo ARCO en el aviso | `correoPrivacidad` pasa a lectura pública; la página lo muestra con «Copiar correo». |
| «Vigente desde» del aviso | Campo `avisoVigenteDesde` (fecha) en «Ajustes de la guía». |
| Datos del pie (WhatsApp, dirección, formas de pago) | Copiados en el código de la Guía; si el sitio de reservas los cambia, se cambian aquí a mano. |
| Patrocinio en la búsqueda | Hasta 2 patrocinados vigentes arriba de cada grupo, con su etiqueta. |
| Eventos pasados en la búsqueda | No aparecen; solo próximos. |
| Página 404 | Sin animación: solo el número. |

Además se arregla en el backoffice lo que ya estaba pendiente de F2: `publicadoEl` se fija al primer publicado
y `actualizadoEl` se actualiza en cada publicación, porque la página del artículo muestra las dos fechas.

Todas las decisiones de este documento quedaron en el spec (`docs/specs/2026-10-30-guia-baja-design.md`,
secciones 2, 6, 7, 8.1, 10, 12, 13 y 14) el 2026-11-03.
