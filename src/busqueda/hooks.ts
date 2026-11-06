import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { TipoBusqueda } from '../dominio/busqueda'
import { indexar } from './indexar'

// El seed no pone sinIndice: sus guardados indexan solos (previews y E2E tienen búsqueda).
export function hooksDeIndice(tipo: TipoBusqueda) {
  const afterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
    if (!req.context?.sinIndice) await indexar(req, tipo, doc.id as number)
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
    if (!req.context?.sinIndice) await indexar(req, tipo, doc.id as number)
    return doc
  }
  return { afterChange, afterDelete }
}
