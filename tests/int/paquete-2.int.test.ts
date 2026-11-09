import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { coincidencias } from '../../src/busqueda/consulta'
import { lugaresDeTema } from '../../src/dominio/temas'
import { lugaresPublicados } from '../../src/sitio/datos/lecturas/lugares'
import { zonasActivas } from '../../src/sitio/datos/lecturas/zonas'
import { crearCategoria, crearImagen, crearLugar, crearUsuario, crearZona, lexical, limpiar, obtenerPayload } from './utils'

// Registra las etiquetas que revalidan los hooks (fuera de Next, revalidateTag lanza).
const revalidadas = vi.hoisted(() => [] as string[])
vi.mock('next/cache', async (original) => ({
  ...(await original<typeof import('next/cache')>()),
  revalidateTag: (etiqueta: string) => { revalidadas.push(etiqueta) },
}))

let payload: Payload

async function base() {
  const zona = await crearZona(payload, { activa: true, sedeSlug: 'la-paz' })
  const categoria = await crearCategoria(payload)
  const foto = await crearImagen(payload)
  const autor = await crearUsuario(payload, 'editor')
  const lugar = await crearLugar(payload, { zona: zona.id, categorias: [categoria.id], foto: foto.id, slugEs: 'playa' })
  return { zona, categoria, foto, autor, lugar }
}

const datosItinerario = (b: Awaited<ReturnType<typeof base>>, dias: unknown[]) => ({
  titulo: 'Plan', resumen: 'R', cuerpo: lexical('Intro'), zona: b.zona.id, autor: b.autor.id, dias, _status: 'published' as const,
})

