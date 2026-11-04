import { unstable_cache } from 'next/cache'
import type { Payload } from 'payload'

import { ajustesPublicos } from './lecturas/ajustes'
import { categorias } from './lecturas/categorias'
import { mapaRedirecciones } from './lecturas/redirecciones'
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
