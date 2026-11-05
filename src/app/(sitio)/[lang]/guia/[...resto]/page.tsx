import { notFound } from 'next/navigation'

import { esLocale } from '../../../../../dominio/idioma'
import { noEncontrado } from '../../../../../sitio/redirigir'

// Toda ruta de la guía sin página propia. Dinámica: una URL inventada no crea entradas ISR; solo usa el mapa
// de redirecciones ya cacheado.
export const dynamic = 'force-dynamic'

export default async function Resto({ params }: { params: Promise<{ lang: string; resto: string[] }> }) {
  const { lang, resto } = await params
  if (!esLocale(lang)) notFound()
  return noEncontrado(lang, resto)
}
