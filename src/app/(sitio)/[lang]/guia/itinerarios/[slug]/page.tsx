import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { fechaLarga } from '../../../../../../dominio/fechas-evento'
import { esLocale, type Locale } from '../../../../../../dominio/idioma'
import { clavesDeItinerario, lugaresDeParadas } from '../../../../../../dominio/itinerarios'
import { enlazarMenciones } from '../../../../../../dominio/menciones'
import { relacionadosVisibles } from '../../../../../../dominio/presencia'
import { rutas } from '../../../../../../dominio/rutas'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, fichaItinerarioCacheada, itinerariosCacheados, lugaresCacheados, temasCacheados, toursDeSede, zonasActivasCacheadas,
} from '../../../../../../sitio/datos/cacheadas'
import { documentoPorSlug, porId, resolutorDeCuerpo } from '../../../../../../sitio/datos/consultas'
import { candidatosMencion } from '../../../../../../sitio/datos/menciones'
import { guiaIndexable, sitioUrl } from '../../../../../../sitio/entorno'
import { rutasPorIdioma } from '../../../../../../sitio/paginas/comun'
import { faqLd, itinerarioLd, migasLd } from '../../../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../../../sitio/seo/metadatos'
import { versionesDe } from '../../../../../../sitio/seo/versiones'
import { textos } from '../../../../../../sitio/textos'
import { CuerpoRico } from '../../../../../../sitio/ui/CuerpoRico'
import { Imagen } from '../../../../../../sitio/ui/Imagen'
import { DiaItinerario } from '../../../../../../sitio/ui/itinerario/DiaItinerario'
import { ToursDelPlan } from '../../../../../../sitio/ui/itinerario/ToursDelPlan'
import { JsonLd } from '../../../../../../sitio/ui/JsonLd'
import { Migas } from '../../../../../../sitio/ui/Migas'
import { NoEncontradoEnSuspense } from '../../../../../../sitio/ui/NoEncontradoEnSuspense'
import { PreguntasFrecuentes } from '../../../../../../sitio/ui/PreguntasFrecuentes'

export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string; slug: string }> }

const cargar = (lang: Locale, slug: string) => documentoPorSlug(itinerariosCacheados(lang), (id) => fichaItinerarioCacheada(id, lang), slug)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  if (!esLocale(lang)) return {}
  const d = await cargar(lang, slug)
  if (!d) return {}
  const rutasIdioma = await rutasPorIdioma(async (l) => {
    const x = porId(await itinerariosCacheados(l), d.ficha.id)
    return x ? rutas.itinerario(l, x.slug) : undefined
  })
  const { propia, versiones } = versionesDe({ lang, guiaIndexable: guiaIndexable(), rutas: rutasIdioma, noIndexar: d.ficha.noIndexar })
  return metadatos({
    lang, titulo: d.ficha.metaTitulo ?? d.ficha.titulo, descripcion: d.ficha.metaDescripcion ?? d.ficha.resumen,
    ruta: propia.ruta, indexable: propia.indexable, versiones, imagenOg: rutas.og(lang, 'itinerario', [d.ficha.slug]),
  })
}

