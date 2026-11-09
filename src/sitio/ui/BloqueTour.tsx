import type { Locale } from '../../dominio/idioma'
import { relacionadosVisibles } from '../../dominio/presencia'
import { atribucion } from '../../dominio/rutas'
import { toursDeSede, zonasActivasCacheadas } from '../datos/cacheadas'
import { porId } from '../datos/consultas'
import { sitioUrl } from '../entorno'
import { toursLd } from '../seo/jsonld'
import { JsonLd } from './JsonLd'
import { TarjetaTour } from './TarjetaTour'
import type { Origen } from './ToursEnZona'

// Bloque «Tour» (spec del paquete 1 §2.1). Sin zona pública, sin sede, con el catálogo caído o con una clave que ya no
// existe, no pinta nada: nunca lo cambia por otro tour.
export async function BloqueTour({ lang, zonaId, clave, pieza, origen }: { lang: Locale; zonaId: number; clave: string; pieza: string; origen: Origen }) {
  const zona = porId(await zonasActivasCacheadas(lang), zonaId)
  if (!zona?.sedeSlug) return null
  const [tour] = relacionadosVisibles(await toursDeSede(zona.sedeSlug, lang), [clave])
  if (!tour) return null
  const enlace = { href: `${sitioUrl()}${tour.ruta}?${atribucion(pieza)}`, 'data-evento': 'tour_clic', 'data-zona': zona.slug, 'data-origen': origen }
  return (
    <>
      <TarjetaTour lang={lang} tour={tour} enlace={enlace} />
      <JsonLd datos={toursLd([tour], { lang, base: sitioUrl() })} />
    </>
  )
}
