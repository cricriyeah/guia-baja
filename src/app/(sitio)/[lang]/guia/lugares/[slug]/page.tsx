import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CARACTERISTICAS } from '../../../../../../dominio/caracteristicas'
import { kmEnLineaRecta } from '../../../../../../dominio/distancia'
import { horarioSemana } from '../../../../../../dominio/horario'
import { esLocale, type Locale } from '../../../../../../dominio/idioma'
import { ordenarListado } from '../../../../../../dominio/orden'
import { patrocinioDeclarado } from '../../../../../../dominio/patrocinio'
import { rutas } from '../../../../../../dominio/rutas'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, fichaLugarCacheada, lugaresCacheados, zonasActivasCacheadas,
} from '../../../../../../sitio/datos/cacheadas'
import { articulosQueCitan, documentoPorSlug, eventosProximos, lugaresDe, porId, resolutorDeCuerpo } from '../../../../../../sitio/datos/consultas'
import { guiaIndexable, sitioUrl } from '../../../../../../sitio/entorno'
import '../../../../../../sitio/estilos/ficha.css'
import { rutasPorIdioma } from '../../../../../../sitio/paginas/comun'
import { lugarLd, migasLd } from '../../../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../../../sitio/seo/metadatos'
import { versionesDe } from '../../../../../../sitio/seo/versiones'
import { textos } from '../../../../../../sitio/textos'
import { Aparece } from '../../../../../../sitio/ui/Aparece'
import { Compartir } from '../../../../../../sitio/ui/Compartir'
import { CuerpoRico } from '../../../../../../sitio/ui/CuerpoRico'
import { Patrocinado } from '../../../../../../sitio/ui/Etiquetas'
import { Galeria } from '../../../../../../sitio/ui/Galeria'
import { HorarioEnVivo } from '../../../../../../sitio/ui/HorarioEnVivo'
import { JsonLd } from '../../../../../../sitio/ui/JsonLd'
import { Mapa } from '../../../../../../sitio/ui/Mapa'
import { Migas } from '../../../../../../sitio/ui/Migas'
import { NoEncontradoEnSuspense } from '../../../../../../sitio/ui/NoEncontradoEnSuspense'
import { Riel } from '../../../../../../sitio/ui/Riel'
import { MiniEvento } from '../../../../../../sitio/ui/tarjetas/MiniEvento'
import { TarjetaArticulo } from '../../../../../../sitio/ui/tarjetas/TarjetaArticulo'
import { TarjetaLugar } from '../../../../../../sitio/ui/tarjetas/TarjetaLugar'

// ISR y no dinámica (ver guia/[zona]/page.tsx y guia/[...resto]/page.tsx): sin generateStaticParams un segmento dinámico
// queda ƒ, y en render dinámico notFound() deja el cascarón vacío `__next_error__`. Con la lista vacía, cada ficha se
// prerenderiza al primer pedido y se revalida cada hora.
export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string; slug: string }> }

const cargar = (lang: Locale, slug: string) => documentoPorSlug(lugaresCacheados(lang), (id) => fichaLugarCacheada(id, lang), slug)

// Nunca llama notFound() ni noEncontrado(): sin lugar en el idioma devuelve metadatos mínimos y el 404 lo da la página.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  if (!esLocale(lang)) return {}
  const d = await cargar(lang, slug)
  if (!d) return {}
  const rutasIdioma = await rutasPorIdioma(async (l) => {
    const x = porId(await lugaresCacheados(l), d.ficha.id)
    return x ? rutas.lugar(l, x.slug) : undefined
  })
  const { propia, versiones } = versionesDe({ lang, guiaIndexable: guiaIndexable(), rutas: rutasIdioma, noIndexar: d.ficha.noIndexar })
  return metadatos({
    lang,
    titulo: d.ficha.metaTitulo ?? d.ficha.nombre,
    descripcion: d.ficha.metaDescripcion ?? d.ficha.resumen,
    ruta: propia.ruta,
    indexable: propia.indexable,
    versiones,
    imagenOg: rutas.og(lang, 'lugar', [d.ficha.slug]),
  })
}

const mapsDir = (c: [number, number]) => `https://www.google.com/maps/dir/?api=1&destination=${c[1]},${c[0]}`

