import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { esLocale, LOCALES } from '../../../../dominio/idioma'
import { rutas } from '../../../../dominio/rutas'
import { ajustesCacheados, categoriasCacheadas, zonasActivasCacheadas } from '../../../../sitio/datos/cacheadas'
import { guiaIndexable, sitioUrl } from '../../../../sitio/entorno'
import '../../../../sitio/estilos/portada.css'
import { migasLd } from '../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../sitio/seo/metadatos'
import { textos } from '../../../../sitio/textos'
import { JsonLd } from '../../../../sitio/ui/JsonLd'

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
  })
}

// Portada mínima de F3a (zonas y categorías de c-portada.html). F3b agrega destacados, eventos y artículos.
export default async function Portada({ params }: Props) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  const [ajustes, zonas, cats] = await Promise.all([ajustesCacheados(lang), zonasActivasCacheadas(lang), categoriasCacheadas(lang)])
  const t = textos(lang)
  return (
    <div className="ancho">
      <section className="encabezado" aria-labelledby="titulo">
        <h1 id="titulo" className="t-pagina">{ajustes.portadaTitulo ?? t.portada.titulo}</h1>
        <p>{ajustes.portadaIntro ?? t.portada.intro}</p>
      </section>
      <section className="seccion" aria-labelledby="t-zonas">
        <div className="seccion__cabeza"><h2 id="t-zonas" className="t-seccion">{t.portada.zonas}</h2></div>
        <div className="zonas-rejilla">
          {zonas.map((z) => (
            <Link key={z.id} className="zona-tarjeta tarjeta presionable" href={rutas.zona(lang, z.slug)}>
              <div className="media">{z.foto && <img src={z.foto.src} srcSet={z.foto.srcset} sizes="(min-width: 720px) 33vw, 100vw" alt="" loading="lazy" />}</div>
              <span className="flecha" aria-hidden="true">→</span>
              <div className="velo-texto">
                <h3>{z.nombre}</h3>
                {z.descripcion && <p>{z.descripcion}</p>}
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="seccion" aria-labelledby="t-cat">
        <div className="seccion__cabeza"><h2 id="t-cat" className="t-seccion">{t.portada.categorias}</h2></div>
        <div className="categorias">
          {cats
            .filter((c) => c.aplicaA !== 'evento')
            .map((c) => (
              <Link key={c.id} className={`cat ${c.claseGrupo} presionable`} href={rutas.categoria(lang, c.slug)}>
                <strong>{c.nombre}</strong>
              </Link>
            ))}
        </div>
      </section>
      <JsonLd datos={migasLd([{ nombre: t.migas.guia, ruta: rutas.portada(lang) }], sitioUrl())} />
    </div>
  )
}
