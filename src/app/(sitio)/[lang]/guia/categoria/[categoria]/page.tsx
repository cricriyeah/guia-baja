import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { esLocale } from '../../../../../../dominio/idioma'
import { CategoriaGlobal, metadatosCategoriaGlobal } from '../../../../../../sitio/paginas/CategoriaGlobal'
import type { Variante } from '../../../../../../sitio/paginas/comun'

export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string; categoria: string }> }
const BASE: Variante = { pagina: 1, filtros: null }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, categoria } = await params
  return esLocale(lang) ? metadatosCategoriaGlobal(lang, categoria, BASE) : {}
}

export default async function Pagina({ params }: Props) {
  const { lang, categoria } = await params
  if (!esLocale(lang)) notFound()
  return <CategoriaGlobal lang={lang} categoriaSlug={categoria} variante={BASE} />
}
