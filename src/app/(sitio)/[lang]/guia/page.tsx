import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { esLocale, LOCALES, type Locale } from '../../../../dominio/idioma'
import { patrocinioDeclarado } from '../../../../dominio/patrocinio'
import { rutas } from '../../../../dominio/rutas'
import {
  ajustesCacheados, articulosCacheados, categoriasCacheadas, eventosCacheados, lugaresCacheados, zonasActivasCacheadas, itinerariosCacheados, temasCacheados,
} from '../../../../sitio/datos/cacheadas'
import { categoriasConLugares, conteoCombinacion, destacados, eventosProximos, lugaresDe, porId, type ItemDestacado, planesSinZona } from '../../../../sitio/datos/consultas'
import type { CategoriaPublica } from '../../../../sitio/datos/tipos'
import { guiaIndexable, sitioUrl } from '../../../../sitio/entorno'
import { migasLd } from '../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../sitio/seo/metadatos'
import { textos } from '../../../../sitio/textos'
import { Aparece } from '../../../../sitio/ui/Aparece'
import { TemporadaPortada } from '../../../../sitio/ui/TemporadaPortada'
import { Patrocinado } from '../../../../sitio/ui/Etiquetas'
import { SeccionPlanes } from '../../../../sitio/ui/SeccionPlanes'
import { Imagen } from '../../../../sitio/ui/Imagen'
import { JsonLd } from '../../../../sitio/ui/JsonLd'
import { FilaAgenda } from '../../../../sitio/ui/tarjetas/FilaAgenda'
import { TarjetaArticulo } from '../../../../sitio/ui/tarjetas/TarjetaArticulo'

export const revalidate = 3600

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!esLocale(lang)) return {}
  const a = await ajustesCacheados(lang)
  const t = textos(lang).portada
  const indexable = guiaIndexable()
  return metadatos({
    lang,
    titulo: a.portadaTitulo ?? t.titulo,
    descripcion: a.portadaIntro ?? t.intro,
    ruta: rutas.portada(lang),
    indexable,
    versiones: LOCALES.map((l) => ({ lang: l, ruta: rutas.portada(l), indexable })),
    imagenOg: rutas.og(lang, 'portada'),
  })
}

function Destacada({ lang, d, cats, primera }: { lang: Locale; d: ItemDestacado; cats: CategoriaPublica[]; primera: boolean }) {
  const ruta = d.tipo === 'lugar' ? rutas.lugar(lang, d.item.slug) : d.tipo === 'evento' ? rutas.evento(lang, d.item.slug) : d.tipo === 'articulo' ? rutas.articulo(lang, d.item.slug) : d.tipo === 'itinerario' ? rutas.itinerario(lang, d.item.slug) : rutas.tema(lang, d.item.slug)
  const imagen = 'portada' in d.item ? d.item.portada : d.item.foto
  const titulo = 'titulo' in d.item ? d.item.titulo : d.item.nombre
  const cat = cats.find((c) => c.id === d.item.categoriaIds[0])
  // Spec §6: un lugar o evento destacado con patrocinio declarado lleva su etiqueta también aquí.
  const declarado = (d.tipo === 'lugar' || d.tipo === 'evento') && patrocinioDeclarado(d.item.patrocinio)
  return (
    <Link className={`destacado tarjeta presionable ${cat?.claseGrupo ?? ''}`} href={ruta} rel={declarado ? 'sponsored' : undefined}>
      <div className="media"><Imagen imagen={imagen} prioridad={primera} sizes={primera ? '(min-width: 900px) 66vw, 100vw' : '(min-width: 900px) 33vw, 100vw'} alt="" /></div>
      <div className="velo-texto">
        {declarado && <><Patrocinado lang={lang} /> </>}
        {cat && <span className="etiqueta">{cat.nombre}</span>}
        <p className="titular">{titulo}</p>
        <p className="meta">{d.item.resumen}</p>
      </div>
    </Link>
  )
}