describe('itinerarios', () => {
  beforeAll(async () => { payload = await obtenerPayload() })
  beforeEach(async () => { await limpiar(payload) })

  it('parada vacía: rechazada al guardar en es', async () => {
    const b = await base()
    await expect(payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: datosItinerario(b, [{ titulo: 'D', paradas: [{ hora: '08:00' }] }]) as never })).rejects.toThrow()
  })

  it('parada con nota solo en español: el guardado en en pasa', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: datosItinerario(b, [{ titulo: 'D', paradas: [{ nota: 'Solo en español' }] }]) as never })
    await expect(payload.update({ collection: 'itinerarios', id: doc.id, locale: 'en', overrideAccess: true, data: { titulo: 'Plan', resumen: 'S', cuerpo: lexical('Intro'), _status: 'published' } as never })).resolves.toBeTruthy()
  })

  it('hora inválida: rechazada', async () => {
    const b = await base()
    await expect(payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: datosItinerario(b, [{ paradas: [{ hora: '25:99', nota: 'x' }] }]) as never })).rejects.toThrow()
  })

  it('lugaresCitados sale de las paradas y copia el autor', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, depth: 0, data: datosItinerario(b, [{ paradas: [{ lugar: b.lugar.id }] }]) as never })
    expect(doc.lugaresCitados).toEqual([b.lugar.id])
    expect(doc.autorNombre).toBeTruthy()
  })

  it('campos localizados dentro de listas: sobreviven a editar y reordenar', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, depth: 0, data: datosItinerario(b, [{ titulo: 'Uno', paradas: [{ nota: 'nota uno' }] }, { titulo: 'Dos', paradas: [{ nota: 'nota dos' }] }]) as never })
    const leerEs = () => payload.findByID({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, depth: 0 })
    const es = await leerEs()
    await payload.update({
      collection: 'itinerarios', id: doc.id, locale: 'en', overrideAccess: true, depth: 0,
      data: { titulo: 'Plan', resumen: 'S', cuerpo: lexical('Intro'), _status: 'published', dias: es.dias!.map((d, i) => ({ id: d.id, titulo: `Day ${i + 1}`, paradas: d.paradas!.map((p) => ({ id: p.id, nota: `note ${i + 1}` })) })) } as never,
    })
    const invertidos = [...es.dias!].reverse()
    await payload.update({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, depth: 0, data: { dias: [...invertidos, { titulo: 'Tres', paradas: [{ nota: 'nota tres' }] }], _status: 'published' } as never })
    const final = await leerEs()
    expect(final.dias!.map((d) => d.titulo)).toEqual(['Dos', 'Uno', 'Tres'])
    const en = await payload.findByID({ collection: 'itinerarios', id: doc.id, locale: 'en', overrideAccess: true, depth: 0, fallbackLocale: false })
    expect(en.dias!.slice(0, 2).map((d) => d.titulo)).toEqual(['Day 2', 'Day 1'])
    expect(en.dias![0].paradas![0].nota).toBe('note 2')
  })

  it('restaurar una versión conserva los dos idiomas', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, depth: 0, data: datosItinerario(b, [{ titulo: 'Uno', paradas: [{ nota: 'n' }] }]) as never })
    const es = await payload.findByID({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, depth: 0 })
    await payload.update({ collection: 'itinerarios', id: doc.id, locale: 'en', overrideAccess: true, depth: 0, data: { titulo: 'Plan', resumen: 'S', cuerpo: lexical('I'), _status: 'published', dias: es.dias!.map((d) => ({ id: d.id, titulo: 'Day', paradas: d.paradas })) } as never })
    const { docs: versiones } = await payload.findVersions({ collection: 'itinerarios', where: { parent: { equals: doc.id } }, overrideAccess: true, sort: '-updatedAt', limit: 1 })
    await payload.update({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, data: { titulo: 'Cambiado', _status: 'published' } as never })
    await payload.restoreVersion({ collection: 'itinerarios', id: versiones[0].id, overrideAccess: true })
    const en = await payload.findByID({ collection: 'itinerarios', id: doc.id, locale: 'en', overrideAccess: true, depth: 0, fallbackLocale: false })
    expect(en.dias![0].titulo).toBe('Day')
    const esRestaurado = await payload.findByID({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, depth: 0, fallbackLocale: false })
    expect(esRestaurado.titulo).toBe('Plan')
    expect(esRestaurado.dias![0].titulo).toBe('Uno')
  })

  it('límites: hasta 7 días y 8 paradas por día', async () => {
    const b = await base()
    const parada = { nota: 'x' }
    await expect(payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: datosItinerario(b, Array.from({ length: 8 }, () => ({ paradas: [parada] }))) as never })).rejects.toThrow()
    await expect(payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: datosItinerario(b, [{ paradas: Array.from({ length: 9 }, () => parada) }]) as never })).rejects.toThrow()
    await expect(payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: datosItinerario(b, Array.from({ length: 7 }, () => ({ paradas: Array.from({ length: 8 }, () => parada) }))) as never })).resolves.toBeTruthy()
  })

  it('lugaresCitados conserva lo citado en el otro idioma', async () => {
    const b = await base()
    const cuerpo = lexical('Intro')
    cuerpo.root.children.push({ type: 'block', version: 2, format: '', fields: { id: 'b1', blockName: '', blockType: 'tarjetaLugar', lugar: b.lugar.id } } as never)
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, depth: 0, data: { ...datosItinerario(b, [{ paradas: [{ nota: 'x' }] }]), cuerpo } as never })
    const en = await payload.update({ collection: 'itinerarios', id: doc.id, locale: 'en', overrideAccess: true, depth: 0, data: { titulo: 'Plan', resumen: 'S', cuerpo: lexical('Intro'), _status: 'published' } as never })
    expect(en.lugaresCitados).toEqual([b.lugar.id])
  })

  it('quitar un lugar de una parada revalida su ficha', async () => {
    const b = await base()
    const otro = await crearLugar(payload, { zona: b.zona.id, categorias: [b.categoria.id], foto: b.foto.id, slugEs: 'otra' })
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, depth: 0, data: datosItinerario(b, [{ paradas: [{ lugar: b.lugar.id }] }]) as never })
    revalidadas.length = 0
    await payload.update({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, depth: 0, data: { dias: [{ paradas: [{ lugar: otro.id }] }], _status: 'published' } as never })
    expect(revalidadas).toContain(`lugar:${b.lugar.id}`)
    expect(revalidadas).toContain(`lugar:${otro.id}`)
  })

  it('el público no lee borradores', async () => {
    const b = await base()
    await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, draft: true, data: { ...datosItinerario(b, [{ paradas: [{ nota: 'x' }] }]), _status: 'draft' } as never })
    const { docs } = await payload.find({ collection: 'itinerarios', overrideAccess: false })
    expect(docs).toHaveLength(0)
  })

  it('el itinerario entra al índice', async () => {
    const b = await base()
    await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: { ...datosItinerario(b, [{ paradas: [{ nota: 'x' }] }]), titulo: 'Plan Sugerible' } as never })
    const { docs } = await payload.find({ collection: 'indice-busqueda', where: { tipo: { equals: 'itinerario' } }, overrideAccess: true })
    expect(docs[0].titulo).toBe('Plan Sugerible')
  })

  it('la consulta de búsqueda y sugerencias encuentra el itinerario', async () => {
    const b = await base()
    await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: { ...datosItinerario(b, [{ paradas: [{ nota: 'x' }] }]), titulo: 'Plan Sugerible' } as never })
    const filas = await coincidencias(payload, { q: 'Sugerible', lang: 'es', tipo: null as never, zonaId: null })
    expect(filas.map((f) => f.tipo)).toContain('itinerario')
  })

  it('cambiar el slug crea la redirección', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'itinerarios', locale: 'es', overrideAccess: true, data: { ...datosItinerario(b, [{ paradas: [{ nota: 'x' }] }]), slug: 'viejo' } as never })
    await payload.update({ collection: 'itinerarios', id: doc.id, locale: 'es', overrideAccess: true, data: { slug: 'nuevo' } as never })
    const { docs } = await payload.find({ collection: 'redirects', where: { from: { equals: '/es/guia/itinerarios/viejo' } }, overrideAccess: true })
    expect(docs).toHaveLength(1)
  })
})

