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
import { LLAVES, type Llave } from './llaves'
import { obtenerPayload } from './payload'

const REVALIDAR = 3600

// Envoltorio mecánico: la llave y las etiquetas salen de llaves.ts (probado); aquí no hay reglas.
export function cachear<A extends unknown[], R>(
  lectura: (payload: Payload, ...args: A) => Promise<R>,
  llave: (...args: A) => Llave,
): (...args: A) => Promise<R> {
  return (...args: A) => {
    const { llave: partes, etiquetas } = llave(...args)
    return unstable_cache(async () => lectura(await obtenerPayload(), ...args), partes, { tags: etiquetas, revalidate: REVALIDAR })()
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
