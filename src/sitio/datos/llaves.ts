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
  lugares: (lang: Locale): Llave => ({ llave: ['lugares', lang], etiquetas: [etiqueta.categorias, etiqueta.listados, etiqueta.media, etiqueta.zonas] }),
  eventos: (lang: Locale): Llave => ({ llave: ['eventos', lang], etiquetas: [etiqueta.categorias, etiqueta.listados, etiqueta.media, etiqueta.zonas] }),
  articulos: (lang: Locale): Llave => ({ llave: ['articulos', lang], etiquetas: [etiqueta.categorias, etiqueta.listados, etiqueta.media, etiqueta.zonas] }),
  fichaLugar: (id: number, lang: Locale): Llave => ({ llave: ['fichaLugar', String(id), lang], etiquetas: [etiqueta.categorias, etiqueta.lugar(id), etiqueta.media, etiqueta.zonas] }),
  fichaEvento: (id: number, lang: Locale): Llave => ({ llave: ['fichaEvento', String(id), lang], etiquetas: [etiqueta.categorias, etiqueta.evento(id), etiqueta.media, etiqueta.zonas] }),
  fichaArticulo: (id: number, lang: Locale): Llave => ({ llave: ['fichaArticulo', String(id), lang], etiquetas: [etiqueta.articulo(id), etiqueta.categorias, etiqueta.media, etiqueta.zonas] }),
  // Sin hora ni página: el orden con patrocinios y el corte de eventos pasados se hacen fuera de la caché.
  coincidencias: (q: string, lang: Locale, tipo: string | null, zonaId: number | null): Llave => ({
    llave: ['coincidencias', q, lang, tipo ?? '', zonaId ? String(zonaId) : ''],
    etiquetas: [etiqueta.categorias, etiqueta.listados, etiqueta.zonas],
  }),
  texto: (zonaId: number, categoriaId: number, lang: Locale): Llave => ({ llave: ['texto', String(zonaId), String(categoriaId), lang], etiquetas: [etiqueta.textos(zonaId, categoriaId)] }),
}
