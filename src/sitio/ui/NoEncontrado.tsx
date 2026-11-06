'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { esLocale } from '../../dominio/idioma'
import { rutas } from '../../dominio/rutas'
import { textos } from '../textos'

// not-found no recibe props: el idioma sale de split('/')[1] (en el servidor la ruta es la interna; el idioma es el mismo).
export function NoEncontrado() {
  const seg = usePathname().split('/')[1]
  const lang = esLocale(seg) ? seg : 'es'
  const t = textos(lang).noEncontrado
  return (
    <div className="ancho">
      <section className="perdido" aria-labelledby="titulo">
        <p className="cifra404" aria-hidden="true">404</p>
        <div className="texto404">
          <h1 id="titulo">{t.titulo}</h1>
          <p>{t.texto}</p>
          <form className="busca-404" role="search" action={rutas.buscar(lang)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <label className="solo-lector" htmlFor="q404">{textos(lang).cabecera.buscar}</label>
            <input id="q404" name="q" type="search" placeholder={textos(lang).cabecera.ejemplo} />
            <button type="submit">{t.buscar}</button>
          </form>
          <div className="salidas">
            <h2>{t.empieza}</h2>
            <div>
              <Link className="chip presionable" href={rutas.portada(lang)}>{t.portada}</Link>
              <Link className="chip presionable" href={rutas.eventos(lang)}>{t.eventos}</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
