import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { esLocale, LOCALES } from '../../../dominio/idioma'
import { guiaIndexable, sitioUrl } from '../../../sitio/entorno'
import '../../../sitio/estilos/base.css'
import { textos } from '../../../sitio/textos'

const consola = localFont({ src: '../../../sitio/fuentes/ConsolaMono-Bold.woff2', weight: '700', display: 'swap', variable: '--fuente-titulo' })

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  // Un idioma inválido cae al español; el layout de la página dará el 404.
  const guia = textos(esLocale(lang) ? lang : 'es').guia
  return {
    metadataBase: new URL(sitioUrl()),
    title: { template: `%s · ${guia}`, default: guia },
    // Spec §9: con GUIA_INDEXABLE distinto de true, ninguna página se indexa (las páginas pueden endurecerlo, no aflojarlo).
    robots: guiaIndexable() ? undefined : { index: false, follow: true },
  }
}

export default async function LayoutRaiz({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  return (
    <html lang={lang} className={consola.variable} suppressHydrationWarning>
      <head>
        {/* Antes del primer pintado: .js .entra oculta lo que Efectos va a mostrar al verse (c-base.css). */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
