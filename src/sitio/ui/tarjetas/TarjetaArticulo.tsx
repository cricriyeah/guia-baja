// src/sitio/ui/tarjetas/TarjetaArticulo.tsx
import Link from 'next/link'
import type { CSSProperties } from 'react'

import { fechaCorta } from '../../../dominio/fechas-evento'
import type { Locale } from '../../../dominio/idioma'
import { rutas } from '../../../dominio/rutas'
import type { CategoriaPublica, TarjetaArticulo as Articulo } from '../../datos/tipos'
import { textos } from '../../textos'
import { Imagen } from '../Imagen'

const fecha = (iso: string | null, lang: Locale) => (iso ? fechaCorta(iso, lang) : '')

// Tarjeta de artículo (.nota). Los artículos no llevan color de grupo propio: toman el de su categoría.
export function TarjetaArticulo(props: { lang: Locale; articulo: Articulo; categoria?: CategoriaPublica; retraso?: number }) {
  const { lang, articulo, categoria, retraso } = props
  const t = textos(lang).tarjetas
  return (
    <Link
      className={`nota tarjeta presionable entra ${categoria?.claseGrupo ?? ''}`}
      href={rutas.articulo(lang, articulo.slug)}
      style={retraso ? ({ '--retraso': `${retraso}ms` } as CSSProperties) : undefined}
    >
      <div className="media"><Imagen imagen={articulo.portada} sizes="(min-width: 720px) 33vw, 100vw" alt="" /></div>
      <div className="nota__cuerpo">
        <span>{categoria ? <span className="etiqueta">{categoria.nombre}</span> : <span className="etiqueta">{t.articulo}</span>}</span>
        <p className="titular">{articulo.titulo}</p>
        <p className="bajada">{articulo.resumen}</p>
        <div className="nota__pie">
          <span className="meta">{[articulo.autorNombre && t.por(articulo.autorNombre), fecha(articulo.publicadoEl, lang)].filter(Boolean).join(' · ')}</span>
          <span className="meta">{t.minutos(articulo.minutosLectura)}</span>
        </div>
      </div>
    </Link>
  )
}
