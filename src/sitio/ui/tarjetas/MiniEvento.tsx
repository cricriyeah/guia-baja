// src/sitio/ui/tarjetas/MiniEvento.tsx
import Link from 'next/link'

import { partesFecha } from '../../../dominio/fechas-evento'
import type { Locale } from '../../../dominio/idioma'
import { rutas } from '../../../dominio/rutas'
import type { CategoriaPublica, TarjetaEvento as Evento } from '../../datos/tipos'

// «Eventos aquí» de la ficha y tarjeta de evento dentro de un artículo (c-ficha.html, .mini-evento).
export function MiniEvento(props: { lang: Locale; evento: Evento; categoria?: CategoriaPublica; lugarNombre?: string | null; clase?: string }) {
  const { lang, evento, categoria, lugarNombre, clase = 'mini-evento' } = props
  const f = partesFecha(evento.inicio, lang)
  return (
    <Link className={`${clase} presionable ${categoria?.claseGrupo ?? ''}`} href={rutas.evento(lang, evento.slug)}>
      <span className={clase === 'mini-evento' ? 'mini-evento__fecha' : 'fecha'}><small>{f.diaSemana}</small><b>{f.dia}</b></span>
      <span>
        {categoria && <span className="etiqueta">{categoria.nombre}</span>}
        <p className="titular" style={{ marginTop: 4 }}>{evento.nombre}</p>
        <span className="meta">{[f.hora, lugarNombre ?? evento.direccionLibre].filter(Boolean).join(' · ')}</span>
      </span>
    </Link>
  )
}
