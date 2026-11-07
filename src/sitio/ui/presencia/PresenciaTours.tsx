import type { Locale } from '../../../dominio/idioma'
import { relacionadosVisibles, tipoDePagina, zonaDeTours } from '../../../dominio/presencia'
import { atribucion, rutasReservas } from '../../../dominio/rutas'
import { contextoDe } from '../../contexto'
import { lugaresCacheados, precioBarraDeSede, toursDeSede, zonasActivasCacheadas, type TourConFoto } from '../../datos/cacheadas'
import { porSlug } from '../../datos/consultas'
import { sitioUrl } from '../../entorno'
import { textos } from '../../textos'
import { Imagen } from '../Imagen'
import { PrecioTour } from '../PrecioTour'
import { ActivadorTours } from './ActivadorTours'

const MAX_TARJETA = 3

// Barra fija de tours (móvil), su fila extra y la tarjeta tardía (escritorio). Spec de presencia §2.2 y §2.3.
// Se pinta desde el slot @tours, fuera de la cabecera. `filtroZona` solo llega en páginas filtradas y en la búsqueda.
export async function PresenciaTours({ lang, segmentos, filtroZona }: { lang: Locale; segmentos: string[]; filtroZona: string | null }) {
  const tipo = tipoDePagina(segmentos)
  if (tipo === 'formulario' || tipo === 'privacidad') return null
  const [c, zonas] = await Promise.all([contextoDe(lang, segmentos), zonasActivasCacheadas(lang)])
  const zona = zonaDeTours({ tipo, filtroZona, zonaContexto: c.zona, zonas })
  const t = textos(lang).tours

  let tours: TourConFoto[] = []
  let precio: string | null = null
  if (zona) {
    const claves = tipo === 'ficha' ? (porSlug(await lugaresCacheados(lang), segmentos[1])?.toursRelacionados ?? []) : []
    const [todos, p] = await Promise.all([toursDeSede(zona.sedeSlug, lang), tipo === 'ficha' ? null : precioBarraDeSede(zona.sedeSlug, lang)])
    const primeros = relacionadosVisibles(todos, claves)
    tours = [...primeros, ...todos.filter((x) => !primeros.includes(x))]
    precio = p
  }

  const conBarra = tipo !== 'ficha'
  const primero = tours[0]
  const enlace = (pieza: string) => `?${atribucion(pieza)}`
  const deTour = (tour: TourConFoto, pieza: string) => ({
    href: `${sitioUrl()}${tour.ruta}${enlace(pieza)}`, 'data-evento': 'tour_clic', 'data-zona': zona?.slug ?? '', 'data-origen': 'tarjeta',
  })

  return (
    <>
      {conBarra && (
        <div id="tours-barra" className="barra-inferior barra-tours">
          {zona && primero && (
            <div id="tours-fila" className="barra-tours__fila" hidden>
              <a className="barra-tours__tour presionable" {...deTour(primero, `tarjeta-${zona.slug}`)} data-cerrar-tours="">
                <span className="barra-tours__nombre">{primero.nombre}</span>
                <PrecioTour lang={lang} tour={primero} Tag="b" />
              </a>
              <button type="button" className="barra-tours__cerrar" aria-label={t.cerrar} data-cerrar-tours="">×</button>
            </div>
          )}
          {zona ? (
            <a className="boton presionable" href={`${sitioUrl()}${rutasReservas.sede(lang, zona.sedeSlug)}${enlace(`barra-zona-${zona.slug}`)}`} data-evento="tour_clic" data-zona={zona.slug} data-origen="barra">
              {t.barra(zona.nombre, precio)} →
            </a>
          ) : (
            <a className="boton presionable" href={`${sitioUrl()}/${lang}${enlace('barra-baja')}`} data-evento="tour_clic" data-zona="" data-origen="barra">
              {t.barraBaja} →
            </a>
          )}
        </div>
      )}
      {zona && tours.length > 0 && (
        <aside id="tours-tarjeta" className="tarjeta-tours" aria-label={t.titulo(zona.nombre)} hidden>
          <div className="tarjeta-tours__cabeza">
            <p className="tarjeta-tours__titulo">{t.titulo(zona.nombre)}</p>
            <button type="button" className="tarjeta-tours__cerrar" aria-label={t.cerrar} data-cerrar-tours="">×</button>
          </div>
          {tours.slice(0, MAX_TARJETA).map((tour) => (
            <a key={tour.clave} className="tarjeta-tours__tour presionable" {...deTour(tour, `tarjeta-${zona.slug}`)} data-cerrar-tours="">
              {tour.foto && <div className="media"><Imagen imagen={tour.foto} sizes="64px" cargar="lazy" alt="" /></div>}
              <span>
                <span className="tarjeta-tours__nombre">{tour.nombre}</span>
                <PrecioTour lang={lang} tour={tour} Tag="b" />
              </span>
            </a>
          ))}
          <a className="tarjeta-tours__todos" href={`${sitioUrl()}${rutasReservas.sede(lang, zona.sedeSlug)}${enlace(`tarjeta-${zona.slug}`)}`} data-evento="tour_clic" data-zona={zona.slug} data-origen="tarjeta" data-cerrar-tours="">
            {t.verTodosLosTours}
          </a>
        </aside>
      )}
      <ActivadorTours />
    </>
  )
}
