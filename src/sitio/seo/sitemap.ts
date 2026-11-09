import { LOCALES, type Locale } from '../../dominio/idioma'
import { hreflang, type VersionIdioma } from '../../dominio/indexable'
import { rutas } from '../../dominio/rutas'
import { lugaresDeTema, temaIndexable } from '../../dominio/temas'
import { UMBRAL_INDEXABLE, UMBRAL_PAGINA } from '../../dominio/umbrales'
import type { CategoriaPublica, TarjetaArticulo, TarjetaEvento, TarjetaItinerario, TarjetaLugar, TarjetaTema, ZonaPublica } from '../datos/tipos'

export type DatosIdioma = {
  zonas: ZonaPublica[]
  categorias: CategoriaPublica[]
  lugares: TarjetaLugar[]
  eventos: TarjetaEvento[]
  articulos: TarjetaArticulo[]
  itinerarios: TarjetaItinerario[]
  temas: TarjetaTema[]
  avisoExiste: boolean
}
type Entrada = { ruta: string; alternos: Record<string, string> }
type Version = { ruta: string; indexable: boolean }

// Un «documento lógico» con su versión en cada idioma (si existe ahí); cada versión indexable es una URL.
function agregar(salida: Entrada[], versiones: Partial<Record<Locale, Version>>) {
  const vs: VersionIdioma[] = LOCALES.filter((l) => versiones[l]).map((l) => ({ lang: l, ...versiones[l]! }))
  for (const v of vs) if (v.indexable) salida.push({ ruta: v.ruta, alternos: hreflang(v, vs) })
}

// Spec §9: todas las URLs indexables de los dos idiomas y sus alternos indexables. Sin búsqueda ni variantes.
export function entradasSitemap(datos: Record<Locale, DatosIdioma>, guiaIndexable: boolean): Entrada[] {
  if (!guiaIndexable) return []
  const s: Entrada[] = []
  const porIdioma = <T>(f: (l: Locale, d: DatosIdioma) => T | null) =>
    Object.fromEntries(LOCALES.map((l) => [l, f(l, datos[l])]).filter(([, v]) => v !== null)) as Partial<Record<Locale, T>>

  agregar(s, porIdioma((l) => ({ ruta: rutas.portada(l), indexable: true })))
  agregar(s, porIdioma((l) => ({ ruta: rutas.eventos(l), indexable: true })))
  agregar(s, porIdioma((l) => ({ ruta: rutas.negocios(l), indexable: true })))
  agregar(s, porIdioma((l, d) => (d.avisoExiste ? { ruta: rutas.privacidad(l), indexable: true } : null)))

  const zonaIds = new Set(LOCALES.flatMap((l) => datos[l].zonas.map((z) => z.id)))
  const catIds = new Set(LOCALES.flatMap((l) => datos[l].categorias.filter((c) => c.aplicaA !== 'evento').map((c) => c.id)))
  for (const zid of zonaIds) {
    agregar(s, porIdioma((l, d) => {
      const z = d.zonas.find((x) => x.id === zid)
      return z ? { ruta: rutas.zona(l, z.slug), indexable: true } : null
    }))
    for (const cid of catIds) {
      agregar(s, porIdioma((l, d) => {
        const z = d.zonas.find((x) => x.id === zid)
        const c = d.categorias.find((x) => x.id === cid)
        const n = d.lugares.filter((x) => x.zonaId === zid && x.categoriaIds.includes(cid)).length
        return z && c && n >= UMBRAL_PAGINA ? { ruta: rutas.categoriaEnZona(l, z.slug, c.slug), indexable: n >= UMBRAL_INDEXABLE } : null
      }))
    }
  }
  for (const cid of catIds) {
    agregar(s, porIdioma((l, d) => {
      const c = d.categorias.find((x) => x.id === cid)
      const activas = new Set(d.zonas.map((z) => z.id))
      const n = d.lugares.filter((x) => x.categoriaIds.includes(cid) && activas.has(x.zonaId)).length
      return c && n >= UMBRAL_PAGINA ? { ruta: rutas.categoria(l, c.slug), indexable: n >= UMBRAL_INDEXABLE } : null
    }))
  }
  const docs = <T extends { id: number; slug: string; noIndexar: boolean }>(lista: (d: DatosIdioma) => T[], ruta: (l: Locale, slug: string) => string) => {
    const ids = new Set(LOCALES.flatMap((l) => lista(datos[l]).map((x) => x.id)))
    for (const id of ids) {
      agregar(s, porIdioma((l, d) => {
        const x = lista(d).find((y) => y.id === id)
        return x ? { ruta: ruta(l, x.slug), indexable: !x.noIndexar } : null
      }))
    }
  }
  docs((d) => d.lugares, rutas.lugar)
  docs((d) => d.eventos, rutas.evento) // Spec §6: los eventos pasados siguen en el sitemap.
  docs((d) => d.articulos, rutas.articulo)
  docs((d) => d.itinerarios, rutas.itinerario)
  const temaIds = new Set(LOCALES.flatMap((l) => datos[l].temas.map((x) => x.id)))
  for (const id of temaIds) {
    agregar(s, porIdioma((l, d) => {
      const x = d.temas.find((y) => y.id === id)
      if (!x) return null
      const n = lugaresDeTema(x.criterios, { lugares: d.lugares, zonasActivasIds: d.zonas.map((z) => z.id) }, new Date()).length
      return { ruta: rutas.tema(l, x.slug), indexable: !x.noIndexar && temaIndexable(n) }
    }))
  }
  return s
}

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

export function xmlSitemap(entradas: Entrada[], base: string): string {
  const abs = (r: string) => escapar(new URL(r, base).toString())
  const urls = entradas.map((e) => {
    const alternos = Object.entries(e.alternos).map(([h, r]) => `<xhtml:link rel="alternate" hreflang="${h}" href="${abs(r)}"/>`).join('')
    return `<url><loc>${abs(e.ruta)}</loc>${alternos}</url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>\n`
}
