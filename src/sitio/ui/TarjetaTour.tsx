import type { Locale } from '../../dominio/idioma'
import type { TourConFoto } from '../datos/cacheadas'
import { textos } from '../textos'
import { Imagen } from './Imagen'
import { detalles, EtiquetaTemporada, precioEnTexto, PrecioTour } from './PrecioTour'

type Enlace = { href: string; 'data-evento': string; 'data-zona': string; 'data-origen': string }

// Tarjeta grande de un tour. No sabe de qué página viene: el enlace y su atribución los arma quien la usa.
// La frase va en texto plano: es la que leen buscadores y asistentes.
export function TarjetaTour({ lang, tour, enlace }: { lang: Locale; tour: TourConFoto; enlace: Enlace }) {
  const t = textos(lang).tours
  const precio = precioEnTexto(lang, tour)
  return (
    <div className="b-tour">
      <a className="b-tour__tarjeta tarjeta presionable" {...enlace}>
        {tour.foto && <div className="media"><Imagen imagen={tour.foto} sizes="(min-width: 900px) 640px, 100vw" alt="" /></div>}
        <div className="b-tour__cuerpo">
          <p className="titular">{tour.nombre}</p>
          <PrecioTour lang={lang} tour={tour} clase="tour__precio" />
          <EtiquetaTemporada lang={lang} tour={tour} />
          {detalles(lang, tour) && <p className="meta">{detalles(lang, tour)}</p>}
          <span className="relacionado__accion">{t.verTour}</span>
        </div>
      </a>
      <p className="relacionado__frase">{precio ? `${tour.nombre}, ${t.desde} ${precio}.` : `${tour.nombre}.`}</p>
    </div>
  )
}
