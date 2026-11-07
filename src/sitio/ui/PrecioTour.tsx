import type { Locale } from '../../dominio/idioma'
import type { TourConFoto } from '../datos/cacheadas'
import { textos } from '../textos'

// Piezas de texto de una tarjeta de tour (spec §8.1), compartidas por ToursEnZona, ToursRelacionados y la tarjeta tardía.
// «$11,290 MXN por grupo»: la moneda y la estrategia, sin «desde».
export function precioEnTexto(lang: Locale, tour: TourConFoto): string | null {
  if (!tour.precio) return null
  return [tour.precio.monto, tour.precio.moneda, textos(lang).tours.por[tour.precio.estrategia]].filter(Boolean).join(' ')
}

export function PrecioTour({ lang, tour, Tag = 'p', clase }: { lang: Locale; tour: TourConFoto; Tag?: 'p' | 'b'; clase?: string }) {
  const t = textos(lang).tours
  if (!tour.precio) return null
  const resto = [tour.precio.moneda, t.por[tour.precio.estrategia]].filter(Boolean).join(' ')
  return <Tag className={clase}>{t.desde} {tour.precio.monto} <small>{resto}</small></Tag>
}

export const detalles = (lang: Locale, tour: TourConFoto): string =>
  [tour.duracion, tour.noches ? textos(lang).tours.noches(tour.noches) : null, tour.temporada].filter(Boolean).join(' · ')
