import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { esLocale, type Locale } from '../../../../../../dominio/idioma'
import { enlazarMenciones } from '../../../../../../dominio/menciones'
import { relacionadosVisibles } from '../../../../../../dominio/presencia'
import { rutas } from '../../../../../../dominio/rutas'
import { lugaresDeTema, temaIndexable } from '../../../../../../dominio/temas'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, fichaTemaCacheada, itinerariosCacheados, lugaresCacheados, temasCacheados, toursDeSede, zonasActivasCacheadas,
} from '../../../../../../sitio/datos/cacheadas'
import { articulosDeZona, documentoPorSlug, porId, resolutorDeCuerpo } from '../../../../../../sitio/datos/consultas'
import { candidatosMencion } from '../../../../../../sitio/datos/menciones'
import { guiaIndexable, sitioUrl } from '../../../../../../sitio/entorno'
import { rutasPorIdioma } from '../../../../../../sitio/paginas/comun'
import { faqLd, listaLd, migasLd } from '../../../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../../../sitio/seo/metadatos'
import { versionesDe } from '../../../../../../sitio/seo/versiones'
import { textos } from '../../../../../../sitio/textos'
import { CuerpoRico } from '../../../../../../sitio/ui/CuerpoRico'
import { Imagen } from '../../../../../../sitio/ui/Imagen'
import { ToursDelPlan } from '../../../../../../sitio/ui/itinerario/ToursDelPlan'
import { JsonLd } from '../../../../../../sitio/ui/JsonLd'
import { Migas } from '../../../../../../sitio/ui/Migas'
import { NoEncontradoEnSuspense } from '../../../../../../sitio/ui/NoEncontradoEnSuspense'
import { PreguntasFrecuentes } from '../../../../../../sitio/ui/PreguntasFrecuentes'
import { QuizTours } from '../../../../../../sitio/ui/quiz/QuizTours'
import { TarjetaLugar } from '../../../../../../sitio/ui/tarjetas/TarjetaLugar'
import { ToursEnZona } from '../../../../../../sitio/ui/ToursEnZona'

export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string; slug: string }> }

const cargar = (lang: Locale, slug: string) => documentoPorSlug(temasCacheados(lang), (id) => fichaTemaCacheada(id, lang), slug)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  if (!esLocale(lang)) return {}
  const d = await cargar(lang, slug)
  if (!d) return {}
  const rutasIdioma = await rutasPorIdioma(async (l) => {
    const x = porId(await temasCacheados(l), d.ficha.id)
    return x ? rutas.tema(l, x.slug) : undefined
  })
  const [lugares, zonas] = await Promise.all([lugaresCacheados(lang), zonasActivasCacheadas(lang)])
  const n = lugaresDeTema(d.ficha.criterios, { lugares, zonasActivasIds: zonas.map((z) => z.id) }, new Date()).length
  const { propia, versiones } = versionesDe({ lang, guiaIndexable: guiaIndexable(), rutas: rutasIdioma, noIndexar: d.ficha.noIndexar || !temaIndexable(n) })
  return metadatos({
    lang, titulo: d.ficha.metaTitulo ?? d.ficha.titulo, descripcion: d.ficha.metaDescripcion ?? d.ficha.resumen,
    ruta: propia.ruta, indexable: propia.indexable, versiones, imagenOg: rutas.og(lang, 'tema', [d.ficha.slug]),
  })
}

