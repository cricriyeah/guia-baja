import { revalidateTag } from 'next/cache'
import type { PayloadRequest } from 'payload'

// Fuera de Next (payload run, seed, pruebas) revalidateTag lanza este invariante: no hay nada que revalidar.
const FUERA_DE_NEXT = /static generation store missing/i

// Spec §10: nunca rompe el guardado; respeta disableRevalidate (seed, scripts, migraciones).
export function revalidar(etiquetas: string[], req: PayloadRequest): void {
  if (req.context?.disableRevalidate) return
  for (const etiqueta of etiquetas) {
    try {
      revalidateTag(etiqueta, { expire: 0 })
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e)
      if (FUERA_DE_NEXT.test(mensaje)) continue
      req.payload.logger.error({ msg: 'No se pudo revalidar la caché', etiqueta, err: mensaje })
    }
  }
}
