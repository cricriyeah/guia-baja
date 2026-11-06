import type { Metadata } from 'next'

import type { Locale } from '../../dominio/idioma'
import { hreflang, type VersionIdioma } from '../../dominio/indexable'
import { textos } from '../textos'

export type EntradaMetadatos = {
  lang: Locale
  titulo: string
  descripcion: string
  ruta: string
  indexable: boolean
  versiones: VersionIdioma[]
  // Ruta de la imagen OG (rutaOg): el sitio de reservas la reescribe a la guía.
  imagenOg?: string
  // Página N (≥ 2) de un listado: su título lleva el número para no repetir el de la página 1.
  pagina?: number
}

// Spec §9. Rutas relativas: metadataBase (= sitioUrl(), en el layout raíz) las vuelve absolutas, también la imagen OG.
export function metadatos(e: EntradaMetadatos): Metadata {
  const titulo = e.pagina && e.pagina >= 2 ? textos(e.lang).paginacion.titulo(e.titulo, e.pagina) : e.titulo
  const languages = hreflang({ lang: e.lang, ruta: e.ruta, indexable: e.indexable }, e.versiones)
  return {
    title: titulo,
    description: e.descripcion,
    alternates: Object.keys(languages).length ? { canonical: e.ruta, languages } : { canonical: e.ruta },
    robots: { index: e.indexable, follow: true },
    openGraph: {
      title: titulo,
      description: e.descripcion,
      url: e.ruta,
      locale: e.lang === 'es' ? 'es_MX' : 'en_US',
      type: 'website',
      siteName: textos(e.lang).guia,
      ...(e.imagenOg ? { images: [{ url: e.imagenOg, width: 1200, height: 630 }] } : {}),
    },
    ...(e.imagenOg ? { twitter: { card: 'summary_large_image' as const } } : {}),
  }
}
