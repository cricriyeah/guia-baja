import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { kmEnLineaRecta } from '../../../../../dominio/distancia'
import { esLocale, LOCALES, type Locale } from '../../../../../dominio/idioma'
import { ordenarListado } from '../../../../../dominio/orden'
import { patrocinioDeclarado } from '../../../../../dominio/patrocinio'
import { rutas } from '../../../../../dominio/rutas'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, lugaresCacheados, zonasActivasCacheadas,
} from '../../../../../sitio/datos/cacheadas'
import {
  articulosDeZona, categoriasConLugares, destacados, eventosProximos, lugaresDe, porId, porSlug, type ItemDestacado,
} from '../../../../../sitio/datos/consultas'
import type {
  CategoriaPublica, TarjetaArticulo as TarjetaArticuloT, TarjetaEvento as TarjetaEventoT, TarjetaLugar as TarjetaLugarT, ZonaPublica,
} from '../../../../../sitio/datos/tipos'
import { guiaIndexable, sitioUrl } from '../../../../../sitio/entorno'
import { listaLd, migasLd } from '../../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../../sitio/seo/metadatos'
import { versionesDe } from '../../../../../sitio/seo/versiones'
import { textos } from '../../../../../sitio/textos'
import { Aparece } from '../../../../../sitio/ui/Aparece'
import { BandaTours } from '../../../../../sitio/ui/BandaTours'
import { Carrusel, type Diapositiva } from '../../../../../sitio/ui/Carrusel'
import { Patrocinado } from '../../../../../sitio/ui/Etiquetas'
import { Imagen } from '../../../../../sitio/ui/Imagen'
import { JsonLd } from '../../../../../sitio/ui/JsonLd'
import { Migas } from '../../../../../sitio/ui/Migas'
import { NoEncontradoEnSuspense } from '../../../../../sitio/ui/NoEncontradoEnSuspense'
import { Pildoras } from '../../../../../sitio/ui/Pildoras'
import { PuestaDelSol } from '../../../../../sitio/ui/PuestaDelSol'
import { Riel } from '../../../../../sitio/ui/Riel'
import { TarjetaEvento } from '../../../../../sitio/ui/tarjetas/TarjetaEvento'
import { TarjetaLugar } from '../../../../../sitio/ui/tarjetas/TarjetaLugar'
import { ToursEnZona } from '../../../../../sitio/ui/ToursEnZona'

// ISR y no dinámica (como guia/[...resto]): en Next 16.4.3 un notFound() en render dinámico deja el HTML en el cascarón
// vacío `__next_error__`. Sin generateStaticParams, un segmento dinámico queda ƒ; con una lista vacía, las zonas se
// prerenderizan al primer pedido y se revalidan cada hora.
export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string; zona: string }> }

async function zonaEn(lang: Locale, slug: string): Promise<ZonaPublica | undefined> {
  return porSlug(await zonasActivasCacheadas(lang), slug)
}

// Nunca llama notFound() ni noEncontrado(): si la zona no existe devuelve metadatos mínimos y el 404 lo da la página.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, zona: slug } = await params
  if (!esLocale(lang)) return {}
  const zona = await zonaEn(lang, slug)
  if (!zona) return {}
  const enCadaIdioma = await Promise.all(LOCALES.map(async (l) => [l, (await zonaEn(l, slug)) ? rutas.zona(l, slug) : undefined] as const))
  const { propia, versiones } = versionesDe({ lang, guiaIndexable: guiaIndexable(), rutas: Object.fromEntries(enCadaIdioma) })
  return metadatos({ lang, titulo: zona.nombre, descripcion: zona.descripcion ?? textos(lang).portada.intro, ruta: propia.ruta, indexable: propia.indexable, versiones, imagenOg: rutas.og(lang, 'zona', [zona.slug]) })
}

