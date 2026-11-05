'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { Locale } from '../../dominio/idioma'
import type { Imagen as ImagenT } from '../datos/tipos'
import { textos } from '../textos'
import { Imagen } from './Imagen'

export type Diapositiva = {
  id: string
  imagen: ImagenT | null
  etiqueta?: { nombre: string; clase: string }
  patrocinado: boolean
  titulo: string
  bajada: string
  ruta: string
}

const PASO = 6000

// Carrusel principal del mosaico de la zona (c-portal.html, .principal). Sin movimiento con reduced-motion.
export function Carrusel({ lang, diapositivas }: { lang: Locale; diapositivas: Diapositiva[] }) {
  const [i, setI] = useState(0)
  const [pausa, setPausa] = useState(false)
  const t = textos(lang)
  useEffect(() => {
    if (pausa || diapositivas.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setI((x) => (x + 1) % diapositivas.length), PASO)
    return () => window.clearInterval(id)
  }, [pausa, diapositivas.length])
  if (!diapositivas.length) return null
  return (
    <div className="principal" aria-roledescription="carrusel" aria-label={t.secciones.destacados}>
      {diapositivas.length > 1 && (
        <button className="principal__pausa" type="button" aria-label={pausa ? t.carrusel.reproducir : t.carrusel.pausar} onClick={() => setPausa((p) => !p)}>
          {pausa ? '▶' : '❚❚'}
        </button>
      )}
      {diapositivas.map((d, n) => (
        <article key={d.id} className={`diapo${n === i ? ' activa' : ''}`} aria-roledescription="diapositiva" aria-hidden={n !== i}>
          <Imagen imagen={d.imagen} cargar={n === 0 ? 'eager' : 'lazy'} sizes="(min-width: 900px) 66vw, 100vw" />
          <Link className="velo-texto" href={d.ruta} rel={d.patrocinado ? 'sponsored' : undefined} tabIndex={n === i ? undefined : -1}>
            {d.patrocinado && <><span className="patrocinado">{t.tarjetas.patrocinado}</span> </>}
            {d.etiqueta && <span className={`etiqueta ${d.etiqueta.clase}`}>{d.etiqueta.nombre}</span>}
            <h2 className="diapo__titulo">{d.titulo}</h2>
            <p className="diapo__bajada">{d.bajada}</p>
          </Link>
        </article>
      ))}
      {diapositivas.length > 1 && (
        <div className="flechas">
          <button type="button" aria-label={t.ficha.anterior} onClick={() => setI((i - 1 + diapositivas.length) % diapositivas.length)}>‹</button>
          <button type="button" aria-label={t.ficha.siguiente} onClick={() => setI((i + 1) % diapositivas.length)}>›</button>
        </div>
      )}
    </div>
  )
}
