import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { esLocale } from '../../../../../dominio/idioma'
import type { Variante } from '../../../../../sitio/paginas/comun'
import { ListadoEventos, metadatosEventos } from '../../../../../sitio/paginas/ListadoEventos'

// ISR: con generateStaticParams vacío el segmento [lang] no deja la ruta dinámica (ƒ).
export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string }> }
const BASE: Variante = { pagina: 1, filtros: null }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  return esLocale(lang) ? metadatosEventos(lang, BASE) : {}
}

export default async function Pagina({ params }: Props) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  return <ListadoEventos lang={lang} variante={BASE} />
}
