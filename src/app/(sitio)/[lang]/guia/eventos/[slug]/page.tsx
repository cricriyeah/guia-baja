import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { esEventoProximo } from '../../../../../../dominio/eventos'
import { partesFecha, rangoEvento } from '../../../../../../dominio/fechas-evento'
import { esLocale, type Locale } from '../../../../../../dominio/idioma'
import { patrocinioDeclarado } from '../../../../../../dominio/patrocinio'
import { conConsulta, rutas } from '../../../../../../dominio/rutas'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, fichaEventoCacheada, lugaresCacheados, zonasActivasCacheadas,
} from '../../../../../../sitio/datos/cacheadas'
import { documentoPorSlug, eventosProximos, porId, resolutorDeCuerpo } from '../../../../../../sitio/datos/consultas'
import { guiaIndexable, sitioUrl } from '../../../../../../sitio/entorno'
import { rutasPorIdioma } from '../../../../../../sitio/paginas/comun'
import { eventoLd, migasLd } from '../../../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../../../sitio/seo/metadatos'
import { versionesDe } from '../../../../../../sitio/seo/versiones'
import { textos } from '../../../../../../sitio/textos'
import { Calendario } from '../../../../../../sitio/ui/Calendario'
import { Compartir } from '../../../../../../sitio/ui/Compartir'
import { CuentaRegresiva } from '../../../../../../sitio/ui/CuentaRegresiva'
import { CuerpoRico } from '../../../../../../sitio/ui/CuerpoRico'
import { Patrocinado } from '../../../../../../sitio/ui/Etiquetas'
import { Imagen } from '../../../../../../sitio/ui/Imagen'
import { JsonLd } from '../../../../../../sitio/ui/JsonLd'
import { Mapa } from '../../../../../../sitio/ui/Mapa'
import { Migas } from '../../../../../../sitio/ui/Migas'
import { NoEncontradoEnSuspense } from '../../../../../../sitio/ui/NoEncontradoEnSuspense'
import { ToursEnZona } from '../../../../../../sitio/ui/ToursEnZona'

// ISR y no dinámica (ver lugares/[slug]/page.tsx): sin generateStaticParams un segmento dinámico queda ƒ.
export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string; slug: string }> }
const SEMANA = 7 * 24 * 60 * 60 * 1000

const cargar = (lang: Locale, slug: string) => documentoPorSlug(eventosCacheados(lang), (id) => fichaEventoCacheada(id, lang), slug)

// Nunca llama notFound() ni noEncontrado(): sin evento en el idioma devuelve metadatos mínimos y el 404 lo da la página.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  if (!esLocale(lang)) return {}
  const d = await cargar(lang, slug)
  if (!d) return {}
  const rutasIdioma = await rutasPorIdioma(async (l) => {
    const x = porId(await eventosCacheados(l), d.ficha.id)
    return x ? rutas.evento(l, x.slug) : undefined
  })
  // Spec §6: un evento pasado sigue publicado e indexable (y en el sitemap).
  const { propia, versiones } = versionesDe({ lang, guiaIndexable: guiaIndexable(), rutas: rutasIdioma, noIndexar: d.ficha.noIndexar })
  return metadatos({
    lang,
    titulo: d.ficha.metaTitulo ?? d.ficha.nombre,
    descripcion: d.ficha.metaDescripcion ?? d.ficha.resumen,
    ruta: propia.ruta,
    indexable: propia.indexable,
    versiones,
    imagenOg: rutas.og(lang, 'evento', [d.ficha.slug]),
  })
}

