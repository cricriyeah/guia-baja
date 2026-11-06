'use client'

import { useEffect, useState } from 'react'

import type { Locale } from '../../dominio/idioma'
import type { Imagen as ImagenT } from '../datos/tipos'
import { textos } from '../textos'
import { Imagen } from './Imagen'

const VISIBLES = 5

// Galería de la ficha con visor (c-ficha.html, .galeria y .visor). El visor muestra el crédito de cada foto.
export function Galeria({ lang, nombre, fotos }: { lang: Locale; nombre: string; fotos: ImagenT[] }) {
  const t = textos(lang).ficha
  const [abierta, setAbierta] = useState<number | null>(null)
  useEffect(() => {
    if (abierta === null) return
    document.body.style.overflow = 'hidden'
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierta(null)
      if (e.key === 'ArrowRight') setAbierta((i) => (i === null ? i : (i + 1) % fotos.length))
      if (e.key === 'ArrowLeft') setAbierta((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length))
    }
    window.addEventListener('keydown', tecla)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', tecla)
    }
  }, [abierta, fotos.length])
  if (!fotos.length) return null
  const actual = abierta === null ? null : fotos[abierta]
  return (
    <>
      <div className="galeria-envoltura">
        <div className="galeria">
          {fotos.slice(0, VISIBLES).map((f, i) => (
            <button key={f.src} type="button" aria-label={t.foto(i + 1, fotos.length)} onClick={() => setAbierta(i)}>
              <Imagen imagen={f} cargar={i < 3 ? 'eager' : 'lazy'} prioridad={i === 0} sizes={i === 0 ? '(min-width: 900px) 60vw, 100vw' : '(min-width: 900px) 20vw, 50vw'} />
              {i === VISIBLES - 1 && fotos.length > VISIBLES && <span className="galeria__mas">{t.verFotos(fotos.length)}</span>}
            </button>
          ))}
        </div>
        <span className="contador">1 / {fotos.length}</span>
      </div>
      {actual && abierta !== null && (
        <div className="visor mostrado" role="dialog" aria-modal="true" aria-label={nombre}>
          <div className="visor__cabeza">
            <span>{abierta + 1} / {fotos.length}</span>
            <button className="visor__cerrar" type="button" aria-label={t.cerrar} onClick={() => setAbierta(null)} autoFocus>✕</button>
          </div>
          <div className="visor__pista"><Imagen imagen={actual} sizes="100vw" cargar="eager" /></div>
          <div className="visor__pie">{actual.alt}{actual.credito ? ` · ${actual.credito}` : ''}</div>
          <button className="visor__flecha visor__flecha--izq" type="button" aria-label={t.anterior} onClick={() => setAbierta((abierta - 1 + fotos.length) % fotos.length)}>‹</button>
          <button className="visor__flecha visor__flecha--der" type="button" aria-label={t.siguiente} onClick={() => setAbierta((abierta + 1) % fotos.length)}>›</button>
        </div>
      )}
    </>
  )
}
