import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { coincidencias } from '../../../../../busqueda/consulta'
import { leerConsultaBusqueda, ordenarGrupo, partesResaltadas, TIPOS_BUSQUEDA, type FilaResultado } from '../../../../../dominio/busqueda'
import { esEventoProximo } from '../../../../../dominio/eventos'
import { esLocale, type Locale } from '../../../../../dominio/idioma'
import { paginar } from '../../../../../dominio/paginacion'
import { patrocinioDeclarado } from '../../../../../dominio/patrocinio'
import { conConsulta, rutas } from '../../../../../dominio/rutas'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, lugaresCacheados, zonasActivasCacheadas,
} from '../../../../../sitio/datos/cacheadas'
import { categoriasConLugares, porSlug } from '../../../../../sitio/datos/consultas'
import { obtenerPayload } from '../../../../../sitio/datos/payload'
import '../../../../../sitio/estilos/busqueda.css'
import { paramsDe, type SearchParams } from '../../../../../sitio/paginas/comun'
import { textos } from '../../../../../sitio/textos'
import { EsqueletoBusqueda } from '../../../../../sitio/ui/esqueletos/Busqueda'
import { Paginacion } from '../../../../../sitio/ui/Paginacion'
import { TransicionFiltros } from '../../../../../sitio/ui/TransicionFiltros'
import { ToursEnZona } from '../../../../../sitio/ui/ToursEnZona'
import { zonaDeTours } from '../../../../../dominio/presencia'

// Spec §7: dinámica, noindex, fuera del sitemap. El término se muestra siempre como texto (React lo escapa).
// Nunca llama notFound() por una página fuera de rango: en render dinámico Next 16.4.3 deja el cascarón vacío
// `__next_error__`; redirige a la misma consulta sin `pagina`.
export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ lang: string }>; searchParams: SearchParams }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!esLocale(lang)) return {}
  return { title: textos(lang).busqueda.titulo(''), robots: { index: false, follow: true }, alternates: { canonical: rutas.buscar(lang) } }
}

const POR_GRUPO_SIN_FILTRO = 6

function rutaDe(lang: Locale, f: FilaResultado) {
  switch (f.tipo) {
    case 'lugar': return rutas.lugar(lang, f.slug)
    case 'evento': return rutas.evento(lang, f.slug)
    case 'articulo': return rutas.articulo(lang, f.slug)
    case 'zona': return rutas.zona(lang, f.slug)
    case 'categoria': return rutas.categoria(lang, f.slug)
  }
}

function Resaltado({ texto, q }: { texto: string; q: string }) {
  return <>{partesResaltadas(texto, q).map((p, i) => (p.coincide ? <mark key={i}>{p.texto}</mark> : <span key={i}>{p.texto}</span>))}</>
}

const Lupa = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
)

const LupaSola = () => (
  <svg viewBox="0 0 88 88" aria-hidden="true">
    <circle cx="44" cy="44" r="42" fill="#FCF6ED" />
    <g className="lupa-sola" fill="none" stroke="#1F1A14" strokeWidth="5" strokeLinecap="round">
      <circle cx="40" cy="40" r="15" />
      <path d="M51 51l11 11" />
    </g>
  </svg>
)

