import type { Metadata } from 'next'
import Link from 'next/link'

import { CARACTERISTICAS } from '../../dominio/caracteristicas'
import { kmEnLineaRecta } from '../../dominio/distancia'
import { consultaDeFiltros, type Filtros } from '../../dominio/filtros'
import type { Locale } from '../../dominio/idioma'
import { conConsulta, rutas } from '../../dominio/rutas'
import { UMBRAL_PAGINA } from '../../dominio/umbrales'
import { articulosCacheados, categoriasCacheadas, lugaresCacheados, textoCacheado, zonasActivasCacheadas } from '../datos/cacheadas'
import { articulosDeZona, categoriasConLugares, lugaresDe, porId, porSlug } from '../datos/consultas'
import { guiaIndexable, sitioUrl } from '../entorno'
import '../estilos/categoria.css'
import { listaLd, migasLd } from '../seo/jsonld'
import { metadatos } from '../seo/metadatos'
import { rutaOg } from '../seo/og'
import { textos } from '../textos'
import { Aparece } from '../ui/Aparece'
import { EsqueletoResultados } from '../ui/esqueletos/Categoria'
import { Imagen } from '../ui/Imagen'
import { JsonLd } from '../ui/JsonLd'
import { Mapa } from '../ui/Mapa'
import { Migas } from '../ui/Migas'
import { NoEncontradoEnSuspense } from '../ui/NoEncontradoEnSuspense'
import { Paginacion } from '../ui/Paginacion'
import { Pildoras } from '../ui/Pildoras'
import { TarjetaArticulo } from '../ui/tarjetas/TarjetaArticulo'
import { TarjetaLugar } from '../ui/tarjetas/TarjetaLugar'
import { TransicionFiltros } from '../ui/TransicionFiltros'
import { desviar, hrefAlternando, recortarListado, versionesListado, type Variante } from './comun'

async function datos(lang: Locale, zonaSlug: string, categoriaSlug: string) {
  const [zonas, cats, lugares] = await Promise.all([zonasActivasCacheadas(lang), categoriasCacheadas(lang), lugaresCacheados(lang)])
  const zona = porSlug(zonas, zonaSlug)
  const cat = porSlug(cats, categoriaSlug)
  if (!zona || !cat || cat.aplicaA === 'evento') return null
  const base = lugaresDe(lugares, { zonaId: zona.id, categoriaId: cat.id })
  if (base.length < UMBRAL_PAGINA) return null
  return { zona, cat, cats, lugares, base }
}

// Nunca llama notFound() ni noEncontrado(): sin combinación devuelve {} y el 404 lo da la página.
export async function metadatosCategoriaEnZona(lang: Locale, zonaSlug: string, categoriaSlug: string, v: Variante): Promise<Metadata> {
  const d = await datos(lang, zonaSlug, categoriaSlug)
  if (!d) return {}
  const seo = await versionesListado({
    lang,
    variante: v,
    guiaIndexable: guiaIndexable(),
    enIdioma: async (l) => {
      const [cats, lugares, zonas] = await Promise.all([categoriasCacheadas(l), lugaresCacheados(l), zonasActivasCacheadas(l)])
      const cat = porId(cats, d.cat.id)
      const zona = porId(zonas, d.zona.id)
      if (!cat || !zona) return null
      return { ruta: rutas.categoriaEnZona(l, zona.slug, cat.slug), conteo: lugaresDe(lugares, { zonaId: zona.id, categoriaId: cat.id }).length }
    },
  })
  if (!seo) return {}
  const t = textos(lang).listado
  const texto = await textoCacheado(d.zona.id, d.cat.id, lang)
  return metadatos({
    lang,
    titulo: t.titulo(d.cat.nombre, d.zona.nombre),
    descripcion: texto?.introduccion ?? t.introAuto(d.base.length, d.cat.nombre, d.zona.nombre),
    ruta: seo.canonica,
    indexable: seo.indexable,
    versiones: seo.versiones,
    imagenOg: rutaOg(lang, 'categoria-zona', [d.zona.slug, d.cat.slug]),
    pagina: v.pagina,
  })
}

function ChipsFiltros({ lang, ruta, filtros, precios }: { lang: Locale; ruta: string; filtros: Filtros; precios: string[] }) {
  const t = textos(lang).listado
  return (
    <div className="herramientas" aria-label={t.filtros}>
      <Link className="chip" href={ruta} aria-current={consultaDeFiltros(filtros) === '' ? 'page' : undefined}>{t.todas}</Link>
      <Link className="chip" href={hrefAlternando(ruta, filtros, 'abierto', true)} aria-current={filtros.abierto ? 'page' : undefined}>{t.abiertoAhora}</Link>
      {CARACTERISTICAS.map((c) => (
        <Link key={c.valor} className="chip" href={hrefAlternando(ruta, filtros, 'caracteristica', c.valor)} aria-current={filtros.caracteristica === c.valor ? 'page' : undefined}>
          {lang === 'es' ? c.es : c.en}
        </Link>
      ))}
      {precios.length > 0 && <span className="separador" aria-hidden="true" />}
      {precios.map((p) => (
        <Link key={p} className="chip" href={hrefAlternando(ruta, filtros, 'precio', p)} aria-current={filtros.precio === p ? 'page' : undefined}>{p}</Link>
      ))}
    </div>
  )
}

