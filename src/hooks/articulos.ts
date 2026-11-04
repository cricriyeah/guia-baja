import type { CollectionBeforeChangeHook } from 'payload'

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
