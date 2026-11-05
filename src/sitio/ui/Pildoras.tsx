// src/sitio/ui/Pildoras.tsx
import Link from 'next/link'

// Spec §7: cada píldora es un link a una página real, no un filtro de JavaScript.
export function Pildoras({ etiqueta, items, clase = 'pildoras' }: { etiqueta: string; items: { nombre: string; ruta: string; actual?: boolean }[]; clase?: string }) {
  if (!items.length) return null
  return (
    <nav className={clase} aria-label={etiqueta}>
      {items.map((i) => (
        <Link key={i.ruta} className="chip presionable" href={i.ruta} aria-current={i.actual ? 'page' : undefined}>
          {i.nombre}
        </Link>
      ))}
    </nav>
  )
}
