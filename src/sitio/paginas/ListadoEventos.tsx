import type { Metadata } from 'next'

import { consultaDeFiltros, filtrarEventos } from '../../dominio/filtros'
import { LOCALES, type Locale } from '../../dominio/idioma'
import { paginar } from '../../dominio/paginacion'
import { conConsulta, rutas } from '../../dominio/rutas'
import { categoriasCacheadas, eventosCacheados, lugaresCacheados, zonasActivasCacheadas } from '../datos/cacheadas'
import { eventosProximos, porId } from '../datos/consultas'
import { guiaIndexable, sitioUrl } from '../entorno'
import '../estilos/portada.css' // .encabezado, .agenda y .fecha de FilaAgenda
import { listaLd, migasLd } from '../seo/jsonld'
import { metadatos } from '../seo/metadatos'
import { versionesDe } from '../seo/versiones'
import { textos } from '../textos'
import { Aparece } from '../ui/Aparece'
import { JsonLd } from '../ui/JsonLd'
import { Migas } from '../ui/Migas'
import { NoEncontradoEnSuspense } from '../ui/NoEncontradoEnSuspense'
import { Paginacion } from '../ui/Paginacion'
import { Pildoras } from '../ui/Pildoras'
import { FilaAgenda } from '../ui/tarjetas/FilaAgenda'
import { desviar, totalPaginasDe, type Variante } from './comun'

// Spec §7: los próximos ya vienen ordenados (patrocinios arriba, luego por inicio) desde `eventosProximos`.
// Un listado de eventos existe siempre, aunque no tenga eventos: no lleva umbral de indexación.
export async function metadatosEventos(lang: Locale, v: Variante): Promise<Metadata> {
  const ahora = new Date().toISOString()
  const totalPaginas: Partial<Record<Locale, number>> = {}
  await Promise.all(
    LOCALES.map(async (l) => {
      totalPaginas[l] = totalPaginasDe(eventosProximos(await eventosCacheados(l), ahora, {}).length)
    }),
  )
  // Nunca llama notFound(): una página fuera de rango devuelve {} y el 404 lo da la página.
  if (!v.filtros && v.pagina > (totalPaginas[lang] ?? 1)) return {}
  const { propia, versiones } = versionesDe({
    lang,
    guiaIndexable: guiaIndexable(),
    rutas: { es: rutas.eventos('es'), en: rutas.eventos('en') },
    pagina: v.filtros ? 1 : v.pagina,
    totalPaginas,
    conFiltros: Boolean(v.filtros),
  })
  const t = textos(lang).listado
  return metadatos({
    lang,
    titulo: t.eventosTitulo,
    descripcion: t.eventosIntro,
    ruta: v.filtros ? rutas.eventos(lang) : propia.ruta,
    indexable: propia.indexable,
    versiones,
  })
}

export async function ListadoEventos({ lang, variante }: { lang: Locale; variante: Variante }) {
  const [zonas, cats, lugares, eventos] = await Promise.all([
    zonasActivasCacheadas(lang), categoriasCacheadas(lang), lugaresCacheados(lang), eventosCacheados(lang),
  ])
  const ruta = rutas.eventos(lang)
  const filtros = variante.filtros ?? {}
  // Zona inexistente: la variante con filtros redirige al listado base (ruling C3); la ISR nunca la recibe.
  if (filtros.zona && !zonas.some((z) => z.slug === filtros.zona)) desviar(variante, ruta)
  const proximos = eventosProximos(eventos, new Date().toISOString(), {})
  const filtrados = variante.filtros ? filtrarEventos(proximos, variante.filtros) : proximos
  const pag = paginar(filtrados, variante.pagina)
  // Página fuera de rango: la variante con filtros vuelve a su consulta sin `pagina`; la ISR da 404 (ruling C2).
  if (!pag) {
    desviar(variante, conConsulta(ruta, consultaDeFiltros(filtros)))
    return <NoEncontradoEnSuspense lang={lang} segmentos={['eventos']} />
  }
  const t = textos(lang)
  const migas = [{ nombre: t.migas.guia, ruta: rutas.portada(lang) }, { nombre: t.evento.eventos, ruta }]
  const zonasConEventos = zonas.filter((z) => proximos.some((e) => e.zonaId === z.id))
  return (
    <div className="ancho">
      <Migas lang={lang} migas={migas} />
      <section className="encabezado" aria-labelledby="titulo">
        <h1 id="titulo" className="t-pagina">{t.listado.eventosTitulo}</h1>
        <p>{t.listado.eventosIntro}</p>
      </section>
      <Pildoras
        etiqueta={t.cabecera.zonas}
        items={[
          { nombre: t.listado.todasLasZonas, ruta, actual: !filtros.zona },
          ...zonasConEventos.map((z) => ({
            nombre: z.nombre,
            ruta: conConsulta(ruta, consultaDeFiltros({ ...filtros, zona: z.slug })),
            actual: filtros.zona === z.slug,
          })),
        ]}
      />
      {pag.items.length ? (
        <div className="agenda">
          {pag.items.map((e) => (
            <FilaAgenda key={e.id} lang={lang} evento={e} categoria={porId(cats, e.categoriaIds[0])} lugarNombre={porId(lugares, e.lugarId)?.nombre} />
          ))}
        </div>
      ) : (
        <p>{t.secciones.sinEventos}</p>
      )}
      <Paginacion lang={lang} ruta={ruta} pagina={pag.pagina} totalPaginas={pag.totalPaginas} consulta={variante.filtros ? consultaDeFiltros(variante.filtros) : ''} />
      <Aparece lang={lang} />
      <JsonLd datos={migasLd(migas, sitioUrl())} />
      <JsonLd datos={listaLd(pag.items.map((e) => ({ nombre: e.nombre, ruta: rutas.evento(lang, e.slug) })), sitioUrl())} />
    </div>
  )
}
