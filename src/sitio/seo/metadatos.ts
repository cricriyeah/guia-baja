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
}

// Spec §9. Rutas relativas: metadataBase (= SITIO_URL, en el layout raíz) las vuelve absolutas.
export function metadatos(e: EntradaMetadatos): Metadata {
  const languages = hreflang({ lang: e.lang, ruta: e.ruta, indexable: e.indexable }, e.versiones)
  return {
    title: e.titulo,
    description: e.descripcion,
    alternates: Object.keys(languages).length ? { canonical: e.ruta, languages } : { canonical: e.ruta },
    robots: { index: e.indexable, follow: true },
    openGraph: {
      title: e.titulo,
      description: e.descripcion,
      url: e.ruta,
      locale: e.lang === 'es' ? 'es_MX' : 'en_US',
      type: 'website',
      siteName: textos(e.lang).guia,
    },
  }
}
