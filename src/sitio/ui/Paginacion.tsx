// src/sitio/ui/Paginacion.tsx
import Link from 'next/link'

import type { Locale } from '../../dominio/idioma'
import { conPagina } from '../../dominio/rutas'
import { textos } from '../textos'

// Spec §7: paginación numerada con URL real (?pagina=N). En una variante con filtros conserva su consulta.
export function Paginacion(props: { lang: Locale; ruta: string; pagina: number; totalPaginas: number; consulta?: string }) {
  const { lang, ruta, pagina, totalPaginas, consulta = '' } = props
  if (totalPaginas <= 1) return null
  const t = textos(lang).paginacion
  const href = (n: number) => conPagina(ruta, n, consulta)
  return (
    <nav className="paginas" aria-label={t.etiqueta}>
      {pagina > 1 && <Link className="chip presionable" href={href(pagina - 1)} rel="prev">{t.anterior}</Link>}
      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) =>
        n === pagina ? (
          <span key={n} className="chip" aria-current="page">{n}</span>
        ) : (
          <Link key={n} className="chip presionable" href={href(n)} aria-label={t.pagina(n)}>{n}</Link>
        ),
      )}
      {pagina < totalPaginas && <Link className="chip presionable" href={href(pagina + 1)} rel="next">{t.siguiente}</Link>}
    </nav>
  )
}
