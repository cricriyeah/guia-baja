import { unstable_cache } from 'next/cache'
import type { Payload } from 'payload'

import { toursDe, type Tour } from '../../dominio/catalogo'
import type { Locale } from '../../dominio/idioma'
import { ajustesPublicos } from './lecturas/ajustes'
import { articulosPublicados, fichaArticulo } from './lecturas/articulos'
import { catalogoDeSede, fotosDeTours, type FotoTour } from './lecturas/catalogo'
import { categorias } from './lecturas/categorias'
import { eventosPublicados, fichaEvento } from './lecturas/eventos'
import { fichaLugar, lugaresPublicados } from './lecturas/lugares'
import { mapaRedirecciones } from './lecturas/redirecciones'
import { textoZonaCategoria } from './lecturas/textos'
import { zonasActivas } from './lecturas/zonas'
import { versionCache } from '../entorno'
import { LLAVES, type Llave } from './llaves'
import { obtenerPayload } from './payload'

const REVALIDAR = 3600

// Envoltorio mecánico: la llave y las etiquetas salen de llaves.ts (probado); aquí no hay reglas.
// En Next 16 la llave de unstable_cache es el texto del callback más estas partes, y el callback es idéntico en cada
// lectura y en cada build. Por eso se antepone la versión del despliegue: sin ella, la caché de Vercel (que sobrevive
// a los deploys) serviría JSON viejo a código nuevo, o datos del seed anterior en preview. Las etiquetas no cambian.
export function cachear<A extends unknown[], R>(
  lectura: (payload: Payload, ...args: A) => Promise<R>,
  llave: (...args: A) => Llave,
): (...args: A) => Promise<R> {
  return (...args: A) => {
    const { llave: partes, etiquetas } = llave(...args)
    return unstable_cache(async () => lectura(await obtenerPayload(), ...args), [versionCache(), ...partes], { tags: etiquetas, revalidate: REVALIDAR })()
  }
}

export const zonasActivasCacheadas = cachear(zonasActivas, LLAVES.zonasActivas)
export const categoriasCacheadas = cachear(categorias, LLAVES.categorias)
export const ajustesCacheados = cachear(ajustesPublicos, LLAVES.ajustes)
export const mapaRedireccionesCacheado = cachear(mapaRedirecciones, LLAVES.redirecciones)
export const lugaresCacheados = cachear(lugaresPublicados, LLAVES.lugares)
export const eventosCacheados = cachear(eventosPublicados, LLAVES.eventos)
export const articulosCacheados = cachear(articulosPublicados, LLAVES.articulos)
export const fichaLugarCacheada = cachear(fichaLugar, LLAVES.fichaLugar)
export const fichaEventoCacheada = cachear(fichaEvento, LLAVES.fichaEvento)
export const fichaArticuloCacheada = cachear(fichaArticulo, LLAVES.fichaArticulo)
export const textoCacheado = cachear(textoZonaCategoria, LLAVES.texto)
// Lanza ante un fallo (no lo atrapa): el admin necesita distinguir «catálogo caído» de «sede sin tours».
export const catalogoCacheado = cachear(catalogoDeSede, LLAVES.catalogo)
const fotosToursCacheadas = cachear(fotosDeTours, LLAVES.fotosTours)

export type TourConFoto = Tour & Pick<FotoTour, 'foto' | 'temporada'>

// Spec §8.1: si el catálogo falla, tarda o no pasa el esquema, no hay bloque y la página carga normal. El fallo se
// lanza dentro de la caché (no se guarda) y se atrapa aquí, fuera de ella. El log no lleva datos de personas.
export async function toursDeSede(sedeSlug: string, lang: Locale): Promise<TourConFoto[]> {
  try {
    const [items, fotos] = await Promise.all([catalogoCacheado(sedeSlug), fotosToursCacheadas(sedeSlug, lang)])
    const porClave = new Map(fotos.map((f) => [f.clave, f]))
    return toursDe(items, lang).map((t) => ({ ...t, foto: porClave.get(t.clave)?.foto ?? null, temporada: porClave.get(t.clave)?.temporada ?? null }))
  } catch (e) {
    console.error(`Tours de ${sedeSlug}: no se muestran.`, e instanceof Error ? e.message : 'error desconocido')
    return []
  }
}
