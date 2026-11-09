import type { Locale } from '../../dominio/idioma'
import { atribucion } from '../../dominio/rutas'
import { unoPorZona } from '../../dominio/temporada'
import { toursDeSede, type TourConFoto } from '../datos/cacheadas'
import type { ZonaPublica } from '../datos/tipos'
import { sitioUrl } from '../entorno'
import { toursLd } from '../seo/jsonld'
import { textos } from '../textos'
import { JsonLd } from './JsonLd'
import { TarjetaTour } from './TarjetaTour'

const MAX = 3

// «En temporada este mes» (spec del paquete 1 §2.4). Sin tours en temporada no hay sección.
export async function TemporadaPortada({ lang, zonas }: { lang: Locale; zonas: ZonaPublica[] }) {
  const conSede = zonas.filter((z) => z.sedeSlug)
  const listas = await Promise.all(conSede.map(async (z) => (await toursDeSede(z.sedeSlug!, lang)).filter((t) => t.enTemporada).map((t) => ({ t, z }))))
  const elegidos = unoPorZona(listas, MAX)
  if (!elegidos.length) return null
  const tours: TourConFoto[] = elegidos.map((e) => e.t)
  return (
    <section className="seccion" aria-labelledby="t-temporada">
      <div className="seccion__cabeza"><h2 id="t-temporada" className="t-seccion">{textos(lang).tours.enTemporadaMes}</h2></div>
      {elegidos.map(({ t, z }) => (
        <TarjetaTour key={t.clave} lang={lang} tour={t} enlace={{ href: `${sitioUrl()}${t.ruta}?${atribucion('portada-temporada')}`, 'data-evento': 'tour_clic', 'data-zona': z.slug, 'data-origen': 'zona' }} />
      ))}
      <JsonLd datos={toursLd(tours, { lang, base: sitioUrl() })} />
    </section>
  )
}
