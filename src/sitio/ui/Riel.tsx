// src/sitio/ui/Riel.tsx
'use client'

import { useRef, type ReactNode } from 'react'

import type { Locale } from '../../dominio/idioma'
import { textos } from '../textos'

// Riel deslizable con botones (c-base.js, .riel__boton).
export function Riel({ lang, children, className = '' }: { lang: Locale; children: ReactNode; className?: string }) {
  const pista = useRef<HTMLDivElement>(null)
  const t = textos(lang).ficha
  const mover = (dir: number) => {
    const el = pista.current
    if (!el) return
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: el.clientWidth * 0.8 * dir, behavior: reducido ? 'auto' : 'smooth' })
  }
  return (
    <div className="riel">
      <button className="riel__boton riel__boton--izq" type="button" aria-label={t.anterior} onClick={() => mover(-1)}>‹</button>
      <div className={`riel__pista ${className}`} ref={pista}>{children}</div>
      <button className="riel__boton riel__boton--der" type="button" aria-label={t.siguiente} onClick={() => mover(1)}>›</button>
    </div>
  )
}
