import type { Metadata } from 'next'
import Link from 'next/link'

import { consultaDeFiltros } from '../../dominio/filtros'
import type { Locale } from '../../dominio/idioma'
import { conConsulta, rutas } from '../../dominio/rutas'
import { UMBRAL_PAGINA } from '../../dominio/umbrales'
import { categoriasCacheadas, lugaresCacheados, zonasActivasCacheadas } from '../datos/cacheadas'
import { lugaresDe, porId, porSlug } from '../datos/consultas'
import type { TarjetaLugar as Lugar, ZonaPublica } from '../datos/tipos'
import { guiaIndexable, sitioUrl } from '../entorno'
import '../estilos/categoria.css'
import { listaLd, migasLd } from '../seo/jsonld'
import { metadatos } from '../seo/metadatos'
import { textos } from '../textos'
import { Aparece } from '../ui/Aparece'
import { JsonLd } from '../ui/JsonLd'
import { Migas } from '../ui/Migas'
import { NoEncontradoEnSuspense } from '../ui/NoEncontradoEnSuspense'
import { Paginacion } from '../ui/Paginacion'
import { Pildoras } from '../ui/Pildoras'
import { TarjetaLugar } from '../ui/tarjetas/TarjetaLugar'
import { desviar, hrefAlternando, recortarListado, versionesListado, type Variante } from './comun'

// Solo lugares de zonas activas: los demás no se pintan, así que tampoco cuentan para umbrales ni paginación.
function lugaresVisibles(lugares: Lugar[], zonas: ZonaPublica[], categoriaId: number): Lugar[] {
  const activas = new Set(zonas.map((z) => z.id))
  return lugaresDe(lugares, { categoriaId }).filter((l) => activas.has(l.zonaId))
}

async function datos(lang: Locale, categoriaSlug: string) {
  const [zonas, cats, lugares] = await Promise.all([zonasActivasCacheadas(lang), categoriasCacheadas(lang), lugaresCacheados(lang)])
  const cat = porSlug(cats, categoriaSlug)
  if (!cat || cat.aplicaA === 'evento') return null
  const base = lugaresVisibles(lugares, zonas, cat.id)
  if (base.length < UMBRAL_PAGINA) return null
  return { zonas, cat, base }
}

// Nunca llama notFound() ni noEncontrado(): sin categoría devuelve {} y el 404 lo da la página.
export async function metadatosCategoriaGlobal(lang: Locale, categoriaSlug: string, v: Variante): Promise<Metadata> {
  const d = await datos(lang, categoriaSlug)
  if (!d) return {}
  const seo = await versionesListado({
    lang,
    variante: v,
    guiaIndexable: guiaIndexable(),
    enIdioma: async (l) => {
      const [cats, lugares, zonas] = await Promise.all([categoriasCacheadas(l), lugaresCacheados(l), zonasActivasCacheadas(l)])
      const cat = porId(cats, d.cat.id)
      return cat ? { ruta: rutas.categoria(l, cat.slug), conteo: lugaresVisibles(lugares, zonas, cat.id).length } : null
    },
  })
  if (!seo) return {}
  const t = textos(lang).listado
  return metadatos({
    lang,
    titulo: t.enTodas(d.cat.nombre),
    descripcion: t.introTodas(d.base.length, d.cat.nombre),
    ruta: seo.canonica,
    indexable: seo.indexable,
    versiones: seo.versiones,
  })
}

export async function CategoriaGlobal({ lang, categoriaSlug, variante }: { lang: Locale; categoriaSlug: string; variante: Variante }) {
  const d = await datos(lang, categoriaSlug)
  // Sin categoría: la variante con filtros redirige al listado base y la ruta ISR da el 404 completo (o la redirección guardada).
  if (!d) {
    desviar(variante, rutas.categoria(lang, categoriaSlug))
    return <NoEncontradoEnSuspense lang={lang} segmentos={['categoria', categoriaSlug]} />
  }
  const ruta = rutas.categoria(lang, d.cat.slug)
  const pag = recortarListado(d.base, variante)
  // Página fuera de rango: la variante con filtros vuelve a su consulta sin `pagina`; la ISR da 404.
  if (!pag) {
    desviar(variante, conConsulta(ruta, consultaDeFiltros(variante.filtros ?? {})))
    return <NoEncontradoEnSuspense lang={lang} segmentos={['categoria', categoriaSlug]} />
  }
  const t = textos(lang)
  const filtros = variante.filtros ?? {}
  const zonasConLugares = d.zonas.filter((z) => d.base.some((l) => l.zonaId === z.id))
  const migas = [{ nombre: t.migas.guia, ruta: rutas.portada(lang) }, { nombre: d.cat.nombre, ruta }]
  return (
    <div className="ancho pagina-categoria">
      <Migas lang={lang} migas={migas} />
      <section className={`portada-cat ${d.cat.claseGrupo}`} aria-labelledby="titulo">
        <div className="portada-cat__texto">
          <h1 id="titulo" className="t-pagina">{t.listado.enTodas(d.cat.nombre)}</h1>
          <p>{t.listado.introTodas(d.base.length, d.cat.nombre)}</p>
        </div>
      </section>
      <Pildoras etiqueta={t.cabecera.zonas} items={zonasConLugares.map((z) => ({ nombre: z.nombre, ruta: rutas.categoriaEnZona(lang, z.slug, d.cat.slug) }))} />
      <div className="herramientas" aria-label={t.listado.filtros}>
        <Link className="chip" href={ruta} aria-current={consultaDeFiltros(filtros) === '' ? 'page' : undefined}>{t.listado.todasLasZonas}</Link>
        {zonasConLugares.map((z) => (
          <Link key={z.id} className="chip" href={hrefAlternando(ruta, filtros, 'zona', z.slug)} aria-current={filtros.zona === z.slug ? 'page' : undefined}>
            {z.nombre}
          </Link>
        ))}
      </div>
      <p className="contador-res" aria-live="polite">{t.listado.resultados(pag.total)}</p>
      {pag.items.length === 0 && <p>{t.listado.ninguno}</p>}
      {/* Spec §7: los lugares de la página agrupados por zona, en el orden de las zonas activas. */}
      {zonasConLugares.map((z) => {
        const deZona = pag.items.filter((l) => l.zonaId === z.id)
        if (!deZona.length) return null
        return (
          <section key={z.id} className="seccion" aria-labelledby={`z-${z.id}`}>
            <div className="seccion__cabeza"><h2 id={`z-${z.id}`} className="t-seccion">{z.nombre}</h2></div>
            <div className="lista">{deZona.map((l) => <TarjetaLugar key={l.id} lang={lang} lugar={l} categoria={d.cat} zonaNombre={z.nombre} />)}</div>
          </section>
        )
      })}
      <Paginacion lang={lang} ruta={ruta} pagina={pag.pagina} totalPaginas={pag.totalPaginas} consulta={variante.filtros ? consultaDeFiltros(variante.filtros) : ''} />
      <Aparece lang={lang} />
      <JsonLd datos={migasLd(migas, sitioUrl())} />
      <JsonLd datos={listaLd(pag.items.map((l) => ({ nombre: l.nombre, ruta: rutas.lugar(lang, l.slug) })), sitioUrl())} />
    </div>
  )
}
