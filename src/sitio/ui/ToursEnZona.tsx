import type { Locale } from '../../dominio/idioma'
import { atribucion, rutasReservas } from '../../dominio/rutas'
import { toursDeSede, zonasActivasCacheadas, type TourConFoto } from '../datos/cacheadas'
import { porId } from '../datos/consultas'
import type { ZonaPublica } from '../datos/tipos'
import { sitioUrl } from '../entorno'
import { textos } from '../textos'
import { Imagen } from './Imagen'
import { Riel } from './Riel'

type Origen = 'zona' | 'lugar' | 'articulo' | 'categoria'
type Comunes = { lang: Locale; zona: ZonaPublica; pieza: string; origen: Origen }

function PrecioTour({ lang, tour, Tag = 'p', clase }: { lang: Locale; tour: TourConFoto; Tag?: 'p' | 'b'; clase?: string }) {
  const t = textos(lang).tours
  if (!tour.precio) return null
  const resto = [tour.precio.moneda, t.por[tour.precio.estrategia]].filter(Boolean).join(' ')
  return <Tag className={clase}>{t.desde} {tour.precio.monto} <small>{resto}</small></Tag>
}

const detalles = (lang: Locale, tour: TourConFoto): string =>
  [tour.duracion, tour.noches ? textos(lang).tours.noches(tour.noches) : null, tour.temporada].filter(Boolean).join(' · ')

// «Tours en esta zona» (spec §8.1). Tres formatos del diseño: riel (zona y categoría), fila (ficha) y bloque (artículo).
// Sin sede o sin tours (catálogo caído incluido) no pinta nada.
export async function ToursEnZona({ lang, zona, pieza, origen, formato, claseRiel, limite }: Comunes & { formato: 'riel' | 'fila' | 'bloque'; claseRiel?: string; limite?: number }) {
  if (!zona.sedeSlug) return null
  const tours = (await toursDeSede(zona.sedeSlug, lang)).slice(0, limite)
  if (!tours.length) return null
  const sede = zona.sedeSlug
  const t = textos(lang).tours
  const titulo = t.titulo(zona.nombre)
  const consulta = atribucion(pieza)
  const enlace = (tour: TourConFoto) => ({
    href: `${sitioUrl()}${tour.ruta}?${consulta}`,
    'data-evento': 'tour_clic',
    'data-zona': zona.slug,
    'data-origen': origen,
  })
  const verTodos = { href: `${sitioUrl()}${rutasReservas.sede(lang, sede)}?${consulta}`, 'data-evento': 'tour_clic', 'data-zona': zona.slug, 'data-origen': origen }
  const idTitulo = `t-tours-${zona.slug}`

  if (formato === 'bloque') {
    return (
      <section className="b-tours" aria-label={titulo}>
        <h3>{titulo}</h3>
        <div className="b-tours__lista">
          {tours.map((tour) => (
            <a key={tour.clave} className="presionable" {...enlace(tour)}>
              {tour.foto && <div className="media"><Imagen imagen={tour.foto} sizes="240px" alt="" /></div>}
              <div className="txt">{tour.nombre}<PrecioTour lang={lang} tour={tour} Tag="b" /></div>
            </a>
          ))}
        </div>
      </section>
    )
  }

  if (formato === 'fila') {
    return (
      <section className="tours-zona" aria-labelledby={idTitulo}>
        <h2 id={idTitulo}>{titulo}</h2>
        {tours.map((tour) => (
          <a key={tour.clave} className={`tour-fila tarjeta presionable${tour.foto ? '' : ' tour-fila--texto'}`} {...enlace(tour)}>
            {tour.foto && <div className="media"><Imagen imagen={tour.foto} sizes="76px" alt="" /></div>}
            <div>
              <p className="titular">{tour.nombre}</p>
              <PrecioTour lang={lang} tour={tour} clase="tour__precio" />
              {detalles(lang, tour) && <p className="meta">{detalles(lang, tour)}</p>}
            </div>
          </a>
        ))}
        <a {...verTodos}>{t.verTodosLosTours}</a>
      </section>
    )
  }

  return (
    <section className="seccion" aria-labelledby={idTitulo}>
      <div className="seccion__cabeza">
        <h2 id={idTitulo} className="t-seccion">{titulo}</h2>
        <a {...verTodos}>{t.verTodos}</a>
      </div>
      <Riel lang={lang} className={claseRiel}>
        {tours.map((tour) => tour.foto ? (
          <a key={tour.clave} className="tour tarjeta presionable" {...enlace(tour)}>
            <div className="media"><Imagen imagen={tour.foto} sizes="300px" alt="" /></div>
            <div className="tour__cuerpo">
              <p className="titular">{tour.nombre}</p>
              <PrecioTour lang={lang} tour={tour} clase="tour__precio" />
              {detalles(lang, tour) && <p className="meta">{detalles(lang, tour)}</p>}
            </div>
          </a>
        ) : (
          // Sin registro en Fotos de tours, la tarjeta es de texto (spec §8.1).
          <a key={tour.clave} className="tour-texto presionable" {...enlace(tour)}>
            <p className="titular">{tour.nombre}</p>
            <div>
              <PrecioTour lang={lang} tour={tour} clase="tour-texto__precio" />
              <div className="tour-texto__pie"><span>{detalles(lang, tour)}</span><span>{t.reservar}</span></div>
            </div>
          </a>
        ))}
      </Riel>
    </section>
  )
}

// Bloque «Tours en esta zona» de un artículo: el cuerpo solo guarda el id de la zona. Una zona que no existe para el público no pinta nada.
export async function BloqueTours({ lang, zonaId, pieza }: { lang: Locale; zonaId: number; pieza: string }) {
  const zona = porId(await zonasActivasCacheadas(lang), zonaId)
  return zona ? <ToursEnZona lang={lang} zona={zona} pieza={pieza} origen="articulo" formato="bloque" limite={3} /> : null
}
