import type { Locale } from '../../../dominio/idioma'
import { paradaVisible, type Dia } from '../../../dominio/itinerarios'
import { atribucion } from '../../../dominio/rutas'
import type { TourConFoto } from '../../datos/cacheadas'
import type { Resolutor } from '../../datos/consultas'
import type { CategoriaPublica, Imagen, TarjetaLugar } from '../../datos/tipos'
import { sitioUrl } from '../../entorno'
import { textos } from '../../textos'
import { CuerpoRico } from '../CuerpoRico'
import { TarjetaLugar as Tarjeta } from '../tarjetas/TarjetaLugar'
import { TarjetaTour } from '../TarjetaTour'

// `notas`: las notas ya enlazadas, con clave `{índice del día}-{índice de la parada}` contados sobre el documento.
export function DiaItinerario({ lang, n, dia, lugares, tours, categorias, zona, slug, notas, resolutor, media }: {
  lang: Locale; n: number; dia: Dia; lugares: Map<number, TarjetaLugar>; tours: Map<string, TourConFoto>
  categorias: CategoriaPublica[]; zona: { slug: string; nombre: string }; slug: string
  notas: Map<string, unknown>; resolutor: Resolutor; media: Record<string, Imagen>
}) {
  const visibles = dia.paradas.map((p, i) => ({ p, i })).filter(({ p }) => paradaVisible(p, p.lugarId !== null && lugares.has(p.lugarId), p.tour !== null && tours.has(p.tour)))
  if (!visibles.length) return null
  return (
    <section className="bloque dia-itinerario">
      <h2 className="t-seccion">{textos(lang).plan.dia(n, dia.titulo)}</h2>
      {visibles.map(({ p, i }) => {
        const lugar = p.lugarId !== null ? lugares.get(p.lugarId) : undefined
        const tour = p.tour ? tours.get(p.tour) : undefined
        return (
          <div key={i} className="parada">
            {p.hora && <p className="parada__hora">{p.hora}</p>}
            {lugar && <Tarjeta lang={lang} lugar={lugar} categoria={categorias.find((c) => c.id === lugar.categoriaIds[0])} zonaNombre={zona.nombre} />}
            {tour && <TarjetaTour lang={lang} tour={tour} enlace={{ href: `${sitioUrl()}${tour.ruta}?${atribucion(`itinerario-${slug}-dia${n}`)}`, 'data-evento': 'tour_clic', 'data-zona': zona.slug, 'data-origen': 'itinerario' }} />}
            {p.nota && <CuerpoRico lang={lang} cuerpo={notas.get(`${n - 1}-${i}`)} resolutor={resolutor} media={media} categorias={categorias} className="parada__nota" />}
          </div>
        )
      })}
    </section>
  )
}
