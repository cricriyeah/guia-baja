import { unstable_cache } from 'next/cache'
import type { Payload } from 'payload'

import { ajustesPublicos } from './lecturas/ajustes'
import { articulosPublicados, fichaArticulo } from './lecturas/articulos'
import { categorias } from './lecturas/categorias'
import { eventosPublicados, fichaEvento } from './lecturas/eventos'
import { fichaLugar, lugaresPublicados } from './lecturas/lugares'
import { mapaRedirecciones } from './lecturas/redirecciones'
import { textoZonaCategoria } from './lecturas/textos'
import { zonasActivas } from './lecturas/zonas'
import { coincidencias } from '../../busqueda/consulta'
import type { TipoBusqueda } from '../../dominio/busqueda'
import type { Locale } from '../../dominio/idioma'
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
export const coincidenciasCacheadas = cachear(
  (payload, q: string, lang: Locale, tipo: TipoBusqueda | null, zonaId: number | null) => coincidencias(payload, { q, lang, tipo, zonaId }),
  LLAVES.coincidencias,
)
export const textoCacheado = cachear(textoZonaCategoria, LLAVES.texto)
