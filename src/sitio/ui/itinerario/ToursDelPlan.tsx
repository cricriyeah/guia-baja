import type { Locale } from '../../../dominio/idioma'
import { atribucion } from '../../../dominio/rutas'
import type { TourConFoto } from '../../datos/cacheadas'
import { sitioUrl } from '../../entorno'
import { toursLd } from '../../seo/jsonld'
import { JsonLd } from '../JsonLd'
import { TarjetaTour } from '../TarjetaTour'
import type { Origen } from '../ToursEnZona'

// Recibe los tours ya resueltos por la página y emite el único JSON-LD de tours de esa página.
export function ToursDelPlan({ lang, titulo, tours, pieza, origen, zonaDe }: {
  lang: Locale; titulo: string; tours: TourConFoto[]; pieza: string; origen: Origen; zonaDe: (t: TourConFoto) => string
}) {
  if (!tours.length) return null
  return (
    <section className="bloque" aria-labelledby="t-tours-plan">
      <h2 id="t-tours-plan" className="t-seccion">{titulo}</h2>
      {tours.map((t) => (
        <TarjetaTour key={t.clave} lang={lang} tour={t} enlace={{ href: `${sitioUrl()}${t.ruta}?${atribucion(pieza)}`, 'data-evento': 'tour_clic', 'data-zona': zonaDe(t), 'data-origen': origen }} />
      ))}
      <JsonLd datos={toursLd(tours, { lang, base: sitioUrl() })} />
    </section>
  )
}
