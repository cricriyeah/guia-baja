import type { Locale } from '../../dominio/idioma'
import { atribucion } from '../../dominio/rutas'
import type { TourConFoto } from '../datos/cacheadas'
import { sitioUrl } from '../entorno'
import { textos } from '../textos'
import { Imagen } from './Imagen'
import { detalles, precioEnTexto, PrecioTour } from './PrecioTour'

// «Tours para conocer {lugar}» (spec de presencia §2.1). La frase de texto va en el HTML: es la que leen buscadores y
// asistentes. El primero va grande. Sin tours relacionados visibles no pinta nada.
export function ToursRelacionados({ lang, lugar, tours }: { lang: Locale; lugar: { slug: string; nombre: string; zonaSlug: string }; tours: TourConFoto[] }) {
  if (!tours.length) return null
  const t = textos(lang).tours
  const consulta = atribucion(`relacionado-${lugar.slug}`)
  return (
    <section className="bloque relacionados" aria-labelledby="t-relacionados">
      <h2 id="t-relacionados" className="t-seccion">{t.paraConocer(lugar.nombre)}</h2>
      {tours.map((tour, i) => (
        <div key={tour.clave} className={`relacionado${i === 0 ? ' relacionado--grande' : ''}`}>
          <a className="relacionado__tarjeta tarjeta presionable" href={`${sitioUrl()}${tour.ruta}?${consulta}`} data-evento="tour_clic" data-zona={lugar.zonaSlug} data-origen="relacionado">
            {tour.foto && <div className="media"><Imagen imagen={tour.foto} sizes={i === 0 ? '(min-width: 900px) 640px, 100vw' : '120px'} alt="" /></div>}
            <div className="relacionado__cuerpo">
              <p className="titular">{tour.nombre}</p>
              <PrecioTour lang={lang} tour={tour} clase="tour__precio" />
              {detalles(lang, tour) && <p className="meta">{detalles(lang, tour)}</p>}
              <span className="relacionado__accion">{t.reservar}</span>
            </div>
          </a>
          <p className="relacionado__frase">{t.frase(lugar.nombre, tour.nombre, precioEnTexto(lang, tour))}</p>
        </div>
      ))}
    </section>
  )
}
