import type { CollectionBeforeChangeHook } from 'payload'

import { lugaresEnCuerpo } from '../dominio/lexical'

// publicadoEl: la primera vez que se publica. actualizadoEl: cada vez que se publica un cambio (spec §6).
// Un guardado como borrador no toca ninguna de las dos.
export const fechasDePublicacion: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (data?._status !== 'published') return data
  const ahora = new Date().toISOString()
  return {
    ...data,
    publicadoEl: data.publicadoEl ?? originalDoc?.publicadoEl ?? ahora,
    actualizadoEl: ahora,
  }
}

// lugaresCitados: los lugares de las «Tarjetas de lugar» del cuerpo en todos los idiomas (spec §6).
// El cuerpo del idioma que se guarda viene en data; los demás se leen con el adaptador de base, no con la
// Local API, para no tocar req.locale (regla de hooks). El adaptador devuelve los campos localizados
// como { es: ..., en: ... }.
export const llenarLugaresCitados: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data) return data
  const actual = req.locale
  const ids = new Set<number>()
  const cuerpoActual = 'cuerpo' in data ? data.cuerpo : originalDoc?.cuerpo
  lugaresEnCuerpo(cuerpoActual).forEach((id) => ids.add(id))
  const localizacion = req.payload.config.localization
  const otros = localizacion ? localizacion.localeCodes.filter((codigo) => codigo !== actual) : []
  if (originalDoc?.id && otros.length > 0) {
    const doc = await req.payload.db.findOne<{ id: number; cuerpo?: Record<string, unknown> | null }>({
      collection: 'articulos',
      where: { id: { equals: originalDoc.id } },
      locale: 'all',
      req,
    })
    for (const locale of otros) lugaresEnCuerpo(doc?.cuerpo?.[locale]).forEach((id) => ids.add(id))
  }
  // Un bloque Lexical no limpia su referencia si el lugar se borra; solo se guardan los que siguen existiendo
  // (si no, la FK de articulos_rels impediría guardar el artículo). Conserva el orden de aparición.
  if (ids.size === 0) return { ...data, lugaresCitados: [] }
  const existentes = await req.payload.db.find({
    collection: 'lugares',
    where: { id: { in: [...ids] } },
    pagination: false,
    req,
  })
  const vivos = new Set(existentes.docs.map((lugar) => lugar.id as number))
  return { ...data, lugaresCitados: [...ids].filter((id) => vivos.has(id)) }
}
