'use client'

import { usePathname } from 'next/navigation'

import { esLocale } from '../../dominio/idioma'
import { rutas } from '../../dominio/rutas'
import '../estilos/no-encontrado.css'
import { textos } from '../textos'

// Sin datos: si falló la base, esto todavía se pinta.
export function ErrorGuia({ reintentar }: { reintentar: () => void }) {
  const seg = usePathname().split('/')[1]
  const lang = esLocale(seg) ? seg : 'es'
  const t = textos(lang).error
  return (
    <div className="ancho">
      <section className="perdido" role="alert">
        <div className="texto404">
          <h1>{t.titulo}</h1>
          <p>{t.texto}</p>
          <div className="salidas">
            <div>
              <button className="chip presionable" type="button" onClick={reintentar}>{t.reintentar}</button>
              <a className="chip presionable" href={rutas.portada(lang)}>{t.portada}</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