export default async function PaginaItinerario({ params }: Props) {
  const { lang, slug } = await params
  if (!esLocale(lang)) notFound()
  const d = await cargar(lang, slug)
  if (!d) return <NoEncontradoEnSuspense lang={lang} segmentos={['itinerarios', slug]} />
  const it = d.ficha
  const [zonas, cats, lugares, eventos, articulos, temas] = await Promise.all([
    zonasActivasCacheadas(lang), categoriasCacheadas(lang), lugaresCacheados(lang), eventosCacheados(lang), articulosCacheados(lang), temasCacheados(lang),
  ])
  const zona = porId(zonas, it.zonaId)
  if (!zona) notFound()
  const t = textos(lang)

  // Los tours se resuelven una sola vez: DiaItinerario pinta las tarjetas y ToursDelPlan emite el único JSON-LD.
  const todos = zona.sedeSlug ? await toursDeSede(zona.sedeSlug, lang) : []
  const visibles = relacionadosVisibles(todos, clavesDeItinerario(it.dias))
  const porClave = new Map(visibles.map((x) => [x.clave, x]))
  const lugaresPorId = new Map(lugares.map((l) => [l.id, l]))
  const idsParada = lugaresDeParadas(it.dias)

  // Enlaces automáticos: el cuerpo y las notas comparten un solo presupuesto (spec §2.2). Cada nota se envuelve en un
  // párrafo Lexical; los lugares que salen como tarjeta de parada no se enlazan.
  const nota = (texto: string) => ({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: texto, format: 0 }] }] } })
  const conNota = it.dias.flatMap((dia, d) => dia.paradas.flatMap((p, i) => (p.nota ? [{ clave: `${d}-${i}`, cuerpo: nota(p.nota) }] : [])))
  const [cuerpo, ...enlazadas] = enlazarMenciones([it.cuerpo, ...conNota.map((x) => x.cuerpo)], candidatosMencion(lugares), { excluir: idsParada })
  const notas = new Map<string, unknown>(conNota.map((x, i) => [x.clave, enlazadas[i]]))
  const resolutor = resolutorDeCuerpo({ lugares, eventos, articulos, itinerarios: d.lista, temas }, lang)

  const ruta = rutas.itinerario(lang, it.slug)
  const migas = [
    { nombre: t.migas.guia, ruta: rutas.portada(lang) },
    { nombre: zona.nombre, ruta: rutas.zona(lang, zona.slug) },
    { nombre: it.titulo, ruta },
  ]
  const lugaresLd = idsParada.flatMap((id) => {
    const l = lugaresPorId.get(id)
    return l ? [{ nombre: l.nombre, ruta: rutas.lugar(lang, l.slug) }] : []
  })

  return (
    <div className="ancho pagina-articulo">
      <Migas lang={lang} migas={migas} />
      <header className="art-cabeza">
        <h1>{it.titulo}</h1>
        <p className="resumen">{it.resumen}</p>
        <div className="firma">
          <span>{t.plan.diasEn(it.numeroDias, zona.nombre)}</span>
          {it.autorNombre && <span>{t.articulo.por} <strong>{it.autorNombre}</strong></span>}
          {it.actualizadoEl && <span>{t.articulo.actualizado(fechaLarga(it.actualizadoEl, lang))}</span>}
        </div>
      </header>
      {it.portada && <div className="art-portada"><Imagen imagen={it.portada} prioridad sizes="(min-width: 1120px) 1120px, 100vw" /></div>}
      <div className="art-cuerpo">
        <CuerpoRico lang={lang} cuerpo={cuerpo} resolutor={resolutor} media={it.media} categorias={cats} className="prosa" piezaTours={`itinerario-${it.slug}`} origenTours="itinerario" />
        {it.dias.map((dia, i) => <DiaItinerario key={i} lang={lang} n={i + 1} dia={dia} lugares={lugaresPorId} tours={porClave} categorias={cats} zona={zona} slug={it.slug} notas={notas} resolutor={resolutor} media={it.media} />)}
        <ToursDelPlan lang={lang} titulo={t.plan.reservaTours} tours={visibles} pieza={`itinerario-${it.slug}-resumen`} origen="itinerario" zonaDe={() => zona.slug} />
        {it.preguntas.length > 0 && (
          <section className="bloque" aria-labelledby="t-preguntas">
            <h2 id="t-preguntas" className="t-seccion">{t.ficha.preguntas}</h2>
            <PreguntasFrecuentes preguntas={it.preguntas} etiqueta={t.ficha.preguntas} />
          </section>
        )}
      </div>
      <JsonLd datos={migasLd(migas, sitioUrl())} />
      <JsonLd datos={itinerarioLd(it, { url: ruta, base: sitioUrl(), lugares: lugaresLd })} />
      {it.preguntas.length > 0 && <JsonLd datos={faqLd(it.preguntas)} />}
    </div>
  )
}
