import { getPayload } from 'payload'

import config from '../../src/payload.config'

// Corre después del seed (plan F3d): formulario encendido, una redirección 308 real y sin Solicitudes viejas.
const payload = await getPayload({ config })
await payload.updateGlobal({ slug: 'ajustes-guia', data: { formularioActivo: true }, overrideAccess: true, context: { disableRevalidate: true } })
const { docs } = await payload.find({ collection: 'lugares', where: { nombre: { equals: 'Mesa del Desierto' } }, overrideAccess: true, locale: 'es', limit: 1 })
if (docs[0] && docs[0].slug !== 'mesa-del-desierto-nueva') {
  // Sin sinRedirecciones: el hook de F2 crea /es/guia/lugares/mesa-del-desierto → …-nueva.
  await payload.update({ collection: 'lugares', id: docs[0].id, locale: 'es', data: { slug: 'mesa-del-desierto-nueva' }, overrideAccess: true, context: { disableRevalidate: true } })
}
await payload.delete({ collection: 'solicitudes', where: { id: { exists: true } }, overrideAccess: true })
process.exit(0)
