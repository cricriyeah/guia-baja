import { Suspense } from 'react'

import type { Locale } from '../../dominio/idioma'
import { noEncontrado } from '../redirigir'
import { NoEncontrado } from './NoEncontrado'

async function Resolver({ lang, segmentos }: { lang: Locale; segmentos: string[] }) {
  return noEncontrado(lang, segmentos)
}

// Redirección o 404 de una página ISR. En Next 16.4.3, notFound() en render dinámico deja el HTML en el cascarón vacío
// `__next_error__`; dentro de un Suspense, en ISR, da estado 404 y HTML completo con el fallback <NoEncontrado/>.
// Las páginas cargan sus datos fuera del Suspense y solo usan este componente en la rama sin documento.
export function NoEncontradoEnSuspense({ lang, segmentos }: { lang: Locale; segmentos: string[] }) {
  return (
    <Suspense fallback={<NoEncontrado />}>
      <Resolver lang={lang} segmentos={segmentos} />
    </Suspense>
  )
}
