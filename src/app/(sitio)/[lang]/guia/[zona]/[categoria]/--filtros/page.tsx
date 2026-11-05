import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { esLocale } from '../../../../../../../dominio/idioma'
import { CategoriaEnZona, metadatosCategoriaEnZona } from '../../../../../../../sitio/paginas/CategoriaEnZona'
import { varianteDeConsulta, type SearchParams } from '../../../../../../../sitio/paginas/comun'

// Variante con filtros (spec §7): dinámica, noindex y canónica a la página sin parámetros. Nunca da 404 ella misma:
// una zona o categoría inexistente, o una página fuera de rango, redirigen (ver CategoriaEnZona).
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ lang: string; zona: string; categoria: string }>; searchParams: SearchParams }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang, zona, categoria } = await params
  return esLocale(lang) ? metadatosCategoriaEnZona(lang, zona, categoria, await varianteDeConsulta(searchParams)) : {}
}

export default async function Pagina({ params, searchParams }: Props) {
  const { lang, zona, categoria } = await params
  if (!esLocale(lang)) notFound()
  return <CategoriaEnZona lang={lang} zonaSlug={zona} categoriaSlug={categoria} variante={await varianteDeConsulta(searchParams)} />
}
