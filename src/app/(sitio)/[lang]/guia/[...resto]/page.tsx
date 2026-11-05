import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { esLocale, type Locale } from '../../../../../dominio/idioma'
import { noEncontrado } from '../../../../../sitio/redirigir'
import { NoEncontrado } from '../../../../../sitio/ui/NoEncontrado'

// Toda ruta de la guía sin página propia: consulta las Redirecciones (308) y si no, 404 (spec §6).
// ISR y no dinámica: en Next 16.4.3, notFound() en un render dinámico deja el HTML del servidor en el cascarón vacío
// `__next_error__` (el 404 lo pinta el cliente). En ISR, notFound() dentro de un Suspense da estado 404 y el HTML
// conserva cabecera, pie y el fallback <NoEncontrado/> (spec §4). Costo aceptado: cada URL inventada deja una entrada ISR.
export const revalidate = 3600
export const generateStaticParams = () => []

async function Resolver({ lang, resto }: { lang: Locale; resto: string[] }) {
  return noEncontrado(lang, resto)
}

export default async function Resto({ params }: { params: Promise<{ lang: string; resto: string[] }> }) {
  const { lang, resto } = await params
  if (!esLocale(lang)) notFound()
  return (
    <Suspense fallback={<NoEncontrado />}>
      <Resolver lang={lang} resto={resto} />
    </Suspense>
  )
}