export default async function FichaDeLugar({ params }: Props) {
  const { lang, slug } = await params
  if (!esLocale(lang)) notFound()
  const d = await cargar(lang, slug)
  // Sin lugar en este idioma: redirección (308) o 404 dentro de un Suspense. El lugar que existe se pinta fuera de él,
  // para que el HTML del servidor traiga el contenido y no el fallback del 404.
  if (!d) return <NoEncontradoEnSuspense lang={lang} segmentos={['lugares', slug]} />
  const { ficha: l, lista: lugares } = d
  const [zonas, cats, eventos, articulos] = await Promise.all([
    zonasActivasCacheadas(lang), categoriasCacheadas(lang), eventosCacheados(lang), articulosCacheados(lang),
  ])
  const zona = porId(zonas, l.zonaId)
  const cat = porId(cats, l.categoriaIds[0])
  const t = textos(lang)
  const ahora = new Date().toISOString()
  const declarado = patrocinioDeclarado(l.patrocinio)
  const rel = (base: string) => (declarado ? `${base} sponsored` : base)
  const km = l.coordenadas && zona?.coordenadas ? Math.round(kmEnLineaRecta(l.coordenadas, zona.coordenadas)) : null
  const eventosAqui = eventosProximos(eventos, ahora, { lugarId: l.id })
  const citan = articulosQueCitan(articulos, l.id)
  const mas = cat && zona
    ? ordenarListado(lugaresDe(lugares, { zonaId: zona.id, categoriaId: cat.id }).filter((x) => x.id !== l.id), new Date(ahora)).slice(0, 8)
    : []
  const ruta = rutas.lugar(lang, l.slug)
  const migas = [
    { nombre: t.migas.guia, ruta: rutas.portada(lang) },
    ...(zona ? [{ nombre: zona.nombre, ruta: rutas.zona(lang, zona.slug) }] : []),
    ...(zona && cat ? [{ nombre: cat.nombre, ruta: rutas.categoriaEnZona(lang, zona.slug, cat.slug) }] : []),
    { nombre: l.nombre, ruta },
  ]
  const contacto = (canal: string) => ({ 'data-evento': 'contacto_lugar', 'data-lugar': l.slug, 'data-canal': canal })
  const caracteristicas = CARACTERISTICAS.filter((c) => l.caracteristicas.includes(c.valor)).map((c) => (lang === 'es' ? c.es : c.en))
  // Literal armado en el servidor: Mapa lo recibe ya serializado, así su efecto no se repite por un objeto nuevo.
  const puntos = l.coordenadas ? [{ lng: l.coordenadas[0], lat: l.coordenadas[1], nombre: l.nombre }] : []

  return (
    <div className={`ancho pagina-ficha ${cat?.claseGrupo ?? ''}`}>
      <Migas lang={lang} migas={migas} />
      <Galeria lang={lang} nombre={l.nombre} fotos={l.fotos} />

      <section className="cabeza" aria-labelledby="titulo">
        <div className="cabeza__chips">
          {declarado && <Patrocinado lang={lang} />}
          {cat && <span className="etiqueta">{cat.nombre}</span>}
          <HorarioEnVivo lang={lang} horario={l.horario} />
        </div>
        <h1 id="titulo" className="t-pagina">{l.nombre}</h1>
        <p className="cabeza__resumen">{l.resumen}</p>
        <div className="datos">
          {zona && <span>{zona.nombre}</span>}
          {km !== null && zona && <span>{t.tarjetas.kmDe(km, zona.nombre)}</span>}
          {l.rangoPrecio && <span>{t.ficha.precio}: {l.rangoPrecio}</span>}
          {caracteristicas.map((c) => <span key={c}>{c}</span>)}
        </div>
        <div className="acciones">
          {l.coordenadas && (
            <a className="accion presionable" href={mapsDir(l.coordenadas)} target="_blank" rel={rel('noopener')} {...contacto('mapa')}>{t.ficha.comoLlegar}</a>
          )}
          <Compartir lang={lang} titulo={l.nombre} />
        </div>
      </section>

      <div className="cuerpo">
        <article>
          <section className="bloque" aria-labelledby="t-saber">
            <h2 id="t-saber" className="t-seccion">{t.ficha.loQueHayQueSaber}</h2>
            <CuerpoRico lang={lang} cuerpo={l.cuerpo} resolutor={resolutorDeCuerpo({ lugares, eventos, articulos }, lang)} media={l.media} categorias={cats} patrocinado={declarado} />
          </section>

          {l.horario.length > 0 && (
            <section className="bloque" aria-labelledby="t-horario">
              <h2 id="t-horario" className="t-seccion">{t.ficha.horario}</h2>
              <table className="horario">
                <tbody>
                  {horarioSemana(l.horario).map((dia, i) => (
                    <tr key={dia.dia}>
                      <th scope="row">{t.ficha.dias[i]}</th>
                      <td>{dia.tramos.length ? dia.tramos.map((x) => `${x.abre}–${x.cierra}`).join(', ') : t.ficha.cerrado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {l.notaHorario && <p className="nota-horario">{l.notaHorario}</p>}
            </section>
          )}

          {l.coordenadas && (
            <section className="bloque" aria-labelledby="t-llegar">
              <h2 id="t-llegar" className="t-seccion">{t.ficha.comoLlegar}</h2>
              <Mapa lang={lang} titulo={t.ficha.mapa(l.nombre)} puntos={puntos} direccion={l.direccion} />
              <div className="mapa__pie">
                {l.direccion && <span>{l.direccion}</span>}
                <a className="boton boton--secundario presionable" href={mapsDir(l.coordenadas)} target="_blank" rel={rel('noopener')} {...contacto('mapa')}>{t.ficha.comoLlegar}</a>
              </div>
            </section>
          )}

          {eventosAqui.length > 0 && (
            <section className="bloque" aria-labelledby="t-eventos">
              <h2 id="t-eventos" className="t-seccion">{t.ficha.eventosAqui}</h2>
              {eventosAqui.map((e) => <MiniEvento key={e.id} lang={lang} evento={e} categoria={porId(cats, e.categoriaIds[0])} lugarNombre={l.nombre} />)}
            </section>
          )}

          {citan.length > 0 && (
            <section className="bloque" aria-labelledby="t-aparece-en">
              <h2 id="t-aparece-en" className="t-seccion">{t.ficha.apareceEn}</h2>
              {citan.map((a) => <TarjetaArticulo key={a.id} lang={lang} articulo={a} categoria={porId(cats, a.categoriaIds[0])} />)}
            </section>
          )}
        </article>

        <aside className="lateral" aria-label={t.ficha.datos}>
          <div className="ficha-datos">
            {l.direccion && (
              <div className="ficha-datos__fila">
                <span>{l.direccion}</span>
                {l.coordenadas && (
                  <a href={mapsDir(l.coordenadas)} target="_blank" rel={rel('noopener')} {...contacto('mapa')}>{t.ficha.comoLlegar}</a>
                )}
              </div>
            )}
            {l.horario.length > 0 && <div className="ficha-datos__fila"><HorarioEnVivo lang={lang} horario={l.horario} /></div>}
            {l.rangoPrecio && <div className="ficha-datos__fila"><span>{t.ficha.precio}: {l.rangoPrecio}</span></div>}
            {l.web && <div className="ficha-datos__fila"><a href={l.web} target="_blank" rel={rel('noopener')} {...contacto('web')}>{t.ficha.web}</a></div>}
            {l.instagram && (
              <div className="ficha-datos__fila">
                <a href={`https://instagram.com/${l.instagram.replace(/^@/, '')}`} target="_blank" rel={rel('noopener')} {...contacto('instagram')}>@{l.instagram.replace(/^@/, '')}</a>
              </div>
            )}
            {l.telefono && <div className="ficha-datos__fila"><a href={`tel:${l.telefono.replace(/\s/g, '')}`} rel={declarado ? 'sponsored' : undefined} {...contacto('telefono')}>{l.telefono}</a></div>}
            {l.whatsapp && (
              <div className="ficha-datos__fila">
                <a href={`https://wa.me/${l.whatsapp.replace(/\D/g, '')}`} target="_blank" rel={rel('noopener')} {...contacto('whatsapp')}>{t.ficha.whatsapp}</a>
              </div>
            )}
          </div>
        </aside>
      </div>

      {mas.length > 0 && cat && zona && (
        <section className="seccion" aria-labelledby="t-mas">
          <div className="seccion__cabeza">
            <h2 id="t-mas" className="t-seccion">{t.secciones.masEn(cat.nombre, zona.nombre)}</h2>
            <Link href={rutas.categoriaEnZona(lang, zona.slug, cat.slug)}>{t.secciones.verTodas}</Link>
          </div>
          <Riel lang={lang}>{mas.map((x) => <TarjetaLugar key={x.id} lang={lang} lugar={x} categoria={cat} zonaNombre={zona.nombre} />)}</Riel>
        </section>
      )}

      <Aparece lang={lang} />
      {l.coordenadas && (
        <div className="barra-inferior">
          <a className="boton presionable" href={mapsDir(l.coordenadas)} target="_blank" rel={rel('noopener')} {...contacto('mapa')}>{t.ficha.comoLlegar}</a>
        </div>
      )}
      <JsonLd datos={migasLd(migas, sitioUrl())} />
      <JsonLd datos={lugarLd(l, { url: ruta, tipoSchema: cat?.tipoSchema ?? 'LocalBusiness', zonaNombre: zona?.nombre ?? '', base: sitioUrl() })} />
    </div>
  )
}
