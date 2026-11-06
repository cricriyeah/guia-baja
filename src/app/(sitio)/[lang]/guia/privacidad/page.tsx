// src/app/(sitio)/[lang]/guia/privacidad/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { inicioDelDiaGuardado, ZONA_HORARIA } from '../../../../../dominio/fechas'
import { esLocale, tieneValor, type Locale } from '../../../../../dominio/idioma'
import { encabezadosDe } from '../../../../../dominio/lexical'
import { rutas } from '../../../../../dominio/rutas'
import { ajustesCacheados } from '../../../../../sitio/datos/cacheadas'
import { guiaIndexable, sitioUrl } from '../../../../../sitio/entorno'
import '../../../../../sitio/estilos/privacidad.css'
import { rutasPorIdioma } from '../../../../../sitio/paginas/comun'
import { migasLd } from '../../../../../sitio/seo/jsonld'
import { metadatos } from '../../../../../sitio/seo/metadatos'
import { rutaOg } from '../../../../../sitio/seo/og'
import { versionesDe } from '../../../../../sitio/seo/versiones'
import { textos } from '../../../../../sitio/textos'
import { CopiarCorreo } from '../../../../../sitio/ui/CopiarCorreo'
import { CuerpoRico } from '../../../../../sitio/ui/CuerpoRico'
import { JsonLd } from '../../../../../sitio/ui/JsonLd'
import { Migas } from '../../../../../sitio/ui/Migas'
import { NoEncontradoEnSuspense } from '../../../../../sitio/ui/NoEncontradoEnSuspense'

// ISR y no dinámica (ver articulos/[slug]/page.tsx): sin generateStaticParams un segmento dinámico queda ƒ.
export const revalidate = 3600
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string }> }

// El aviso no lleva enlaces internos ni bloques de media: nada que resolver.
const SIN_RESOLVER = { lugar: () => undefined, evento: () => undefined, href: () => null }

// Nunca llama notFound() ni noEncontrado(): sin aviso en el idioma devuelve metadatos vacíos y el 404 lo da la página.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!esLocale(lang)) return {}
  if (!tieneValor((await ajustesCacheados(lang)).avisoPrivacidad)) return {}
  const rutasIdioma = await rutasPorIdioma(async (l) =>
    tieneValor((await ajustesCacheados(l)).avisoPrivacidad) ? rutas.privacidad(l) : undefined,
  )
  const { propia, versiones } = versionesDe({ lang, guiaIndexable: guiaIndexable(), rutas: rutasIdioma })
  const t = textos(lang).privacidad
  return metadatos({ lang, titulo: t.titulo, descripcion: t.titulo, ruta: propia.ruta, indexable: propia.indexable, versiones, imagenOg: rutaOg(lang, 'pagina', ['privacidad']) })
}

// avisoVigenteDesde es de solo día: inicioDelDiaGuardado lo lleva a la medianoche de la Baja para que no caiga un día antes.
const fechaVigente = (dia: string, lang: Locale) =>
  new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { timeZone: ZONA_HORARIA, dateStyle: 'long' }).format(inicioDelDiaGuardado(dia))

export default async function Privacidad({ params }: Props) {
  const { lang } = await params
  if (!esLocale(lang)) notFound()
  const a = await ajustesCacheados(lang)
  // Sin aviso en este idioma: redirección (308) o 404 dentro de un Suspense; con aviso, todo se pinta fuera de él.
  if (!tieneValor(a.avisoPrivacidad)) return <NoEncontradoEnSuspense lang={lang} segmentos={['privacidad']} />
  const t = textos(lang)
  const indice = encabezadosDe(a.avisoPrivacidad)
  const migas = [
    { nombre: t.migas.guia, ruta: rutas.portada(lang) },
    { nombre: t.privacidad.titulo, ruta: rutas.privacidad(lang) },
  ]
  return (
    <div className="ancho pagina-privacidad">
      <Migas lang={lang} migas={migas} />
      <header className="aviso-cabeza">
        <h1>{t.privacidad.titulo}</h1>
        {(a.versionAviso || a.avisoVigenteDesde) && (
          <div className="version">
            {a.versionAviso && <span>{t.privacidad.version(a.versionAviso)}</span>}
            {a.avisoVigenteDesde && <span>{t.privacidad.vigente(fechaVigente(a.avisoVigenteDesde, lang))}</span>}
          </div>
        )}
      </header>
      <div className="cuerpo-aviso">
        {indice.length > 1 && (
          <nav className="indice" aria-label={t.privacidad.enEste}>
            <h2>{t.privacidad.enEste}</h2>
            <div>{indice.map((h) => <a key={h.id} href={`#${h.id}`}>{h.texto}</a>)}</div>
          </nav>
        )}
        <div>
          <CuerpoRico lang={lang} cuerpo={a.avisoPrivacidad} resolutor={SIN_RESOLVER} media={{}} categorias={[]} className="legal" />
          {a.correoPrivacidad && (
            <div className="contacto-arco">
              <p>{t.privacidad.correo}</p>
              <CopiarCorreo correo={a.correoPrivacidad} copiar={t.privacidad.copiar} copiado={t.privacidad.copiado} />
            </div>
          )}
        </div>
      </div>
      <JsonLd datos={migasLd(migas, sitioUrl())} />
    </div>
  )
}