export default async function PaginaTema({ params }: Props) {
  const { lang, slug } = await params
  if (!esLocale(lang)) notFound()
  const d = await cargar(lang, slug)
  if (!d) return <NoEncontradoEnSuspense lang={lang} segmentos={['temas', slug]} />
  const tema = d.ficha
  const [zonas, cats, lugares, eventos, articulos, itinerarios] = await Promise.all([
    zonasActivasCacheadas(lang), categoriasCacheadas(lang), lugaresCacheados(lang), eventosCacheados(lang), articulosCacheados(lang), itinerariosCacheados(lang),
  ])
  const t = textos(lang)
  const ahora = new Date()
  const zona = tema.zonaId !== null ? porId(zonas, tema.zonaId) ?? null : null
  const lista = lugaresDeTema(tema.criterios, { lugares, zonasActivasIds: zonas.map((z) => z.id) }, ahora)

  // Cada sede se lee una vez; una sede caída solo quita sus filas (toursDeSede atrapa el error).
  const sedes = new Map(zonas.filter((z) => z.sedeSlug).map((z) => [z.id, z]))
  const zonaIds = [...new Set(tema.tours.map((f) => f.zonaId))].filter((id) => sedes.has(id))
  const porZona = new Map(await Promise.all(zonaIds.map(async (id) => [id, await toursDeSede(sedes.get(id)!.sedeSlug!, lang)] as const)))
  const zonaDeClave = new Map<string, string>()
  const tours = tema.tours.flatMap((f) => {
    const [x] = relacionadosVisibles(porZona.get(f.zonaId) ?? [], [f.clave])
    if (!x || zonaDeClave.has(x.clave)) return []
    zonaDeClave.set(x.clave, sedes.get(f.zonaId)!.slug)
    return [x]
  })

  const [introduccion] = enlazarMenciones([tema.introduccion], candidatosMencion(lugares))
  const ruta = rutas.tema(lang, tema.slug)
  const migas = [
    { nombre: t.migas.guia, ruta: rutas.portada(lang) },
    ...(zona ? [{ nombre: zona.nombre, ruta: rutas.zona(lang, zona.slug) }] : []),
    { nombre: tema.titulo, ruta },
  ]
  const paraPlanear = zona
    ? [...itinerarios.filter((x) => x.zonaId === zona.id).map((x) => ({ titulo: x.titulo, ruta: rutas.itinerario(lang, x.slug) })),
       ...articulosDeZona(articulos, zona.id).map((x) => ({ titulo: x.titulo, ruta: rutas.articulo(lang, x.slug) }))].slice(0, 3)
    : []

  return (
    <div className="ancho pagina-articulo">
      <Migas lang={lang} migas={migas} />
      <header className="art-cabeza">
        <h1>{tema.titulo}</h1>
        <p className="resumen">{tema.resumen}</p>
      </header>
      {tema.portada && <div className="art-portada"><Imagen imagen={tema.portada} prioridad sizes="(min-width: 1120px) 1120px, 100vw" /></div>}
      <div className="art-cuerpo">
        <CuerpoRico lang={lang} cuerpo={introduccion} resolutor={resolutorDeCuerpo({ lugares, eventos, articulos, itinerarios, temas: d.lista }, lang)} media={tema.media} categorias={cats} className="prosa" piezaTours={`tema-${tema.slug}`} origenTours="tema" />
        <ToursDelPlan lang={lang} titulo={t.plan.toursParaPlan} tours={tours} pieza={`tema-${tema.slug}`} origen="tema" zonaDe={(x) => zonaDeClave.get(x.clave) ?? ''} />
        {!tema.tours.length && zona && <ToursEnZona lang={lang} zona={zona} pieza={`tema-${tema.slug}`} origen="tema" formato="riel" />}
        {zona && <QuizTours lang={lang} zona={zona} />}
        {lista.length > 0 && (
          <section className="bloque">
            {lista.map((l) => <TarjetaLugar key={l.id} lang={lang} lugar={l} categoria={porId(cats, l.categoriaIds[0])} zonaNombre={porId(zonas, l.zonaId)?.nombre ?? ''} />)}
          </section>
        )}
        {tema.preguntas.length > 0 && (
          <section className="bloque" aria-labelledby="t-preguntas">
            <h2 id="t-preguntas" className="t-seccion">{t.ficha.preguntas}</h2>
            <PreguntasFrecuentes preguntas={tema.preguntas} etiqueta={t.ficha.preguntas} />
          </section>
        )}
        {paraPlanear.length > 0 && (
          <section className="bloque" aria-labelledby="t-planear">
            <h2 id="t-planear" className="t-seccion">{t.plan.paraPlanear}</h2>
            <ul>{paraPlanear.map((x) => <li key={x.ruta}><Link href={x.ruta}>{x.titulo}</Link></li>)}</ul>
          </section>
        )}
      </div>
      <JsonLd datos={migasLd(migas, sitioUrl())} />
      <JsonLd datos={listaLd(lista.map((l) => ({ nombre: l.nombre, ruta: rutas.lugar(lang, l.slug) })), sitioUrl())} />
      {tema.preguntas.length > 0 && <JsonLd datos={faqLd(tema.preguntas)} />}
    </div>
  )
}
