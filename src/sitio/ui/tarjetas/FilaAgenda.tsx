// src/sitio/ui/tarjetas/FilaAgenda.tsx
import Link from 'next/link'

import { partesFecha } from '../../../dominio/fechas-evento'
import type { Locale } from '../../../dominio/idioma'
import { patrocinioDeclarado } from '../../../dominio/patrocinio'
import { rutas } from '../../../dominio/rutas'
import type { CategoriaPublica, TarjetaEvento as Evento } from '../../datos/tipos'
import { Patrocinado } from '../Etiquetas'
import { Imagen } from '../Imagen'

// Fila de la agenda de la portada y de la página de eventos (c-portada.html, .agenda__fila).
export function FilaAgenda(props: { lang: Locale; evento: Evento; categoria?: CategoriaPublica; lugarNombre?: string | null }) {
  const { lang, evento, categoria, lugarNombre } = props
  const f = partesFecha(evento.inicio, lang)
  const declarado = patrocinioDeclarado(evento.patrocinio)
  return (
    <Link className={`agenda__fila presionable ${categoria?.claseGrupo ?? ''}`} href={rutas.evento(lang, evento.slug)} rel={declarado ? 'sponsored' : undefined}>
      <span className="fecha"><small>{f.diaSemana}</small><b>{f.dia}</b><small>{f.mes}</small></span>
      <span>
        {declarado && <><Patrocinado lang={lang} /> </>}
        {categoria && <span className="etiqueta">{categoria.nombre}</span>}
        <p className="titular">{evento.nombre}</p>
        <span className="meta">{[f.hora, lugarNombre ?? evento.direccionLibre].filter(Boolean).join(' · ')}</span>
      </span>
      <div className="media"><Imagen imagen={evento.foto} sizes="72px" alt="" /></div>
    </Link>
  )
}
