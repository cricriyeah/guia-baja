import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import { zonaDe } from '../mapeo'
import type { ZonaPublica } from '../tipos'
import { opcionesPublicas } from './publico'

export async function zonasActivas(payload: Payload, lang: Locale): Promise<ZonaPublica[]> {
  const { docs } = await payload.find({
    collection: 'zonas',
    ...opcionesPublicas(lang),
    where: { activa: { equals: true } },
    sort: 'orden',
    depth: 1,
    pagination: false,
  })
  return docs.map((z) => zonaDe(z, lang)).filter((z): z is ZonaPublica => z !== null)
}
