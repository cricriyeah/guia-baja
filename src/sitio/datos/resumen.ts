import { isoEnMazatlan } from '../../dominio/fechas'
import type { Locale } from '../../dominio/idioma'
import { rutas } from '../../dominio/rutas'
import { articulosDeZona, eventosProximos } from './consultas'
import type { Imagen, TarjetaArticulo, TarjetaEvento, ZonaPublica } from './tipos'

// Contrato v1 (spec §8.2). La forma está congelada en tests/contrato/resumen-v1.ts: un cambio incompatible es v2.
export type ResumenV1 = {
  zona: { nombre: string; url: string }
  articulos: { titulo: string; resumen: string; imagen: string | null; url: string }[]
  eventos: { nombre: string; inicio: string; fin: string | null; imagen: string | null; url: string }[]
}

const LIMITE = 3

export function armarResumen(
  datos: { zonas: ZonaPublica[]; articulos: TarjetaArticulo[]; eventos: TarjetaEvento[] },
  sedeSlug: string,
  lang: Locale,
  sitio: string,
  ahora: Date,
): ResumenV1 | null {
  const zona = datos.zonas.find((z) => z.sedeSlug === sedeSlug)
  if (!zona) return null
  const absoluta = (ruta: string) => new URL(ruta, sitio).toString()
  const imagen = (i: Imagen | null) => (i ? absoluta(i.src) : null)
  // Por fecha y nada más: el contrato pide los más cercanos, sin el orden de patrocinio del listado.
  const eventos = [...eventosProximos(datos.eventos, ahora.toISOString(), { zonaId: zona.id })]
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    .slice(0, LIMITE)
  return {
    zona: { nombre: zona.nombre, url: absoluta(rutas.zona(lang, zona.slug)) },
    // articulosPublicados ya viene de más reciente a más antiguo.
    articulos: articulosDeZona(datos.articulos, zona.id).slice(0, LIMITE).map((a) => ({
      titulo: a.titulo, resumen: a.resumen, imagen: imagen(a.portada), url: absoluta(rutas.articulo(lang, a.slug)),
    })),
    eventos: eventos.map((e) => ({
      nombre: e.nombre,
      inicio: isoEnMazatlan(e.inicio),
      fin: e.fin ? isoEnMazatlan(e.fin) : null,
      imagen: imagen(e.foto),
      url: absoluta(rutas.evento(lang, e.slug)),
    })),
  }
}
