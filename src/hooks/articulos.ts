import { getLatestCollectionVersion, type CollectionBeforeChangeHook } from 'payload'

import { lugaresEnCuerpo } from '../dominio/lexical'

// publicadoEl: la primera vez que se publica. actualizadoEl: cada vez que se publica un cambio (spec §6).
// Fuera de una publicación ninguna de las dos se mueve: un borrador o restaurar una versión de antes de la
// primera publicación (que trae las fechas vacías) conservan las que ya tenía el artículo.
export const fechasDePublicacion: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!data) return data
  const publicadoEl = data.publicadoEl ?? originalDoc?.publicadoEl ?? null
  if (data._status !== 'published') {
    return { ...data, publicadoEl, actualizadoEl: originalDoc?.actualizadoEl ?? null }
  }
  const ahora = new Date().toISOString()
  return { ...data, publicadoEl: publicadoEl ?? ahora, actualizadoEl: ahora }
}

type Relacion = number | { id: number }
const idDe = (valor: Relacion) => (typeof valor === 'number' ? valor : valor.id)

// lugaresCitados: los lugares de las «Tarjetas de lugar» del cuerpo en todos los idiomas (spec §6).
// Siempre se leen con el adaptador de base, no con la Local API, para no tocar req.locale (regla de hooks).
// - Guardado normal: el cuerpo del idioma que se guarda viene en data; el de los demás idiomas se toma de la
//   última versión, que es de donde Payload copia esos idiomas al escribir (incluye borradores sin publicar).
//   El adaptador devuelve los campos localizados como { es: ..., en: ... }.
// - Restaurar una versión: data trae esa versión solo en el idioma por defecto, así que se conservan los
//   lugares citados que la propia versión guardó.
export const llenarLugaresCitados: CollectionBeforeChangeHook = async ({ collection, data, originalDoc, req }) => {
  if (!data) return data
  const ids = new Set<number>()
  const cuerpoActual = 'cuerpo' in data ? data.cuerpo : originalDoc?.cuerpo
  lugaresEnCuerpo(cuerpoActual).forEach((id) => ids.add(id))
  if (req.context.isRestoringVersion) {
    for (const lugar of (data.lugaresCitados ?? []) as Relacion[]) ids.add(idDe(lugar))
  } else {
    const localizacion = req.payload.config.localization
    const otros = localizacion ? localizacion.localeCodes.filter((codigo) => codigo !== req.locale) : []
    if (originalDoc?.id && otros.length > 0) {
      const ultima = await getLatestCollectionVersion<{ id: number; cuerpo?: Record<string, unknown> | null }>({
        id: originalDoc.id,
        config: collection,
        payload: req.payload,
        query: { collection: 'articulos', locale: 'all', where: { id: { equals: originalDoc.id } }, req },
        req,
      })
      for (const locale of otros) lugaresEnCuerpo(ultima?.cuerpo?.[locale]).forEach((id) => ids.add(id))
    }
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
