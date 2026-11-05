import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { esLocale, LOCALES } from '../../../dominio/idioma'
import { guiaIndexable, sitioUrl } from '../../../sitio/entorno'
import '../../../sitio/estilos/base.css'

const consola = localFont({ src: '../../../sitio/fuentes/ConsolaMono-Bold.woff2', weight: '700', display: 'swap', variable: '--fuente-titulo' })

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(sitioUrl()),
    title: { template: '%s · Guía de la Baja', default: 'Guía de la Baja' },
    // Spec §9: con GUIA_INDEXABLE distinto de true, ninguna página se indexa (las páginas pueden endurecerlo, no aflojarlo).
    robots: guiaIndexable() ? undefined : { index: false, follow: true },
  }
}

export default async function LayoutRaiz({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  return (
    <html lang={lang} className={consola.variable}>
      <body>{children}</body>
    </html>
  )
}
