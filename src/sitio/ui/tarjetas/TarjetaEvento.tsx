// src/sitio/ui/tarjetas/TarjetaEvento.tsx
import Link from 'next/link'

import { partesFecha } from '../../../dominio/fechas-evento'
import type { Locale } from '../../../dominio/idioma'
import { patrocinioDeclarado } from '../../../dominio/patrocinio'
import { rutas } from '../../../dominio/rutas'
import type { CategoriaPublica, TarjetaEvento as Evento } from '../../datos/tipos'
import { CuentaRegresiva } from '../CuentaRegresiva'
import { Patrocinado } from '../Etiquetas'
import { Imagen } from '../Imagen'

// Tarjeta del riel «Hoy en {zona}» (c-portal.html, .evento).
export function TarjetaEvento(props: { lang: Locale; evento: Evento; categoria?: CategoriaPublica; lugarNombre?: string | null }) {
  const { lang, evento, categoria, lugarNombre } = props
  const declarado = patrocinioDeclarado(evento.patrocinio)
  return (
    <Link className={`evento tarjeta presionable entra ${categoria?.claseGrupo ?? ''}`} href={rutas.evento(lang, evento.slug)} rel={declarado ? 'sponsored' : undefined}>
      <div className="media">
        <Imagen imagen={evento.foto} sizes="(min-width: 720px) 25vw, 80vw" alt="" />
        <span className="sello-tiempo">{partesFecha(evento.inicio, lang).hora}</span>
      </div>
      <div className="evento__cuerpo">
        <span>
          {declarado && <><Patrocinado lang={lang} /> </>}
          {categoria && <span className="etiqueta">{categoria.nombre}</span>}
        </span>
        <p className="titular">{evento.nombre}</p>
        <p className="meta">{lugarNombre ?? evento.direccionLibre}</p>
        <CuentaRegresiva lang={lang} inicio={evento.inicio} fin={evento.fin} />
      </div>
    </Link>
  )
}
