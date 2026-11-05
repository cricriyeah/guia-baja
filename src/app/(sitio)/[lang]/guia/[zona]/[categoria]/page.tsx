import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { esLocale } from '../../../../../../dominio/idioma'
import { CategoriaEnZona, metadatosCategoriaEnZona } from '../../../../../../sitio/paginas/CategoriaEnZona'
import type { Variante } from '../../../../../../sitio/paginas/comun'

// ISR (ver guia/[zona]/page.tsx): sin generateStaticParams un segmento dinámico queda ƒ; con una lista vacía las
// combinaciones se prerenderizan al primer pedido y se revalidan cada hora.
export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string; zona: string; categoria: string }> }
const BASE: Variante = { pagina: 1, filtros: null }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, zona, categoria } = await params
  return esLocale(lang) ? metadatosCategoriaEnZona(lang, zona, categoria, BASE) : {}
}

export default async function Pagina({ params }: Props) {
  const { lang, zona, categoria } = await params
  if (!esLocale(lang)) notFound()
  return <CategoriaEnZona lang={lang} zonaSlug={zona} categoriaSlug={categoria} variante={BASE} />
}