export default async function Buscar({ params, searchParams }: Props) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  const consulta = leerConsultaBusqueda(paramsDe(await searchParams))
  const t = textos(lang)
  const zonas = await zonasActivasCacheadas(lang)
  // Una zona que no existe se ignora, también en los links de los chips.
  const zona = consulta.zona ? porSlug(zonas, consulta.zona) : undefined
  const zonaTours = zonaDeTours({ tipo: 'busqueda', filtroZona: consulta.zona ?? null, zonaContexto: null, zonas })
  const ahora = new Date()
  // Las coincidencias van sin unstable_cache: el término lo escribe el visitante y no debe volverse llave de la
  // Data Cache (como las sugerencias). Las listas de visibilidad sí van cacheadas.
  const [todas, lugares, eventos, articulos, cats] = await Promise.all([
    consulta.q
      ? obtenerPayload().then((payload) => coincidencias(payload, { q: consulta.q, lang, tipo: consulta.tipo, zonaId: zona?.id ?? null }))
      : Promise.resolve([]),
    lugaresCacheados(lang), eventosCacheados(lang), articulosCacheados(lang), categoriasCacheadas(lang),
  ])
  // Solo lo que el público puede abrir: lo que está en las listas del idioma (F3b). Una categoría sin lugares o un
  // lugar de una zona inactiva darían 404 (plan F3c).
  const visibles: Record<string, Set<number>> = {
    lugar: new Set(lugares.map((x) => x.id)),
    evento: new Set(eventos.map((x) => x.id)),
    articulo: new Set(articulos.map((x) => x.id)),
    zona: new Set(zonas.map((x) => x.id)),
    categoria: new Set(categoriasConLugares(lugares, cats).map((x) => x.id)),
  }
  // Eventos pasados fuera (spec §7); el orden con patrocinios y la paginación, sobre el grupo completo.
  const vigentes = todas
    .filter((f) => visibles[f.tipo].has(f.docId))
    .filter((f) => f.tipo !== 'evento' || esEventoProximo({ inicio: f.inicio ?? '', fin: f.fin }, ahora))
  const grupos = TIPOS_BUSQUEDA.map((tipo) => ({ tipo, filas: ordenarGrupo(vigentes.filter((f) => f.tipo === tipo), ahora) })).filter((g) => g.filas.length)
  const ruta = rutas.buscar(lang)
  const consultaCon = (cambio: Record<string, string | null>) => {
    const p = new URLSearchParams({ q: consulta.q })
    const f = { tipo: consulta.tipo, zona: zona?.slug ?? null, ...cambio }
    if (f.tipo) p.set('tipo', f.tipo)
    if (f.zona) p.set('zona', f.zona)
    return p.toString()
  }
  const pagina = consulta.tipo ? paginar(grupos[0]?.filas ?? [], consulta.pagina) : null
  if (consulta.tipo && !pagina && consulta.pagina > 1) redirect(conConsulta(ruta, consultaCon({})))

  return (
    <div className="ancho pagina-busqueda">
      <section className="busca-cabeza" aria-labelledby="titulo">
        <form className="busca-grande" role="search" action={ruta}>
          <Lupa />
          <label className="solo-lector" htmlFor="q-grande">{t.cabecera.buscar}</label>
          <input id="q-grande" type="search" name="q" defaultValue={consulta.q} placeholder={t.cabecera.ejemplo} autoComplete="off" />
          <button type="submit">{t.busqueda.buscar}</button>
        </form>
        <h1 id="titulo">{t.busqueda.titulo(consulta.q)}</h1>
      </section>

      {consulta.q ? (
        <TransicionFiltros
          esqueleto={<EsqueletoBusqueda />}
          controles={
            <>
              <nav className="pestanas" aria-label={t.busqueda.tipoResultado}>
                <Link href={conConsulta(ruta, consultaCon({ tipo: null }))} aria-current={!consulta.tipo ? 'page' : undefined}>{t.busqueda.todos}</Link>
                {(['lugar', 'evento', 'articulo'] as const).map((tipo) => (
                  <Link key={tipo} href={conConsulta(ruta, consultaCon({ tipo }))} aria-current={consulta.tipo === tipo ? 'page' : undefined}>{t.busqueda.tipos[tipo]}</Link>
                ))}
              </nav>
              <nav className="pildoras zonas-filtro" aria-label={t.cabecera.zonas}>
                <Link className="chip" href={conConsulta(ruta, consultaCon({ zona: null }))} aria-current={!zona ? 'page' : undefined}>{t.busqueda.todasLasZonas}</Link>
                {zonas.map((z) => (
                  <Link key={z.id} className="chip" href={conConsulta(ruta, consultaCon({ zona: z.slug }))} aria-current={zona?.id === z.id ? 'page' : undefined}>{z.nombre}</Link>
                ))}
              </nav>
            </>
          }
        >
          {grupos.length === 0 && (
            <section className="vacio" aria-labelledby="t-vacio">
              <LupaSola />
              <h2 id="t-vacio">{t.busqueda.vacio(consulta.q)}</h2>
              <p>{t.busqueda.sugerencia}</p>
            </section>
          )}

          {grupos.map((g) => {
            const filas = consulta.tipo ? (pagina?.items ?? []) : g.filas.slice(0, POR_GRUPO_SIN_FILTRO)
            return (
              <section key={g.tipo} className="grupo" aria-labelledby={`g-${g.tipo}`}>
                <h2 id={`g-${g.tipo}`}>{t.busqueda.tipos[g.tipo]} <small>{g.filas.length}</small></h2>
                <div className="resultados">
                  {filas.map((f) => {
                    const declarado = (f.tipo === 'lugar' || f.tipo === 'evento') && patrocinioDeclarado(f.patrocinio, ahora)
                    return (
                      <Link key={`${f.tipo}-${f.docId}`} className="res presionable" href={rutaDe(lang, f)} rel={declarado ? 'sponsored' : undefined}>
                        {declarado && <span className="patrocinado">{t.tarjetas.patrocinado}</span>}
                        <p className="titular"><Resaltado texto={f.titulo} q={consulta.q} /></p>
                        {f.texto && <p className="bajada"><Resaltado texto={f.texto.slice(0, 160)} q={consulta.q} /></p>}
                      </Link>
                    )
                  })}
                </div>
                {!consulta.tipo && g.filas.length > POR_GRUPO_SIN_FILTRO && (g.tipo === 'lugar' || g.tipo === 'evento' || g.tipo === 'articulo') && (
                  <Link className="chip presionable ver-todos" href={conConsulta(ruta, consultaCon({ tipo: g.tipo }))}>{t.secciones.verTodas}</Link>
                )}
              </section>
            )
          })}

          {pagina && <Paginacion lang={lang} ruta={ruta} pagina={pagina.pagina} totalPaginas={pagina.totalPaginas} consulta={consultaCon({})} />}
        </TransicionFiltros>
      ) : null}
      {/* Spec de presencia §2.4: con o sin resultados, la zona del filtro o la principal. */}
      {zonaTours && <ToursEnZona lang={lang} zona={zonaTours} pieza="busqueda" origen="busqueda" formato="fila" limite={3} />}
    </div>
  )
}