// Portada de c-portada.html: encabezado, destacados, zonas, próximos eventos, artículos, categorías y franja de negocios.
export default async function Portada({ params }: Props) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  const [ajustes, zonas, cats, lugares, eventos, articulos, itinerarios, temas] = await Promise.all([
    ajustesCacheados(lang), zonasActivasCacheadas(lang), categoriasCacheadas(lang),
    lugaresCacheados(lang), eventosCacheados(lang), articulosCacheados(lang), itinerariosCacheados(lang), temasCacheados(lang),
  ])
  const t = textos(lang)
  const ahora = new Date().toISOString()
  const proximos = eventosProximos(eventos, ahora, {})
  const top = destacados({ lugares, eventos, articulos, itinerarios, temas }, ahora).slice(0, 3)
  const catDe = (ids: number[]) => cats.find((c) => c.id === ids[0])
  return (
    <div className="ancho">
      <section className="encabezado" aria-labelledby="titulo">
        <h1 id="titulo" className="t-pagina">{ajustes.portadaTitulo ?? t.portada.titulo}</h1>
        <p>{ajustes.portadaIntro ?? t.portada.intro}</p>
      </section>

      {top.length > 0 && (
        <section className="destacados" aria-label={t.secciones.destacados}>
          {top.map((d, i) => <Destacada key={`${d.tipo}-${d.item.id}`} lang={lang} d={d} cats={cats} primera={i === 0} />)}
        </section>
      )}

      <section className="seccion" aria-labelledby="t-zonas">
        <div className="seccion__cabeza"><h2 id="t-zonas" className="t-seccion">{t.portada.zonas}</h2></div>
        <div className="zonas-rejilla">
          {zonas.map((z) => (
            <Link key={z.id} className="zona-tarjeta tarjeta presionable entra" href={rutas.zona(lang, z.slug)}>
              <div className="media"><Imagen imagen={z.foto} sizes="(min-width: 720px) 33vw, 100vw" alt="" /></div>
              <span className="flecha" aria-hidden="true">→</span>
              <div className="velo-texto">
                <h3>{z.nombre}</h3>
                {z.descripcion && <p>{z.descripcion}</p>}
                <div className="cifras">
                  <span>{t.tarjetas.lugares(lugaresDe(lugares, { zonaId: z.id }).length)}</span>
                  <span>{t.tarjetas.eventos(eventosProximos(eventos, ahora, { zonaId: z.id }).length)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <TemporadaPortada lang={lang} zonas={zonas} />
      <SeccionPlanes lang={lang} id="t-planes-baja" titulo={t.plan.planesBaja} planes={planesSinZona(temas, { lugares, zonasActivasIds: zonas.map((z) => z.id) }, new Date())} />

      {proximos.length > 0 && (
        <section className="seccion" aria-labelledby="t-eventos">
          <div className="seccion__cabeza">
            <h2 id="t-eventos" className="t-seccion">{t.secciones.proximosEventos}</h2>
            <Link href={rutas.eventos(lang)}>{t.secciones.todosLosEventos}</Link>
          </div>
          <div className="agenda">
            {proximos.slice(0, 6).map((e) => (
              <FilaAgenda key={e.id} lang={lang} evento={e} categoria={catDe(e.categoriaIds)} lugarNombre={porId(lugares, e.lugarId)?.nombre} />
            ))}
          </div>
        </section>
      )}

      {articulos.length > 0 && (
        <section className="seccion" aria-labelledby="t-articulos">
          <div className="seccion__cabeza"><h2 id="t-articulos" className="t-seccion">{t.secciones.articulosRecientes}</h2></div>
          <div className="articulos">
            {articulos.slice(0, 3).map((a, i) => <TarjetaArticulo key={a.id} lang={lang} articulo={a} categoria={catDe(a.categoriaIds)} retraso={i * 80} />)}
          </div>
        </section>
      )}

      <section className="seccion" aria-labelledby="t-cat">
        <div className="seccion__cabeza"><h2 id="t-cat" className="t-seccion">{t.portada.categorias}</h2></div>
        <div className="categorias">
          {categoriasConLugares(lugares, cats).map((c) => (
            <Link key={c.id} className={`cat ${c.claseGrupo} presionable`} href={rutas.categoria(lang, c.slug)}>
              <strong>{c.nombre}</strong>
              <span>{t.tarjetas.lugares(conteoCombinacion(lugares, null, c.id))}</span>
            </Link>
          ))}
        </div>
      </section>

      <Aparece lang={lang} />
      <JsonLd datos={migasLd([{ nombre: t.migas.guia, ruta: rutas.portada(lang) }], sitioUrl())} />
    </div>
  )
}
