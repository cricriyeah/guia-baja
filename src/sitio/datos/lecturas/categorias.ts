import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import { categoriaDe } from '../mapeo'
import type { CategoriaPublica } from '../tipos'
import { opcionesPublicas } from './publico'

export async function categorias(payload: Payload, lang: Locale): Promise<CategoriaPublica[]> {
  const { docs } = await payload.find({ collection: 'categorias', ...opcionesPublicas(lang), sort: 'orden', depth: 0, pagination: false })
  return docs.map(categoriaDe).filter((c): c is CategoriaPublica => c !== null)
}
