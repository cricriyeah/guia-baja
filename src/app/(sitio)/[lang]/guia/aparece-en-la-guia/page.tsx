import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { esLocale, LOCALES } from '../../../../../dominio/idioma'
import { rutas } from '../../../../../dominio/rutas'
import { ajustesCacheados, zonasActivasCacheadas } from '../../../../../sitio/datos/cacheadas'
import { guiaIndexable, sitioUrl } from '../../../../../sitio/entorno'
import '../../../../../sitio/estilos/aparece.css'
import { migasLd } from '../../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../../sitio/seo/metadatos'
import { versionesDe } from '../../../../../sitio/seo/versiones'
import { textos } from '../../../../../sitio/textos'
import { FormularioSolicitud } from '../../../../../sitio/ui/FormularioSolicitud'
import { JsonLd } from '../../../../../sitio/ui/JsonLd'
import { Migas } from '../../../../../sitio/ui/Migas'

// ISR y no dinámica (ver privacidad/page.tsx): sin generateStaticParams un segmento dinámico queda ƒ. La página
// nunca lee headers(): la IP y el origen solo los lee la Server Action, y el siteKey sale del entorno al generarla.
export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!esLocale(lang)) return {}
  const { propia, versiones } = versionesDe({ lang, guiaIndexable: guiaIndexable(), rutas: Object.fromEntries(LOCALES.map((l) => [l, rutas.negocios(l)])) })
  const t = textos(lang).formulario
  return metadatos({ lang, titulo: t.titulo, descripcion: t.explicacion, ruta: propia.ruta, indexable: propia.indexable, versiones })
}

export default async function Aparece({ params }: Props) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  const [ajustes, zonas] = await Promise.all([ajustesCacheados(lang), zonasActivasCacheadas(lang)])
  const t = textos(lang)
  const migas = [
    { nombre: t.migas.guia, ruta: rutas.portada(lang) },
    { nombre: t.formulario.titulo, ruta: rutas.negocios(lang) },
  ]
  return (
    <div className="ancho pagina-aparece">
      <Migas lang={lang} migas={migas} />
      <div className="negocios">
        <section className="explica" aria-labelledby="titulo">
          <h1 id="titulo" className="t-pagina">{t.formulario.titulo}</h1>
          <p>{t.formulario.explicacion}</p>
          <ol className="pasos">
            {t.formulario.pasos.map((p, i) => <li key={i}><b>{i + 1}</b><span><strong>{p.titulo}</strong> {p.texto}</span></li>)}
          </ol>
          <p className="meta">{t.formulario.notaPatrocinio}</p>
        </section>
        <section aria-label={t.formulario.cuentanos}>
          {ajustes.formularioActivo ? (
            <FormularioSolicitud lang={lang} zonas={zonas.map(({ id, nombre, slug }) => ({ id, nombre, slug }))} siteKey={process.env.TURNSTILE_SITE_KEY ?? ''} version={ajustes.versionAviso} />
          ) : (
            <div className="cerrado"><h2>{t.formulario.pronto}</h2><p>{t.formulario.prontoTexto}</p></div>
          )}
        </section>
      </div>
      <JsonLd datos={migasLd(migas, sitioUrl())} />
    </div>
  )
}
