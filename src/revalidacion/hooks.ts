import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

import { etiqueta, etiquetasDeCambio, type ColeccionRevalidable } from '../dominio/etiquetas'
import { revalidar } from './revalidar'

export function hooksDeRevalidacion(coleccion: ColeccionRevalidable) {
  const afterChange: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
    revalidar(etiquetasDeCambio(coleccion, doc, previousDoc), req)
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
    revalidar(etiquetasDeCambio(coleccion, doc, null), req)
    return doc
  }
  return { afterChange, afterDelete }
}

export const revalidarAjustes: GlobalAfterChangeHook = ({ doc, req }) => {
  revalidar([etiqueta.ajustes], req)
  return doc
}
