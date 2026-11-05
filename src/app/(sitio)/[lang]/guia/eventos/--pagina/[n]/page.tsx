import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { esLocale } from '../../../../../../../dominio/idioma'
import { numeroDePagina } from '../../../../../../../dominio/paginacion'
import { ListadoEventos, metadatosEventos } from '../../../../../../../sitio/paginas/ListadoEventos'
import { NoEncontradoEnSuspense } from '../../../../../../../sitio/ui/NoEncontradoEnSuspense'

export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string; n: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, n } = await params
  const pagina = numeroDePagina(n)
  return esLocale(lang) && pagina && pagina >= 2 ? metadatosEventos(lang, { pagina, filtros: null }) : {}
}

export default async function Pagina({ params }: Props) {
  const { lang, n } = await params
  if (!esLocale(lang)) notFound()
  const pagina = numeroDePagina(n)
  // El proxy solo manda aquí páginas ≥ 2 (?pagina=1 redirige): cualquier otra cosa es un 404 (dentro de Suspense, ver C2).
  if (!pagina || pagina < 2) return <NoEncontradoEnSuspense lang={lang} segmentos={['eventos']} />
  return <ListadoEventos lang={lang} variante={{ pagina, filtros: null }} />
}
