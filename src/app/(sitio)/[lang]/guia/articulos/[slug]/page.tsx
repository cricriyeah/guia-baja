// src/app/(sitio)/[lang]/guia/articulos/[slug]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { fechaLarga } from '../../../../../../dominio/fechas-evento'
import { esLocale, type Locale } from '../../../../../../dominio/idioma'
import { encabezadosDe, preguntasDe } from '../../../../../../dominio/lexical'
import { enlazarMenciones } from '../../../../../../dominio/menciones'
import { rutas } from '../../../../../../dominio/rutas'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, fichaArticuloCacheada, lugaresCacheados, zonasActivasCacheadas,
} from '../../../../../../sitio/datos/cacheadas'
import { articulosDeZona, documentoPorSlug, porId, resolutorDeCuerpo } from '../../../../../../sitio/datos/consultas'
import { candidatosMencion } from '../../../../../../sitio/datos/menciones'
import { guiaIndexable, sitioUrl } from '../../../../../../sitio/entorno'
import { rutasPorIdioma } from '../../../../../../sitio/paginas/comun'
import { articuloLd, faqLd, migasLd } from '../../../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../../../sitio/seo/metadatos'
import { versionesDe } from '../../../../../../sitio/seo/versiones'
import { textos } from '../../../../../../sitio/textos'
import { Compartir } from '../../../../../../sitio/ui/Compartir'
import { CuerpoRico } from '../../../../../../sitio/ui/CuerpoRico'
import { Imagen } from '../../../../../../sitio/ui/Imagen'
import { JsonLd } from '../../../../../../sitio/ui/JsonLd'
import { Migas } from '../../../../../../sitio/ui/Migas'
import { NoEncontradoEnSuspense } from '../../../../../../sitio/ui/NoEncontradoEnSuspense'
import { TarjetaArticulo } from '../../../../../../sitio/ui/tarjetas/TarjetaArticulo'

// ISR y no dinámica (ver lugares/[slug]/page.tsx): sin generateStaticParams un segmento dinámico queda ƒ.
export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string; slug: string }> }

const cargar = (lang: Locale, slug: string) => documentoPorSlug(articulosCacheados(lang), (id) => fichaArticuloCacheada(id, lang), slug)

// Nunca llama notFound() ni noEncontrado(): sin artículo en el idioma devuelve metadatos mínimos y el 404 lo da la página.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  if (!esLocale(lang)) return {}
  const d = await cargar(lang, slug)
  if (!d) return {}
  const rutasIdioma = await rutasPorIdioma(async (l) => {
    const x = porId(await articulosCacheados(l), d.ficha.id)
    return x ? rutas.articulo(l, x.slug) : undefined
  })
  const { propia, versiones } = versionesDe({ lang, guiaIndexable: guiaIndexable(), rutas: rutasIdioma, noIndexar: d.ficha.noIndexar })
  return metadatos({
    lang,
    titulo: d.ficha.metaTitulo ?? d.ficha.titulo,
    descripcion: d.ficha.metaDescripcion ?? d.ficha.resumen,
    ruta: propia.ruta,
    indexable: propia.indexable,
    versiones,
    imagenOg: rutas.og(lang, 'articulo', [d.ficha.slug]),
  })
}

export default async function PaginaArticulo({ params }: Props) {
  const { lang, slug } = await params
  if (!esLocale(lang)) notFound()
  const d = await cargar(lang, slug)
  // Sin artículo en este idioma: redirección (308) o 404 dentro de un Suspense. El artículo que existe se pinta fuera de él,
  // para que el HTML del servidor traiga el contenido y no el fallback del 404.
  if (!d) return <NoEncontradoEnSuspense lang={lang} segmentos={['articulos', slug]} />
  const a = d.ficha
  const [zonas, cats, lugares, eventos] = await Promise.all([
    zonasActivasCacheadas(lang), categoriasCacheadas(lang), lugaresCacheados(lang), eventosCacheados(lang),
  ])
  const t = textos(lang)
  const cat = porId(cats, a.categoriaIds[0])
  const zona = porId(zonas, a.zonaIds[0])
  const indice = encabezadosDe(a.cuerpo)
  const [cuerpo] = enlazarMenciones([a.cuerpo], candidatosMencion(lugares))
  const preguntas = preguntasDe(a.cuerpo)
  const mismos = zona ? articulosDeZona(d.lista, zona.id) : d.lista
  const mas = (mismos.length > 1 ? mismos : d.lista).filter((x) => x.id !== a.id).slice(0, 3)
  const ruta = rutas.articulo(lang, a.slug)
  const migas = [
    { nombre: t.migas.guia, ruta: rutas.portada(lang) },
    ...(zona ? [{ nombre: zona.nombre, ruta: rutas.zona(lang, zona.slug) }] : []),
    { nombre: a.titulo, ruta },
  ]
  return (
    <div className={`ancho pagina-articulo ${cat?.claseGrupo ?? ''}`}>
      <Migas lang={lang} migas={migas} />
      <header className="art-cabeza">
        <span>
          {cat && <span className="etiqueta">{cat.nombre}</span>}{' '}
          {zona && <Link className="zona" href={rutas.zona(lang, zona.slug)} style={{ height: 26, fontSize: '.8125rem', background: 'var(--gris)' }}>{zona.nombre}</Link>}
        </span>
        <h1>{a.titulo}</h1>
        <p className="resumen">{a.resumen}</p>
        <div className="firma">
          {a.autorNombre && <span>{t.articulo.por} <strong>{a.autorNombre}</strong></span>}
          {a.publicadoEl && <span>{t.articulo.publicado(fechaLarga(a.publicadoEl, lang))}</span>}
          {a.actualizadoEl && a.actualizadoEl !== a.publicadoEl && <span>{t.articulo.actualizado(fechaLarga(a.actualizadoEl, lang))}</span>}
          <span>{t.tarjetas.minutos(a.minutosLectura)}</span>
          <Compartir lang={lang} titulo={a.titulo} clase="chip presionable" />
        </div>
      </header>
      {a.portada && <div className="art-portada"><Imagen imagen={a.portada} prioridad sizes="(min-width: 1120px) 1120px, 100vw" /></div>}

      <div className="art-cuerpo">
        {indice.length > 1 && (
          <nav className="indice" aria-label={t.articulo.enEste}>
            <h2>{t.articulo.enEste}</h2>
            <div>{indice.map((h) => <a key={h.id} href={`#${h.id}`}>{h.texto}</a>)}</div>
          </nav>
        )}
        <CuerpoRico lang={lang} cuerpo={cuerpo} resolutor={resolutorDeCuerpo({ lugares, eventos, articulos: d.lista }, lang)} media={a.media} categorias={cats} className="prosa" piezaTours={`articulo-${a.slug}`} />
      </div>

      {mas.length > 0 && (
        <section className="seccion" aria-labelledby="t-mas">
          <div className="seccion__cabeza"><h2 id="t-mas" className="t-seccion">{t.secciones.masParaLeer}</h2></div>
          <div className="mas-art">{mas.map((x, i) => <TarjetaArticulo key={x.id} lang={lang} articulo={x} categoria={porId(cats, x.categoriaIds[0])} retraso={i * 80} />)}</div>
        </section>
      )}
      <JsonLd datos={migasLd(migas, sitioUrl())} />
      <JsonLd datos={articuloLd(a, { url: ruta, lang, base: sitioUrl() })} />
      {preguntas.length > 0 && <JsonLd datos={faqLd(preguntas)} />}
    </div>
  )
}
