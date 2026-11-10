import { getPayload } from 'payload'

import config from '../../src/payload.config'

// Corre después del seed (plan F3d): formulario encendido, una redirección 308 real y sin Solicitudes viejas.
const payload = await getPayload({ config })
await payload.updateGlobal({ slug: 'ajustes-guia', data: { formularioActivo: true, whatsappToursActivo: true }, overrideAccess: true, context: { disableRevalidate: true } })
const { docs } = await payload.find({ collection: 'lugares', where: { nombre: { equals: 'Mesa del Desierto' } }, overrideAccess: true, locale: 'es', limit: 1 })
if (docs[0] && docs[0].slug !== 'mesa-del-desierto-nueva') {
  // Sin sinRedirecciones: el hook de F2 crea /es/guia/lugares/mesa-del-desierto → …-nueva.
  await payload.update({ collection: 'lugares', id: docs[0].id, locale: 'es', data: { slug: 'mesa-del-desierto-nueva' }, overrideAccess: true, context: { disableRevalidate: true } })
}
// Spec de presencia §2.1: un lugar con un tour relacionado del catálogo falso y una clave vieja que se ignora.
// No es Cocina Marea Alta, que mide Lighthouse: así la comparación de antes y después es la misma página.
const playa = await payload.find({ collection: 'lugares', where: { nombre: { equals: 'Playa Arena Fina' } }, overrideAccess: true, locale: 'es', limit: 1 })
if (playa.docs[0]) {
  await payload.update({
    collection: 'lugares', id: playa.docs[0].id, locale: 'es',
    data: { toursRelacionados: ['servicio:ballenas-prueba', 'servicio:ya-no-existe'] }, overrideAccess: true, context: { disableRevalidate: true },
  })
}
// Spec del paquete 1 §5: una ficha cuyo catálogo está caído.
const ventana = await payload.find({ collection: 'zonas', where: { slug: { equals: 'la-ventana' } }, overrideAccess: true, limit: 1 })
const molde = await payload.find({ collection: 'lugares', where: { nombre: { equals: 'Playa Arena Fina' } }, overrideAccess: true, locale: 'es', depth: 0, limit: 1 })
await payload.create({
  collection: 'lugares', locale: 'es', overrideAccess: true, context: { disableRevalidate: true },
  data: {
    nombre: 'Mirador de prueba', slug: 'mirador-de-prueba', resumen: 'Lugar de prueba en La Ventana.', zona: ventana.docs[0].id,
    categorias: molde.docs[0].categorias, fotos: molde.docs[0].fotos, cuerpo: molde.docs[0].cuerpo, coordenadas: [-109.9906, 24.0469],
    toursRelacionados: ['servicio:ballenas-prueba'], _status: 'published',
  } as never,
})
const restaurantes = await payload.find({ collection: 'categorias', where: { slug: { equals: 'restaurantes' } }, locale: 'es', overrideAccess: true, limit: 1 })
const zonaLaPaz = await payload.find({ collection: 'zonas', where: { slug: { equals: 'la-paz' } }, overrideAccess: true, limit: 1 })
const autor = await payload.find({ collection: 'users', overrideAccess: true, limit: 1 })
await payload.create({
  collection: 'temas', locale: 'es', overrideAccess: true, context: { disableRevalidate: true },
  data: {
    titulo: 'Restaurantes para niños (prueba)', slug: 'filtro-prueba', resumen: 'R', _status: 'published', autor: autor.docs[0].id,
    introduccion: { root: { type: 'root', version: 1, format: '', indent: 0, direction: 'ltr', children: [{ type: 'paragraph', version: 1, format: '', indent: 0, direction: 'ltr', textFormat: 0, children: [{ type: 'text', text: 'Intro.', format: 0, style: '', mode: 'normal', detail: 0, version: 1 }] }] } },
    zona: zonaLaPaz.docs[0].id, categorias: [restaurantes.docs[0].id], caracteristicas: ['para-ninos'],
  } as never,
})
// Spec del paquete 3 §3: 3 tours de La Paz con perfil. Ballenas ya tiene registro del seed; los otros se crean sin foto.
const PERFILES = [
  { slug: 'ballenas-prueba', gustos: ['mar-y-animales'], paraQuien: ['familia'], jornada: 'medio-dia' },
  { slug: 'pesca-prueba', gustos: ['aventura'], paraQuien: ['amigos'], jornada: 'dia-completo' },
  { slug: 'kayak-prueba', gustos: ['playa-y-descanso'], paraQuien: ['pareja'], jornada: 'medio-dia' },
]
for (const { slug, ...perfil } of PERFILES) {
  const claves = { sedeSlug: 'la-paz', tipo: 'servicio' as const, slug }
  const opciones = { overrideAccess: true, locale: 'es' as const, context: { disableRevalidate: true } }
  const previo = await payload.find({
    collection: 'fotos-tours', overrideAccess: true, limit: 1,
    where: { and: [{ sedeSlug: { equals: claves.sedeSlug } }, { tipo: { equals: claves.tipo } }, { slug: { equals: slug } }] },
  })
  if (previo.docs[0]) await payload.update({ collection: 'fotos-tours', id: previo.docs[0].id, data: perfil as never, ...opciones })
  else await payload.create({ collection: 'fotos-tours', data: { ...claves, ...perfil } as never, ...opciones })
}
await payload.delete({ collection: 'solicitudes', where: { id: { exists: true } }, overrideAccess: true })
process.exit(0)
