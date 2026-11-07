import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { validarServicios } from '../../src/dominio/catalogo'
import { toursDeZonaParaAdmin } from '../../src/sitio/datos/tours-de-zona'
import { crearCategoria, crearImagen, crearUsuario, crearZona, limpiar, obtenerPayload } from './utils'

let payload: Payload

const catalogo = validarServicios([
  {
    empresa_slug: 'sal-y-sol', nombre: 'Tour Espíritu Santo', nombre_en: 'Espiritu Santo tour', slug: 'espiritu-santo',
    estrategia_precio: 'por_grupo', precio_base: '11290.00', tipo_cambio_usd: '17.5000', activo: true, duracion: '6 h', duracion_en: '6 hrs',
  },
])
const leer = async () => catalogo
const caido = async (): Promise<never> => {
  throw new Error('Catálogo: respondió 502')
}

describe('opciones de «Tours relacionados» en el admin (spec de presencia §2.1)', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('sin sesión del personal: 401, y no lee el catálogo', async () => {
    const zona = await crearZona(payload, { activa: true, sedeSlug: 'la-paz' })
    let leido = false
    const r = await toursDeZonaParaAdmin(payload, null, String(zona.id), async () => ((leido = true), catalogo))
    expect(r).toEqual({ estado: 401 })
    expect(leido).toBe(false)
    expect(await toursDeZonaParaAdmin(payload, { rol: 'visitante' }, String(zona.id), leer)).toEqual({ estado: 401 })
  })

  it('con sesión del personal: clave, nombre en español y precio «desde»', async () => {
    const editor = await crearUsuario(payload, 'editor')
    const zona = await crearZona(payload, { activa: true, sedeSlug: 'la-paz' })
    expect(await toursDeZonaParaAdmin(payload, editor, String(zona.id), leer)).toEqual({
      estado: 200, sinSede: false,
      tours: [{ clave: 'servicio:espiritu-santo', nombre: 'Tour Espíritu Santo', precio: 'desde $11,290 MXN por grupo' }],
    })
  })

  it('incluye zonas inactivas (se llenan antes de activarse)', async () => {
    const editor = await crearUsuario(payload, 'editor')
    const zona = await crearZona(payload, { activa: false, sedeSlug: 'la-ventana' })
    const r = await toursDeZonaParaAdmin(payload, editor, String(zona.id), leer)
    expect(r.estado).toBe(200)
  })

  it('zona sin sede: lista vacía marcada; zona inexistente: 404; id inválido: 400', async () => {
    const editor = await crearUsuario(payload, 'editor')
    const zona = await crearZona(payload, { activa: true })
    expect(await toursDeZonaParaAdmin(payload, editor, String(zona.id), leer)).toEqual({ estado: 200, sinSede: true, tours: [] })
    expect(await toursDeZonaParaAdmin(payload, editor, '999999', leer)).toEqual({ estado: 404 })
    expect(await toursDeZonaParaAdmin(payload, editor, 'abc', leer)).toEqual({ estado: 400 })
    expect(await toursDeZonaParaAdmin(payload, editor, null, leer)).toEqual({ estado: 400 })
  })

  it('catálogo caído: 503 (distinto de una sede sin tours)', async () => {
    const editor = await crearUsuario(payload, 'editor')
    const zona = await crearZona(payload, { activa: true, sedeSlug: 'la-paz' })
    expect(await toursDeZonaParaAdmin(payload, editor, String(zona.id), caido)).toEqual({ estado: 503 })
    expect(await toursDeZonaParaAdmin(payload, editor, String(zona.id), async () => [])).toEqual({ estado: 200, sinSede: false, tours: [] })
  })

  it('el campo del lugar guarda hasta 3 claves con formato de catálogo', async () => {
    const zona = await crearZona(payload, { activa: true, sedeSlug: 'la-paz' })
    const cat = await crearCategoria(payload, { es: 'playas-tr', en: 'beaches-tr', grupo: 'mar' })
    const foto = await crearImagen(payload)
    const datos = { nombre: 'Balandra', zona: zona.id, categorias: [cat.id], fotos: [foto.id], _status: 'published' as const }
    const ok = await payload.create({ collection: 'lugares', locale: 'es', overrideAccess: true, data: { ...datos, toursRelacionados: ['servicio:espiritu-santo'] } })
    expect(ok.toursRelacionados).toEqual(['servicio:espiritu-santo'])
    await expect(
      payload.create({ collection: 'lugares', locale: 'es', overrideAccess: true, data: { ...datos, nombre: 'Otro', toursRelacionados: ['tour:mal'] } }),
    ).rejects.toThrow()
  })
})
