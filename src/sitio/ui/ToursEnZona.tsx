import type { Locale } from '../../dominio/idioma'
import { atribucion, rutasReservas } from '../../dominio/rutas'
import { toursDeSede, zonasActivasCacheadas, type TourConFoto } from '../datos/cacheadas'
import { porId } from '../datos/consultas'
import type { ZonaPublica } from '../datos/tipos'
import { whatsappTours } from '../datos/whatsapp'
import { sitioUrl } from '../entorno'
import { toursLd } from '../seo/jsonld'
import { textos } from '../textos'
import { EnlaceWhatsapp } from './EnlaceWhatsapp'
import { Imagen } from './Imagen'
import { JsonLd } from './JsonLd'
import { detalles, EtiquetaTemporada, PrecioTour } from './PrecioTour'
import { Riel } from './Riel'

// Orígenes de `tour_clic` (spec §13 y spec de presencia §3).
export type Origen = 'zona' | 'lugar' | 'articulo' | 'categoria' | 'evento' | 'busqueda' | 'itinerario' | 'tema'
type Comunes = { lang: Locale; zona: ZonaPublica; pieza: string; origen: Origen }

// «Tours en esta zona» (spec §8.1). Tres formatos del diseño: riel (zona y categoría), fila (ficha) y bloque (artículo).
// Sin sede o sin tours (catálogo caído incluido) no pinta nada. `excluir`: claves que ya salen en la página (relacionados).
export async function ToursEnZona({ lang, zona, pieza, origen, formato, claseRiel, limite, excluir }: Comunes & {
  formato: 'riel' | 'fila' | 'bloque'; claseRiel?: string; limite?: number; excluir?: readonly string[]
}) {
  if (!zona.sedeSlug) return null
  const tours = (await toursDeSede(zona.sedeSlug, lang)).filter((x) => !excluir?.includes(x.clave)).slice(0, limite)
  if (!tours.length) return null
  const whatsapp = formato === 'riel' ? await whatsappTours(lang) : null
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
              <div className="txt">{tour.nombre}<PrecioTour lang={lang} tour={tour} Tag="b" /><EtiquetaTemporada lang={lang} tour={tour} /></div>
            </a>
          ))}
        </div>
        <JsonLd datos={toursLd(tours, { lang, base: sitioUrl() })} />
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
              <PrecioTour lang={lang} tour={tour} clase="tour__precio" /><EtiquetaTemporada lang={lang} tour={tour} />
              {detalles(lang, tour) && <p className="meta">{detalles(lang, tour)}</p>}
            </div>
          </a>
        ))}
        <a {...verTodos}>{t.verTodosLosTours}</a>
        <JsonLd datos={toursLd(tours, { lang, base: sitioUrl() })} />
      </section>
    )
  }

  return (
    <section className="seccion" aria-labelledby={idTitulo}>
      <div className="seccion__cabeza">
        <h2 id={idTitulo} className="t-seccion">{titulo}</h2>
        <a {...verTodos}>{t.verTodos}</a>
        {whatsapp && <EnlaceWhatsapp lang={lang} digitos={whatsapp} nombre={zona.nombre} zona={zona.slug} origen="zona" />}
      </div>
      <Riel lang={lang} className={claseRiel}>
        {tours.map((tour) => tour.foto ? (
          <a key={tour.clave} className="tour tarjeta presionable" {...enlace(tour)}>
            <div className="media"><Imagen imagen={tour.foto} sizes="300px" alt="" /></div>
            <div className="tour__cuerpo">
              <p className="titular">{tour.nombre}</p>
              <PrecioTour lang={lang} tour={tour} clase="tour__precio" /><EtiquetaTemporada lang={lang} tour={tour} />
              {detalles(lang, tour) && <p className="meta">{detalles(lang, tour)}</p>}
            </div>
          </a>
        ) : (
          // Sin registro en Fotos de tours, la tarjeta es de texto (spec §8.1).
          <a key={tour.clave} className="tour-texto presionable" {...enlace(tour)}>
            <p className="titular">{tour.nombre}</p>
            <div>
              <PrecioTour lang={lang} tour={tour} clase="tour-texto__precio" /><EtiquetaTemporada lang={lang} tour={tour} />
              <div className="tour-texto__pie"><span>{detalles(lang, tour)}</span><span>{t.reservar}</span></div>
            </div>
          </a>
        ))}
      </Riel>
      <JsonLd datos={toursLd(tours, { lang, base: sitioUrl() })} />
    </section>
  )
}

// Bloque «Tours en esta zona» de un artículo: el cuerpo solo guarda el id de la zona. Una zona que no existe para el público no pinta nada.
export async function BloqueTours({ lang, zonaId, pieza }: { lang: Locale; zonaId: number; pieza: string }) {
  const zona = porId(await zonasActivasCacheadas(lang), zonaId)
  return zona ? <ToursEnZona lang={lang} zona={zona} pieza={pieza} origen="articulo" formato="bloque" limite={3} /> : null
}