function aDiapositiva(lang: Locale, d: ItemDestacado, cats: CategoriaPublica[]): Diapositiva {
  const cat = cats.find((c) => c.id === d.item.categoriaIds[0])
  const comun = { id: `${d.tipo}-${d.item.id}`, etiqueta: cat ? { nombre: cat.nombre, clase: cat.claseGrupo } : undefined, bajada: d.item.resumen }
  if (d.tipo === 'articulo') return { ...comun, imagen: d.item.portada, patrocinado: false, titulo: d.item.titulo, ruta: rutas.articulo(lang, d.item.slug) }
  const ruta = d.tipo === 'lugar' ? rutas.lugar(lang, d.item.slug) : rutas.evento(lang, d.item.slug)
  return { ...comun, imagen: d.item.foto, patrocinado: patrocinioDeclarado(d.item.patrocinio), titulo: d.item.nombre, ruta }
}

type Datos = { cats: CategoriaPublica[]; lugares: TarjetaLugarT[]; eventos: TarjetaEventoT[]; articulos: TarjetaArticuloT[] }

function Zona({ lang, zona, cats, lugares, eventos, articulos }: Datos & { lang: Locale; zona: ZonaPublica }) {
  const t = textos(lang)
  const ahora = new Date().toISOString()
  const lugaresZona = ordenarListado(lugaresDe(lugares, { zonaId: zona.id }), new Date(ahora))
  const proximos = eventosProximos(eventos, ahora, { zonaId: zona.id })
  const artsZona = articulosDeZona(articulos, zona.id)
  const top = destacados({ lugares: lugaresZona, eventos: proximos, articulos: artsZona }, ahora)
  const carrusel = (top.length ? top : artsZona.map((item) => ({ tipo: 'articulo' as const, item }))).slice(0, 4)
  const enCarrusel = new Set(carrusel.map((d) => `${d.tipo}-${d.item.id}`))
  const otrosArticulos = artsZona.filter((a) => !enCarrusel.has(`articulo-${a.id}`))
  const catsZona = categoriasConLugares(lugares, cats, zona.id)
  const catDe = (ids: number[]) => cats.find((c) => c.id === ids[0])
  const km = (c: [number, number] | null) => (c && zona.coordenadas ? kmEnLineaRecta(c, zona.coordenadas) : null)
  const migas = [
    { nombre: t.migas.guia, ruta: rutas.portada(lang) },
    { nombre: zona.nombre, ruta: rutas.zona(lang, zona.slug) },
  ]

  return (
    <div className="ancho pagina-zona">
      <Migas lang={lang} migas={migas} />
      <section className="zona-intro" aria-labelledby="titulo-zona">
        <h1 id="titulo-zona" className="t-pagina">{zona.nombre}</h1>
        {zona.descripcion && <p>{zona.descripcion}</p>}
      </section>

      {carrusel.length > 0 && (
        <section className="mosaico" aria-label={t.secciones.destacados}>
          <Carrusel lang={lang} diapositivas={carrusel.map((d) => aDiapositiva(lang, d, cats))} />
          <div className="mosaico__lado">
            {otrosArticulos.slice(0, 1).map((a) => (
              <Link key={a.id} className={`lateral tarjeta presionable ${catDe(a.categoriaIds)?.claseGrupo ?? ''}`} href={rutas.articulo(lang, a.slug)}>
                <div className="media"><Imagen imagen={a.portada} sizes="(min-width: 900px) 33vw, 100vw" alt="" /></div>
                <div className="velo-texto"><span className="etiqueta">{catDe(a.categoriaIds)?.nombre ?? t.tarjetas.articulo}</span><p className="titular">{a.titulo}</p><p className="meta">{t.tarjetas.minutos(a.minutosLectura)}</p></div>
              </Link>
            ))}
            {proximos.slice(0, 1).map((e) => (
              <Link key={e.id} className={`lateral tarjeta presionable ${catDe(e.categoriaIds)?.claseGrupo ?? ''}`} href={rutas.evento(lang, e.slug)}>
                <div className="media"><Imagen imagen={e.foto} sizes="(min-width: 900px) 33vw, 100vw" alt="" /></div>
                <div className="velo-texto">{patrocinioDeclarado(e.patrocinio) && <><Patrocinado lang={lang} /> </>}<span className="etiqueta">{catDe(e.categoriaIds)?.nombre}</span><p className="titular">{e.nombre}</p></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {otrosArticulos.length > 1 && (
        <div className="fila-tres">
          {otrosArticulos.slice(1, 4).map((a) => (
            <Link key={a.id} className={`titular-chico tarjeta presionable ${catDe(a.categoriaIds)?.claseGrupo ?? ''}`} href={rutas.articulo(lang, a.slug)}>
              <div className="media"><Imagen imagen={a.portada} sizes="160px" alt="" /></div>
              <div><span className="etiqueta">{catDe(a.categoriaIds)?.nombre ?? t.tarjetas.articulo}</span><p className="titular">{a.titulo}</p></div>
            </Link>
          ))}
        </div>
      )}

      <div className="filtros">
        <Pildoras clase="filtros__fila" etiqueta={t.portada.categorias} items={catsZona.map((c) => ({ nombre: c.nombre, ruta: rutas.categoriaEnZona(lang, zona.slug, c.slug) }))} />
      </div>

      {proximos.length > 0 && (
        <section className="seccion" aria-labelledby="t-hoy">
          <div className="seccion__cabeza">
            <h2 id="t-hoy" className="t-seccion">{t.secciones.hoyEn(zona.nombre)}</h2>
            <Link href={rutas.eventos(lang)}>{t.secciones.calendario}</Link>
          </div>
          {zona.coordenadas && <PuestaDelSol lang={lang} lat={zona.coordenadas[1]} lng={zona.coordenadas[0]} />}
          <Riel lang={lang} className="hoy">
            {proximos.slice(0, 8).map((e) => (
              <TarjetaEvento key={e.id} lang={lang} evento={e} categoria={catDe(e.categoriaIds)} lugarNombre={porId(lugares, e.lugarId)?.nombre} />
            ))}
          </Riel>
        </section>
      )}

      <section className="seccion" aria-labelledby="t-feed">
        <div className="seccion__cabeza"><h2 id="t-feed" className="t-seccion">{t.secciones.descubre(zona.nombre)}</h2></div>
        {catsZona.map((c) => (
          <div key={c.id} className="feed-grupo">
            <h3 className="feed-grupo__titulo">{c.nombre}</h3>
            <div className="feed">
              {lugaresDe(lugaresZona, { categoriaId: c.id }).slice(0, 4).map((l, i) => (
                <TarjetaLugar key={l.id} lang={lang} lugar={l} categoria={c} zonaNombre={zona.nombre} km={km(l.coordenadas)} retraso={i * 70} />
              ))}
            </div>
            <div className="mas">
              <Link className="boton boton--secundario presionable" href={rutas.categoriaEnZona(lang, zona.slug, c.slug)}>{t.secciones.verTodos(c.nombre)}</Link>
            </div>
          </div>
        ))}
      </section>

      <ToursEnZona lang={lang} zona={zona} pieza={`zona-${zona.slug}`} origen="zona" formato="riel" />
      <BandaTours lang={lang} zona={zona} />
      <Aparece lang={lang} />
      <JsonLd datos={migasLd(migas, sitioUrl())} />
      <JsonLd datos={listaLd(lugaresZona.map((l) => ({ nombre: l.nombre, ruta: rutas.lugar(lang, l.slug) })), sitioUrl())} />
    </div>
  )
}

export default async function PaginaZona({ params }: Props) {
  const { lang, zona: slug } = await params
  if (!esLocale(lang)) notFound()
  const [zonas, cats, lugares, eventos, articulos] = await Promise.all([
    zonasActivasCacheadas(lang), categoriasCacheadas(lang), lugaresCacheados(lang), eventosCacheados(lang), articulosCacheados(lang),
  ])
  const zona = porSlug(zonas, slug)
  // Zona inexistente o inactiva: redirección o 404 dentro de un Suspense (ver guia/[...resto]/page.tsx). La zona que
  // existe se pinta fuera de él: en el HTML del servidor el contenido va directo, no detrás del fallback del 404.
  if (!zona) return <NoEncontradoEnSuspense lang={lang} segmentos={[slug]} />
  return <Zona lang={lang} zona={zona} cats={cats} lugares={lugares} eventos={eventos} articulos={articulos} />
}
