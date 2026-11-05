import Link from 'next/link'

import type { Locale } from '../../dominio/idioma'
import type { Miga } from '../datos/tipos'
import { textos } from '../textos'

// Migas visibles (spec §7). La página pasa las mismas migas a migasLd.
export function Migas({ lang, migas }: { lang: Locale; migas: Miga[] }) {
  return (
    <nav className="migas" aria-label={textos(lang).migas.etiqueta}>
      {migas.map((m, i) =>
        i === migas.length - 1 ? (
          <span key={m.ruta} aria-current="page">{m.nombre}</span>
        ) : (
          <span key={m.ruta}>
            <Link href={m.ruta}>{m.nombre}</Link> <span aria-hidden="true">›</span>
          </span>
        ),
      )}
    </nav>
  )
}
