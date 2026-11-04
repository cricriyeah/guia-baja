import { etiqueta } from '../../dominio/etiquetas'
import type { Locale } from '../../dominio/idioma'

export type Llave = { llave: string[]; etiquetas: string[] }

// Llave y etiquetas de cada lectura cacheada (spec §10). Las listas y las lecturas por slug llevan
// etiquetas de colección; `{tipo}:{id}` solo en lecturas por id. F3b y F3c agregan filas aquí.
export const LLAVES = {
  zonasActivas: (lang: Locale): Llave => ({ llave: ['zonasActivas', lang], etiquetas: [etiqueta.media, etiqueta.zonas] }),
  categorias: (lang: Locale): Llave => ({ llave: ['categorias', lang], etiquetas: [etiqueta.categorias] }),
  ajustes: (lang: Locale): Llave => ({ llave: ['ajustes', lang], etiquetas: [etiqueta.ajustes] }),
  redirecciones: (): Llave => ({ llave: ['redirecciones'], etiquetas: [etiqueta.redirecciones] }),
}
