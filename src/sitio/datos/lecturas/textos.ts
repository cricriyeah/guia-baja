import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import type { TextoZonaCategoria } from '../tipos'
import { opcionesPublicas } from './publico'

export async function textoZonaCategoria(payload: Payload, zonaId: number, categoriaId: number, lang: Locale): Promise<TextoZonaCategoria | null> {
  const { docs } = await payload.find({
    collection: 'textos-zona-categoria',
    ...opcionesPublicas(lang),
    where: { and: [{ zona: { equals: zonaId } }, { categoria: { equals: categoriaId } }] },
    depth: 0,
    limit: 1,
  })
  const intro = docs[0]?.introduccion
  return typeof intro === 'string' && intro.trim() ? { introduccion: intro } : null
}