export default async function PaginaEvento({ params }: Props) {
  const { lang, slug } = await params
  if (!esLocale(lang)) notFound()
  const d = await cargar(lang, slug)
  // Sin evento en este idioma: redirección (308) o 404 dentro de un Suspense. El evento que existe se pinta fuera de él,
  // para que el HTML del servidor traiga el contenido y no el fallback del 404.
  if (!d) return <NoEncontradoEnSuspense lang={lang} segmentos={['eventos', slug]} />
  const e = d.ficha
  const [zonas, cats, lugares, articulos] = await Promise.all([
    zonasActivasCacheadas(lang), categoriasCacheadas(lang), lugaresCacheados(lang), articulosCacheados(lang),
  ])
  const zona = porId(zonas, e.zonaId)
  const cat = porId(cats, e.categoriaIds[0])
  const lugar = porId(lugares, e.lugarId) ?? null
  const t = textos(lang)
  const ahora = new Date()
  const pasado = !esEventoProximo(e, ahora)
  const f = partesFecha(e.inicio, lang)
  const declarado = patrocinioDeclarado(e.patrocinio)
  const tambien = eventosProximos(d.lista, ahora.toISOString(), { zonaId: e.zonaId })
    .filter((x) => x.id !== e.id && new Date(x.inicio).getTime() - ahora.getTime() < SEMANA)
    .slice(0, 3)
  const ruta = rutas.evento(lang, e.slug)
  const migas = [
    { nombre: t.migas.guia, ruta: rutas.portada(lang) },
    ...(zona ? [{ nombre: zona.nombre, ruta: rutas.zona(lang, zona.slug) }] : []),
    { nombre: t.evento.eventos, ruta: rutas.eventos(lang) },
    { nombre: e.nombre, ruta },
  ]
  // Literal armado en el servidor: Mapa lo recibe ya serializado, así su efecto no se repite por un objeto nuevo.
  const puntos = lugar?.coordenadas
    ? [{ lng: lugar.coordenadas[0], lat: lugar.coordenadas[1], nombre: lugar.nombre, ruta: rutas.lugar(lang, lugar.slug) }]
    : []
  return (
    <div className={`ancho pagina-evento ${cat?.claseGrupo ?? ''}`}>
      <Migas lang={lang} migas={migas} />
      {pasado && (
        <p className="ya-paso" role="status">
          ⚠ {t.evento.yaPaso}{' '}
          {/* Ruling C12: el link lleva a los próximos de la zona del evento. */}
          <Link href={zona ? conConsulta(rutas.eventos(lang), `zona=${zona.slug}`) : rutas.eventos(lang)} style={{ textDecoration: 'underline' }}>
            {zona ? t.evento.proximosEn(zona.nombre) : t.evento.eventos}
          </Link>
        </p>
      )}
      <section className="evento-cabeza" aria-labelledby="titulo">
        <div className="evento-foto"><Imagen imagen={e.foto} prioridad sizes="(min-width: 900px) 55vw, 100vw" /></div>
        <div className="boleto">
          <span>
            {declarado && <><Patrocinado lang={lang} /> </>}
            {cat && <span className="etiqueta">{cat.nombre}</span>}
          </span>
          <h1 id="titulo">{e.nombre}</h1>
          <div className="boleto__fecha">
            <span className="boleto__dia"><small>{f.diaSemana}</small><b>{f.dia}</b></span>
            <p className="boleto__hora">{rangoEvento(e.inicio, e.fin, lang)}<span>{t.evento.horaLocal}</span></p>
          </div>
          {!pasado && <p className="boleto__estado" aria-live="polite"><CuentaRegresiva lang={lang} inicio={e.inicio} fin={e.fin} /></p>}
          <div className="boleto__precio"><span>{t.evento.entrada}</span><b>{e.gratis ? t.evento.gratis : e.precio}</b></div>
          {!pasado && (
            <div className="boleto__acciones">
              <Calendario lang={lang} uid={`evento-${e.id}@guia-de-la-baja`} nombre={e.nombre} inicio={e.inicio} fin={e.fin} lugar={lugar?.nombre ?? e.direccionLibre ?? zona?.nombre ?? ''} slug={e.slug} />
              <Compartir lang={lang} titulo={e.nombre} clase="boton boton--secundario presionable" />
              {e.urlBoletos && (
                <a className="boton presionable" href={e.urlBoletos} target="_blank" rel={declarado ? 'noopener sponsored' : 'noopener'} data-evento="boletos_clic" data-evento-slug={e.slug}>
                  {t.evento.boletos}
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="cuerpo">
        <article>
          <section className="bloque" aria-labelledby="t-que">
            <h2 id="t-que" className="t-seccion">{t.evento.deQueSeTrata}</h2>
            <CuerpoRico lang={lang} cuerpo={e.cuerpo} resolutor={resolutorDeCuerpo({ lugares, eventos: d.lista, articulos }, lang)} media={e.media} categorias={cats} patrocinado={declarado} />
          </section>
          <section className="bloque" aria-labelledby="t-donde">
            <h2 id="t-donde" className="t-seccion">{t.evento.donde}</h2>
            {lugar ? (
              <Link className={`lugar-ref tarjeta presionable ${porId(cats, lugar.categoriaIds[0])?.claseGrupo ?? ''}`} href={rutas.lugar(lang, lugar.slug)} rel={patrocinioDeclarado(lugar.patrocinio) ? 'sponsored' : undefined}>
                <div className="media"><Imagen imagen={lugar.foto} sizes="120px" alt="" /></div>
                <div>
                  {patrocinioDeclarado(lugar.patrocinio) && <><Patrocinado lang={lang} /> </>}
                  <span className="etiqueta">{porId(cats, lugar.categoriaIds[0])?.nombre}</span><p className="titular" style={{ marginTop: 4 }}>{lugar.nombre}</p>
                </div>
              </Link>
            ) : (
              e.direccionLibre && <p>{e.direccionLibre}</p>
            )}
            {lugar?.coordenadas && <Mapa lang={lang} titulo={t.ficha.mapa(lugar.nombre)} puntos={puntos} />}
          </section>
          {/* Spec de presencia §2.4: también en un evento que ya pasó. Sin sede o sin tours no pinta nada. */}
          {zona && <ToursEnZona lang={lang} zona={zona} pieza={`evento-${e.slug}`} origen="evento" formato="fila" limite={3} />}
        </article>
        {tambien.length > 0 && (
          <aside className="lateral" aria-labelledby="t-mas-ev">
            <h2 id="t-mas-ev" className="t-seccion" style={{ fontSize: '1.25rem', marginBottom: 10 }}>{t.evento.tambien}</h2>
            {tambien.map((x) => (
              <Link key={x.id} className={`lugar-ref tarjeta presionable ${porId(cats, x.categoriaIds[0])?.claseGrupo ?? ''}`} href={rutas.evento(lang, x.slug)} rel={patrocinioDeclarado(x.patrocinio) ? 'sponsored' : undefined} style={{ marginBottom: 8 }}>
                <div className="media"><Imagen imagen={x.foto} sizes="120px" alt="" /></div>
                <div>
                  {patrocinioDeclarado(x.patrocinio) && <><Patrocinado lang={lang} /> </>}
                  <span className="etiqueta">{porId(cats, x.categoriaIds[0])?.nombre}</span><p className="titular" style={{ marginTop: 4 }}>{x.nombre}</p>
                </div>
              </Link>
            ))}
          </aside>
        )}
      </div>
      <JsonLd datos={migasLd(migas, sitioUrl())} />
      <JsonLd datos={eventoLd(e, { url: ruta, lugar, zonaNombre: zona?.nombre ?? '', base: sitioUrl() })} />
    </div>
  )
}
