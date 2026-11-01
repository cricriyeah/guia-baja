import type { PayloadRequest } from 'payload'

// Único punto que escribe en `redirects`. Usa la Local API con `req` (misma transacción) y SIN `locale`:
// la colección no es localizada y así no se toca req.locale (regla de hooks del plan).
// Tampoco pasa `context`: la Local API lo mezcla de vuelta en el `req` compartido, y un
// `sinRedirecciones: true` ahí apagaría los hooks de los demás documentos de una operación masiva.
// `redirects` no tiene hooks de redirección, así que no hace falta.
export async function registrarRedireccion(
  req: PayloadRequest,
  { desde, hacia }: { desde: string; hacia: string },
): Promise<void> {
  if (desde === hacia) return
  const { payload } = req
  const comun = { overrideAccess: true, req, depth: 0 } as const

  // La ruta destino vuelve a estar viva: no puede salir una redirección de ella.
  await payload.delete({ collection: 'redirects', where: { from: { equals: hacia } }, ...comun })
  // Sin cadenas: lo que apuntaba a `desde` ahora apunta a `hacia`.
  await payload.update({
    collection: 'redirects',
    where: { 'to.url': { equals: desde } },
    data: { to: { type: 'custom', url: hacia } },
    ...comun,
  })
  const existente = await payload.find({ collection: 'redirects', where: { from: { equals: desde } }, limit: 1, ...comun })
  const data = { from: desde, to: { type: 'custom' as const, url: hacia }, type: '308' as const }
  if (existente.docs[0]) {
    await payload.update({ collection: 'redirects', id: existente.docs[0].id, data, ...comun })
  } else {
    await payload.create({ collection: 'redirects', data, ...comun })
  }
}
