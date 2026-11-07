import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { articulosPublicados } from '../../src/sitio/datos/lecturas/articulos'
import { eventosPublicados } from '../../src/sitio/datos/lecturas/eventos'
import { zonasActivas } from '../../src/sitio/datos/lecturas/zonas'
import { armarResumen } from '../../src/sitio/datos/resumen'
import { erroresResumenV1 } from '../contrato/resumen-v1'
import { crearCategoria, crearImagen, crearUsuario, crearZona, lexical, limpiar, obtenerPayload } from './utils'

let payload: Payload
const SITIO = 'https://www.salysoltours.com'

const resumen = async (sede: string, lang: 'es' | 'en') => {
  const [zonas, articulos, eventos] = await Promise.all([zonasActivas(payload, lang), articulosPublicados(payload, lang), eventosPublicados(payload, lang)])
  return armarResumen({ zonas, articulos, eventos }, sede, lang, SITIO, new Date())
}

describe('contrato /api/publico/v1 con la base real (spec §8.2, §11)', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('forma exacta; solo publicados y que existan en el idioma pedido', async () => {
    const zona = await crearZona(payload, { slug: 'la-paz', nombre: 'La Paz', activa: true, sedeSlug: 'la-paz' })
    const categoria = await crearCategoria(payload, { es: 'playas-v1', en: 'beaches-v1', grupo: 'mar' })
    const portada = await crearImagen(payload)
    const autor = await crearUsuario(payload, 'editor')
    const articulo = { resumen: 'r', cuerpo: lexical('c'), portada: portada.id, autor: autor.id, zonas: [zona.id] }
    await payload.create({ collection: 'articulos', locale: 'es', overrideAccess: true, data: { titulo: 'Publicado', ...articulo, _status: 'published' } })
    await payload.create({ collection: 'articulos', locale: 'es', overrideAccess: true, data: { titulo: 'Borrador', ...articulo, _status: 'draft' } })
    await payload.create({
      collection: 'eventos', locale: 'es', overrideAccess: true,
      data: {
        nombre: 'Feria', zona: zona.id, categorias: [categoria.id], direccionLibre: 'Malecón', fotos: [portada.id],
        inicio: '2030-11-14T18:00:00-07:00', inicio_tz: 'America/Mazatlan', resumen: 'r', cuerpo: lexical('c'), _status: 'published',
      },
    })

    const es = await resumen('la-paz', 'es')
    expect(erroresResumenV1(es)).toEqual([])
    expect(es?.zona).toEqual({ nombre: 'La Paz', url: `${SITIO}/es/guia/la-paz` })
    expect(es?.articulos.map((a) => a.titulo)).toEqual(['Publicado'])
    expect(es?.eventos.map((e) => e.nombre)).toEqual(['Feria'])
    expect(es?.eventos[0].inicio).toBe('2030-11-14T18:00:00-07:00')

    // Solo en español: en inglés la zona no existe, así que el contrato da 404.
    expect(await resumen('la-paz', 'en')).toBeNull()
  })

  it('null (404) con una zona inactiva', async () => {
    await crearZona(payload, { slug: 'puerto-chale', nombre: 'Puerto Chale', activa: false, sedeSlug: 'puerto-chale' })
    expect(await resumen('puerto-chale', 'es')).toBeNull()
  })
})
