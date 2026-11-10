'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { TipoBusqueda } from '../../dominio/busqueda'
import type { Locale } from '../../dominio/idioma'
import { textos } from '../textos'

type ZonaCabecera = { slug: string; nombre: string; ruta: string }
type Sugerencia = { tipo: TipoBusqueda; titulo: string; ruta: string }

const Lupa = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
)

// Comportamiento de c-base.js (cabecera): borde al bajar, zonas del celular que se esconden y hoja de búsqueda.
// usePathname: solo se lee split('/')[3] (zona); nunca se arma un href con él (plan F3a, «Regla de usePathname»).
export function CabeceraCliente(props: {
  lang: Locale
  portada: string
  buscar: string
  sugerencias: string
  zonas: ZonaCabecera[]
  children: ReactNode
}) {
  const { lang, portada, buscar, sugerencias, zonas, children } = props
  const t = textos(lang).cabecera
  const tb = textos(lang).busqueda
  const zonaActual = usePathname().split('/')[3]
  const cabecera = useRef<HTMLElement>(null)
  const botonBuscar = useRef<HTMLButtonElement>(null)
  const campoMovil = useRef<HTMLInputElement>(null)
  const [borde, setBorde] = useState(false)
  const [compacta, setCompacta] = useState(false)
  const [hoja, setHoja] = useState(false)
  const [q, setQ] = useState('')
  // Respuesta del último término que terminó de cargar. La lista anterior sigue a la vista mientras llega la nueva.
  const [respuesta, setRespuesta] = useState<{ q: string; lista: Sugerencia[] } | null>(null)

  useEffect(() => {
    const cab = cabecera.current
    if (!cab) return
    const medir = () => document.documentElement.style.setProperty('--cabecera', `${cab.offsetHeight}px`)
    let ultimo = window.scrollY
    const alMover = () => {
      const y = window.scrollY
      setBorde(y > 4)
      if (y > ultimo + 6 && y > 120) setCompacta(true)
      else if (y < ultimo - 6 || y < 120) setCompacta(false)
      ultimo = y
    }
    // La altura cambia al compactarse (la fila de zonas se esconde en el celular), no solo al cambiar la ventana:
    // con ResizeObserver lo pegajoso de debajo (filtros, herramientas) sigue pegado a la cabecera sin dejar hueco.
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(cab)
    window.addEventListener('scroll', alMover, { passive: true })
    return () => {
      observador.disconnect()
      window.removeEventListener('scroll', alMover)
    }
  }, [])

  useEffect(() => {
    if (!hoja) return
    const boton = botonBuscar.current
    document.body.style.overflow = 'hidden'
    const foco = window.setTimeout(() => campoMovil.current?.focus(), 60)
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setHoja(false)
    window.addEventListener('keydown', alTeclear)
    return () => {
      document.body.style.overflow = ''
      window.clearTimeout(foco)
      window.removeEventListener('keydown', alTeclear)
      boton?.focus()
    }
  }, [hoja])

  // Sugerencias por prefijo: a los 200 ms de dejar de teclear, y se cancela la petición que ya no sirve.
  // setRespuesta va dentro del callback del fetch, no directo en el efecto.
  useEffect(() => {
    const termino = q.trim()
    if (termino.length < 2) return
    const control = new AbortController()
    const espera = window.setTimeout(() => {
      fetch(`${sugerencias}?q=${encodeURIComponent(termino)}`, { signal: control.signal })
        .then((r) => (r.ok ? (r.json() as Promise<Sugerencia[]>) : null))
        .then((datos) => {
          if (datos) setRespuesta({ q: termino, lista: datos })
        })
        .catch(() => undefined)
    }, 200)
    return () => {
      window.clearTimeout(espera)
      control.abort()
    }
  }, [q, sugerencias])

  const termino = q.trim()
  const lista = termino.length < 2 ? [] : (respuesta?.lista ?? [])
  // «Sin resultados» solo cuando ya respondió el servidor por este término: no parpadea mientras la primera petición viaja.
  const sinResultados = termino.length >= 2 && respuesta?.q === termino && respuesta.lista.length === 0
  const panel = (lista.length > 0 || sinResultados) && (
    <div className="sugerencias">
      {lista.map((s) => (
        <Link key={`${s.tipo}-${s.ruta}`} href={s.ruta} onClick={() => {
            setQ('')
            setHoja(false)
          }}>
          {s.titulo}
          <span>{tb.tipos[s.tipo]}</span>
        </Link>
      ))}
      {sinResultados && <p>{tb.sinResultados}</p>}
    </div>
  )

  const enlaces = (
    <>
      <Link className="zona" href={portada} aria-current={zonaActual === undefined ? 'page' : undefined}>
        {t.todaLaBaja}
      </Link>
      {zonas.map((z) => (
        <Link key={z.slug} className="zona" href={z.ruta} aria-current={z.slug === zonaActual ? 'page' : undefined}>
          {z.nombre}
        </Link>
      ))}
    </>
  )

  return (
    <>
      <header ref={cabecera} id="guia-cab" className={`guia-cab${borde ? ' con-borde' : ''}${compacta ? ' compacta' : ''}`}>
        <div className="ancho guia-cab__fila">
          <Link className="sello" href={portada} aria-label={t.sello}>
            <img src="/guia-assets/logos/logosm.svg" width={36} height={36} alt="" />
            <span className="sello__txt" aria-hidden="true">
              <small>Sun Baja</small>
              <b>{textos(lang).guia}</b>
            </span>
          </Link>
          <nav className="guia-cab__zonas" aria-label={t.zonas}>{enlaces}</nav>
          <div className="guia-cab__der">
            <form className="busca" role="search" action={buscar}>
              <Lupa />
              <label className="solo-lector" htmlFor="q">{t.buscar}</label>
              <input id="q" type="search" name="q" placeholder={t.buscar} autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
              {panel}
            </form>
            <button ref={botonBuscar} className="busca-movil presionable" type="button" aria-label={t.buscar} onClick={() => setHoja(true)}>
              <Lupa />
            </button>
            {children}
          </div>
        </div>
        <div className="guia-cab__zonas-movil">
          <div>
            <nav className="ancho guia-cab__zonas" aria-label={t.zonas}>{enlaces}</nav>
          </div>
        </div>
      </header>
      {/* inert en lugar de hidden: la transición de .busqueda/.abierta de c-base.css sigue funcionando. */}
      <div className={`busqueda${hoja ? ' abierta' : ''}`} role="dialog" aria-modal="true" aria-label={t.buscar} inert={!hoja}>
        <form className="busqueda__cabeza" role="search" action={buscar}>
          <label>
            <Lupa />
            <span className="solo-lector">{t.buscar}</span>
            <input ref={campoMovil} type="search" name="q" placeholder={t.ejemplo} autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <button type="button" onClick={() => setHoja(false)}>{t.cancelar}</button>
        </form>
        <div className="busqueda__cuerpo">{panel}</div>
      </div>
    </>
  )
}