export async function CategoriaEnZona({ lang, zonaSlug, categoriaSlug, variante }: { lang: Locale; zonaSlug: string; categoriaSlug: string; variante: Variante }) {
  const d = await datos(lang, zonaSlug, categoriaSlug)
  // Sin combinación: la variante con filtros redirige al listado base y la ruta ISR da el 404 completo (o la redirección guardada).
  if (!d) {
    desviar(variante, rutas.categoriaEnZona(lang, zonaSlug, categoriaSlug))
    return <NoEncontradoEnSuspense lang={lang} segmentos={[zonaSlug, categoriaSlug]} />
  }
  const { zona, cat, cats, lugares } = d
  const ruta = rutas.categoriaEnZona(lang, zona.slug, cat.slug)
  const pag = recortarListado(d.base, variante)
  // Página fuera de rango: la variante con filtros vuelve a su consulta sin `pagina`; la ISR da 404.
  if (!pag) {
    desviar(variante, conConsulta(ruta, consultaDeFiltros(variante.filtros ?? {})))
    return <NoEncontradoEnSuspense lang={lang} segmentos={[zonaSlug, categoriaSlug]} />
  }
  const t = textos(lang)
  const [texto, articulos] = await Promise.all([textoCacheado(zona.id, cat.id, lang), articulosCacheados(lang)])
  const lecturas = articulosDeZona(articulos, zona.id).filter((a) => a.categoriaIds.includes(cat.id)).slice(0, 3)
  const precios = [...new Set(d.base.map((l) => l.rangoPrecio).filter((p): p is string => Boolean(p)))].sort()
  const fotoPortada = d.base.find((l) => l.foto)?.foto ?? null
  const migas = [
    { nombre: t.migas.guia, ruta: rutas.portada(lang) },
    { nombre: zona.nombre, ruta: rutas.zona(lang, zona.slug) },
    { nombre: cat.nombre, ruta },
  ]
  const conCoordenadas = pag.items.filter((l) => l.coordenadas)
  return (
    <div className="ancho pagina-categoria">
      <Migas lang={lang} migas={migas} />
      <section className={`portada-cat ${cat.claseGrupo}`} aria-labelledby="titulo">
        <div className="portada-cat__texto">
          <h1 id="titulo" className="t-pagina">{t.listado.titulo(cat.nombre, zona.nombre)}</h1>
          <p>{texto?.introduccion ?? t.listado.introAuto(d.base.length, cat.nombre, zona.nombre)}</p>
          <div className="portada-cat__cifras"><span><b>{d.base.length}</b>{t.listado.lugaresSinNumero(d.base.length)}</span></div>
        </div>
        <div className="portada-cat__fotos" aria-hidden="true">
          <Imagen className="activa" imagen={fotoPortada} cargar="eager" sizes="(min-width: 900px) 50vw, 100vw" alt="" />
        </div>
      </section>

      <TransicionFiltros
        esqueleto={<EsqueletoResultados conMapa={conCoordenadas.length > 0} />}
        controles={
          <>
            <Pildoras
              etiqueta={t.portada.categorias}
              items={categoriasConLugares(lugares, cats, zona.id).map((c) => ({ nombre: c.nombre, ruta: rutas.categoriaEnZona(lang, zona.slug, c.slug), actual: c.id === cat.id }))}
            />
            <ChipsFiltros lang={lang} ruta={ruta} filtros={variante.filtros ?? {}} precios={precios} />
          </>
        }
      >
        <p className="contador-res" aria-live="polite">{t.listado.resultados(pag.total)}</p>
        {pag.items.length === 0 ? (
          <p>{t.listado.ninguno}</p>
        ) : (
          <div className="explorar" data-vista="lista">
            <div className="lista">
              {pag.items.map((l, i) => (
                <TarjetaLugar key={l.id} lang={lang} lugar={l} categoria={cat} zonaNombre={zona.nombre} km={l.coordenadas && zona.coordenadas ? kmEnLineaRecta(l.coordenadas, zona.coordenadas) : null} retraso={(i % 6) * 60} />
              ))}
            </div>
            {conCoordenadas.length > 0 && (
              <div className="mapa-cat">
                <Mapa
                  lang={lang}
                  titulo={t.ficha.mapa(t.listado.titulo(cat.nombre, zona.nombre))}
                  puntos={conCoordenadas.map((l) => ({ lng: l.coordenadas![0], lat: l.coordenadas![1], nombre: l.nombre, ruta: rutas.lugar(lang, l.slug) }))}
                />
              </div>
            )}
          </div>
        )}
        <Paginacion lang={lang} ruta={ruta} pagina={pag.pagina} totalPaginas={pag.totalPaginas} consulta={variante.filtros ? consultaDeFiltros(variante.filtros) : ''} />
      </TransicionFiltros>

      {lecturas.length > 0 && (
        <section className="seccion" aria-labelledby="t-leer">
          <div className="seccion__cabeza"><h2 id="t-leer" className="t-seccion">{t.secciones.paraLeer}</h2></div>
          <div className="lecturas">{lecturas.map((a) => <TarjetaArticulo key={a.id} lang={lang} articulo={a} categoria={cat} />)}</div>
        </section>
      )}

      <Aparece lang={lang} />
      <JsonLd datos={migasLd(migas, sitioUrl())} />
      <JsonLd datos={listaLd(pag.items.map((l) => ({ nombre: l.nombre, ruta: rutas.lugar(lang, l.slug) })), sitioUrl())} />
    </div>
  )
}
