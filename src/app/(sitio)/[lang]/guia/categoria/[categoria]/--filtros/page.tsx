import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { esLocale } from '../../../../../../../dominio/idioma'
import { CategoriaGlobal, metadatosCategoriaGlobal } from '../../../../../../../sitio/paginas/CategoriaGlobal'
import { varianteDeConsulta, type SearchParams } from '../../../../../../../sitio/paginas/comun'

// Variante con filtros (spec §7): dinámica, noindex y canónica a la página sin parámetros. Nunca da 404 ella misma:
// una categoría inexistente, o una página fuera de rango, redirigen (ver CategoriaGlobal).
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ lang: string; categoria: string }>; searchParams: SearchParams }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang, categoria } = await params
  return esLocale(lang) ? metadatosCategoriaGlobal(lang, categoria, await varianteDeConsulta(searchParams)) : {}
}

export default async function Pagina({ params, searchParams }: Props) {
  const { lang, categoria } = await params
  if (!esLocale(lang)) notFound()
  return <CategoriaGlobal lang={lang} categoriaSlug={categoria} variante={await varianteDeConsulta(searchParams)} />
}