describe('temas', () => {
  beforeAll(async () => { payload = await obtenerPayload() })
  beforeEach(async () => { await limpiar(payload) })

  const datosTema = (b: Awaited<ReturnType<typeof base>>, extra: Record<string, unknown> = {}) => ({
    titulo: 'Tema', resumen: 'R', introduccion: lexical('Intro'), autor: b.autor.id, zona: b.zona.id, _status: 'published' as const, ...extra,
  })

  it('tour en zona sin sede: rechazado', async () => {
    const b = await base()
    const sinSede = await crearZona(payload, { activa: true })
    await expect(payload.create({ collection: 'temas', locale: 'es', overrideAccess: true, data: datosTema(b, { tours: [{ zona: sinSede.id, tour: 'servicio:a' }] }) as never })).rejects.toThrow()
    await expect(payload.create({ collection: 'temas', locale: 'es', overrideAccess: true, data: datosTema(b, { tours: [{ zona: b.zona.id, tour: 'servicio:a' }] }) as never })).resolves.toBeTruthy()
  })

  it('lugaresQueCoinciden: no llega al público y sí al personal', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'temas', locale: 'es', overrideAccess: true, data: datosTema(b, { lugaresFijos: [b.lugar.id] }) as never })
    const publico = await payload.findByID({ collection: 'temas', id: doc.id, overrideAccess: false })
    expect(publico.lugaresQueCoinciden).toBeUndefined()
    const usuario = await crearUsuario(payload, 'admin')
    const personal = await payload.findByID({ collection: 'temas', id: doc.id, overrideAccess: false, user: usuario, locale: 'es' })
    expect(personal.lugaresQueCoinciden).toContain('es: 1')
  })

  it('lugaresQueCoinciden: sin personal no lee ningún lugar', async () => {
    const b = await base()
    const doc = await payload.create({ collection: 'temas', locale: 'es', overrideAccess: true, data: datosTema(b, { lugaresFijos: [b.lugar.id] }) as never })
    const espia = vi.spyOn(payload, 'find')
    // depth 0: poblar relaciones también usa payload.find.
    await payload.findByID({ collection: 'temas', id: doc.id, overrideAccess: false, depth: 0 })
    expect(espia.mock.calls.filter(([a]) => a.collection === 'lugares')).toHaveLength(0)
    espia.mockRestore()
  })

  it('lugaresQueCoinciden cuenta lo mismo que la lista pública que usa el sitemap', async () => {
    const b = await base()
    const otros = await Promise.all(['dos', 'tres'].map((slugEs) => crearLugar(payload, { zona: b.zona.id, categorias: [b.categoria.id], foto: b.foto.id, slugEs })))
    const fijos = [b.lugar.id, ...otros.map((l) => l.id)]
    const doc = await payload.create({ collection: 'temas', locale: 'es', overrideAccess: true, data: datosTema(b, { lugaresFijos: fijos }) as never })
    const usuario = await crearUsuario(payload, 'admin')
    const personal = await payload.findByID({ collection: 'temas', id: doc.id, overrideAccess: false, user: usuario, locale: 'es' })
    expect(personal.lugaresQueCoinciden).toContain('es: 3, se indexa')
    const [lugares, zonas] = await Promise.all([lugaresPublicados(payload, 'es'), zonasActivas(payload, 'es')])
    const criterios = { zonaId: b.zona.id, categoriaIds: [], caracteristicas: [], servicios: [], lugaresFijosIds: fijos }
    expect(lugaresDeTema(criterios, { lugares, zonasActivasIds: zonas.map((z) => z.id) }, new Date())).toHaveLength(3)
  })

  it('límite: hasta 6 tours', async () => {
    const b = await base()
    const tours = Array.from({ length: 7 }, (_, i) => ({ zona: b.zona.id, tour: `servicio:a${i}` }))
    await expect(payload.create({ collection: 'temas', locale: 'es', overrideAccess: true, data: datosTema(b, { tours }) as never })).rejects.toThrow()
  })
})
