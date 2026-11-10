import type { Locale } from '../../dominio/idioma'
import type { PuntoMapa } from '../../dominio/mapa'
import { relacionadosVisibles } from '../../dominio/presencia'
import { atribucion, rutas } from '../../dominio/rutas'
import type { TarjetaLugar } from './tipos'

type Lugar = Pick<TarjetaLugar, 'slug' | 'nombre' | 'zonaSlug' | 'coordenadas' | 'toursRelacionados'>
type Opciones<T> = { lang: Locale; pieza: string; sitio: string; precioDe: (tour: T) => string | null }

// Puntos del mapa con sus tours ya armados en el servidor (spec del paquete 3 §2.3): `Mapa` no lee tours.
export function puntosConTours<T extends { clave: string; nombre: string; ruta: string }>(lugares: readonly Lugar[], tours: T[], { lang, pieza, sitio, precioDe }: Opciones<T>): PuntoMapa[] {
  const consulta = atribucion(pieza)
  return lugares.flatMap((l) => (!l.coordenadas ? [] : [{
    lng: l.coordenadas[0],
    lat: l.coordenadas[1],
    nombre: l.nombre,
    ruta: rutas.lugar(lang, l.slug),
    tours: relacionadosVisibles(tours, l.toursRelacionados).slice(0, 2).map((t) => ({
      nombre: t.nombre, precio: precioDe(t), href: `${sitio}${t.ruta}?${consulta}`, zona: l.zonaSlug,
    })),
  }]))
}
