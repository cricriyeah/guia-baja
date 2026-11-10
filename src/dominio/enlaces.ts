export const ESQUEMAS_SEGUROS = /^(https?|mailto|tel):/i
// Rutas del propio sitio (`/x`) y anclas (`#x`). `//x` y `/\x` los navegadores los leen como protocolo relativo (otro
// sitio), y los saltos o tabulaciones se descartan al interpretar la URL (`/<tab>/x` pasa a `//x`): fuera todos.
const CONTROL = /[\u0000-\u001f\u007f]/
const RUTA_PROPIA = /^(\/(?![/\\])|#)/
// `www.x` sin esquema sigue fuera: no hay una normalización clara (http o https) y el editor puede escribir https://.
export const esEnlaceSeguro = (url: string): boolean => !CONTROL.test(url) && (ESQUEMAS_SEGUROS.test(url) || RUTA_PROPIA.test(url))
