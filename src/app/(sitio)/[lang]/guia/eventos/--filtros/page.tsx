import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { esLocale } from '../../../../../../dominio/idioma'
import { varianteDeConsulta, type SearchParams } from '../../../../../../sitio/paginas/comun'
import { ListadoEventos, metadatosEventos } from '../../../../../../sitio/paginas/ListadoEventos'

// Variante con filtros (spec §7): dinámica, noindex y canónica a la página sin parámetros. Nunca da 404 ella misma:
// una zona inexistente, o una página fuera de rango, redirigen (ver ListadoEventos).
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ lang: string }>; searchParams: SearchParams }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params
  return esLocale(lang) ? metadatosEventos(lang, await varianteDeConsulta(searchParams)) : {}
}

export default async function Pagina({ params, searchParams }: Props) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  return <ListadoEventos lang={lang} variante={await varianteDeConsulta(searchParams)} />
}
