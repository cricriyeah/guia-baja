import { createLocalReq, type Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { crearCategoria, crearImagen, crearLugar, crearUsuario, crearZona, lexical, limpiar, obtenerPayload } from './utils'

let payload: Payload
let base: { zona: number; categorias: number[]; foto: number }

async function redirecciones() {
  const res = await payload.find({ collection: 'redirects', overrideAccess: true, pagination: false, sort: 'from' })
  return res.docs.map((r) => ({ from: r.from, to: r.to?.url, type: r.type }))
}

describe('redirecciones automáticas', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
    const zona = await crearZona(payload, { slug: 'la-paz' })
    const cat = await crearCategoria(payload, { es: 'cafes', en: 'coffee' })
    const foto = await crearImagen(payload)
    base = { zona: zona.id, categorias: [cat.id], foto: foto.id }
  })

  it('editar un campo localizado de un lugar publicado sí se guarda', async () => {
    const l = await crearLugar(payload, { ...base, slugEs: 'luna', slugEn: 'moon' })
    await payload.update({ collection: 'lugares', id: l.id, locale: 'es', data: { resumen: 'Nuevo resumen', _status: 'published' }, overrideAccess: true })
    const es = await payload.findByID({ collection: 'lugares', id: l.id, locale: 'es', overrideAccess: true })
    expect(es.resumen).toBe('Nuevo resumen')
    expect(await redirecciones()).toEqual([])
  })

  it('cambiar el slug al publicar crea una 308', async () => {
    const l = await crearLugar(payload, { ...base, slugEs: 'luna', slugEn: 'moon' })
    await payload.update({ collection: 'lugares', id: l.id, locale: 'es', data: { slug: 'cafe-luna', _status: 'published' }, overrideAccess: true })
    expect(await redirecciones()).toEqual([
      { from: '/es/guia/lugares/luna', to: '/es/guia/lugares/cafe-luna', type: '308' },
    ])
  })

  it('cambio de slug en inglés guardado como borrador y publicado desde español', async () => {
    const l = await crearLugar(payload, { ...base, slugEs: 'luna', slugEn: 'moon' })
    await payload.update({ collection: 'lugares', id: l.id, locale: 'en', draft: true, data: { slug: 'moon-cafe' }, overrideAccess: true })
    expect(await redirecciones()).toEqual([])
    await payload.update({ collection: 'lugares', id: l.id, locale: 'es', data: { _status: 'published' }, overrideAccess: true })
    expect(await redirecciones()).toEqual([
      { from: '/en/guide/places/moon', to: '/en/guide/places/moon-cafe', type: '308' },
    ])
  })

  it('guardar un borrador sobre un lugar publicado no crea redirección', async () => {
    const l = await crearLugar(payload, { ...base, slugEs: 'luna' })
    await payload.update({ collection: 'lugares', id: l.id, locale: 'es', draft: true, data: { slug: 'otro', _status: 'draft' }, overrideAccess: true })
    expect(await redirecciones()).toEqual([])
  })

  it('despublicar manda a la categoría en zona si sigue teniendo lugares, y si no a la zona', async () => {
    const otro = await crearLugar(payload, { ...base, slugEs: 'sol', slugEn: 'sun' })
    const l = await crearLugar(payload, { ...base, slugEs: 'luna', slugEn: 'moon' })
    await payload.update({ collection: 'lugares', id: l.id, data: { _status: 'draft' }, overrideAccess: true })
    expect(await redirecciones()).toEqual([
      { from: '/en/guide/places/moon', to: '/en/guide/la-paz/coffee', type: '308' },
      { from: '/es/guia/lugares/luna', to: '/es/guia/la-paz/cafes', type: '308' },
    ])
    await payload.delete({ collection: 'lugares', id: otro.id, overrideAccess: true })
    expect(await redirecciones()).toContainEqual({ from: '/es/guia/lugares/sol', to: '/es/guia/la-paz', type: '308' })
  })

  it('despublicar dos lugares en una sola operación no cruza redirecciones', async () => {
    const a = await crearLugar(payload, { ...base, slugEs: 'a-es', slugEn: 'a-en' })
    const b = await crearLugar(payload, { ...base, slugEs: 'b-es', slugEn: 'b-en' })
    // req propio para ver qué deja en él la operación: los dos documentos corren en paralelo con este req.
    const req = await createLocalReq({}, payload)
    await payload.update({
      collection: 'lugares',
      where: { id: { in: [a.id, b.id] } },
      data: { _status: 'draft' },
      overrideAccess: true,
      req,
    })
    // Si registrar una redirección dejara `sinRedirecciones` en el req compartido, el otro documento
    // podría quedarse sin redirecciones según el orden del Promise.all; esto lo detecta siempre.
    expect(req.context.sinRedirecciones).toBeUndefined()
    const r = await redirecciones()
    expect(r.map((x) => x.from).sort()).toEqual(
      ['/en/guide/places/a-en', '/en/guide/places/b-en', '/es/guia/lugares/a-es', '/es/guia/lugares/b-es'].sort(),
    )
    expect(r.every((x) => !x.to?.includes('/lugares/') && !x.to?.includes('/places/'))).toBe(true)
  })

  // Determinista (no depende del orden del Promise.all de la operación masiva): registrar una
  // redirección no puede dejar `sinRedirecciones` en el `req` compartido.
  it('dos operaciones con el mismo req registran las dos', async () => {
    const a = await crearLugar(payload, { ...base, slugEs: 'a-es' })
    const b = await crearLugar(payload, { ...base, slugEs: 'b-es' })
    const req = await createLocalReq({}, payload)
    await payload.update({ collection: 'lugares', id: a.id, data: { _status: 'draft' }, overrideAccess: true, req })
    expect(req.context.sinRedirecciones).toBeUndefined()
    await payload.update({ collection: 'lugares', id: b.id, data: { _status: 'draft' }, overrideAccess: true, req })
    expect((await redirecciones()).map((x) => x.from)).toEqual(['/es/guia/lugares/a-es', '/es/guia/lugares/b-es'])
  })

  it('volver a un slug anterior quita la redirección que salía de él, sin cadenas', async () => {
    const l = await crearLugar(payload, { ...base, slugEs: 'a' })
    await payload.update({ collection: 'lugares', id: l.id, locale: 'es', data: { slug: 'b', _status: 'published' }, overrideAccess: true })
    await payload.update({ collection: 'lugares', id: l.id, locale: 'es', data: { slug: 'a', _status: 'published' }, overrideAccess: true })
    expect(await redirecciones()).toEqual([{ from: '/es/guia/lugares/b', to: '/es/guia/lugares/a', type: '308' }])
  })

  it('cambiar el slug de una zona activa redirige su página y sus combinaciones', async () => {
    await payload.update({ collection: 'zonas', id: base.zona, data: { slug: 'lapaz' }, overrideAccess: true })
    const r = await redirecciones()
    expect(r).toContainEqual({ from: '/es/guia/la-paz', to: '/es/guia/lapaz', type: '308' })
    expect(r).toContainEqual({ from: '/en/guide/la-paz', to: '/en/guide/lapaz', type: '308' })
    expect(r).toContainEqual({ from: '/en/guide/la-paz/coffee', to: '/en/guide/lapaz/coffee', type: '308' })
  })

  it('cambiar el slug de una categoría en un idioma redirige su página y sus combinaciones en ese idioma', async () => {
    await payload.update({ collection: 'categorias', id: base.categorias[0], locale: 'en', data: { slug: 'cafe' }, overrideAccess: true })
    expect(await redirecciones()).toEqual([
      { from: '/en/guide/category/coffee', to: '/en/guide/category/cafe', type: '308' },
      { from: '/en/guide/la-paz/coffee', to: '/en/guide/la-paz/cafe', type: '308' },
    ])
  })

  it('borrar un artículo publicado manda a su primera zona, solo en los idiomas donde existía', async () => {
    const editor = await crearUsuario(payload, 'editor')
    const a = await payload.create({
      collection: 'articulos',
      locale: 'es',
      data: { titulo: 'Malecón', portada: base.foto, autor: editor.id, zonas: [base.zona], resumen: 'r', cuerpo: lexical('c'), _status: 'published' },
      overrideAccess: true,
    })
    await payload.delete({ collection: 'articulos', id: a.id, overrideAccess: true })
    expect(await redirecciones()).toEqual([{ from: '/es/guia/articulos/malecon', to: '/es/guia/la-paz', type: '308' }])
  })

  it('con sinRedirecciones no se crea nada', async () => {
    const l = await crearLugar(payload, { ...base, slugEs: 'luna' })
    await payload.delete({ collection: 'lugares', id: l.id, overrideAccess: true, context: { sinRedirecciones: true } })
    expect(await redirecciones()).toEqual([])
  })
})
