// src/sitio/ui/tarjetas/TarjetaLugar.tsx
import Link from 'next/link'
import type { CSSProperties } from 'react'

import type { Locale } from '../../../dominio/idioma'
import { patrocinioDeclarado } from '../../../dominio/patrocinio'
import { rutas } from '../../../dominio/rutas'
import type { CategoriaPublica, TarjetaLugar as Lugar } from '../../datos/tipos'
import { textos } from '../../textos'
import { Patrocinado } from '../Etiquetas'
import { HorarioEnVivo } from '../HorarioEnVivo'
import { Imagen } from '../Imagen'

// La tarjeta de lugar de la propuesta C (.nota), la misma en todas las páginas. Patrocinio declarado → etiqueta
// y rel="sponsored" (spec §7), lo decide el código.
export function TarjetaLugar(props: { lang: Locale; lugar: Lugar; categoria?: CategoriaPublica; zonaNombre?: string; km?: number | null; retraso?: number; entrada?: boolean }) {
  // `entrada` en falso: arriba del pliegue, un fundido desde opacidad 0 retrasa el LCP (docs/rendimiento/lcp-2026-11.md).
  const { lang, lugar, categoria, zonaNombre, km, retraso, entrada = true } = props
  const t = textos(lang).tarjetas
  const declarado = patrocinioDeclarado(lugar.patrocinio)
  return (
    <Link
      className={`nota tarjeta presionable${entrada ? ' entra' : ''} ${categoria?.claseGrupo ?? ''}`}
      href={rutas.lugar(lang, lugar.slug)}
      rel={declarado ? 'sponsored' : undefined}
      style={retraso ? ({ '--retraso': `${retraso}ms` } as CSSProperties) : undefined}
    >
      <div className="media">
        {lugar.foto ? <Imagen imagen={lugar.foto} sizes="(min-width: 720px) 33vw, 100vw" alt="" /> : <div className="campo-palabra" aria-hidden="true">{categoria?.nombre}</div>}
      </div>
      <div className="nota__cuerpo">
        <span>
          {declarado && <><Patrocinado lang={lang} /> </>}
          {categoria && <span className="etiqueta">{categoria.nombre}</span>} <HorarioEnVivo lang={lang} horario={lugar.horario} corto />
        </span>
        <p className="titular">{lugar.nombre}</p>
        <p className="bajada">{lugar.resumen}</p>
        <div className="nota__pie">
          <span className="meta">{[zonaNombre, km != null ? t.km(Math.round(km)) : null].filter(Boolean).join(' · ')}</span>
          {lugar.rangoPrecio && <span className="meta">{lugar.rangoPrecio}</span>}
        </div>
      </div>
    </Link>
  )
}
