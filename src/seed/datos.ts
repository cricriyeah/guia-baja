import { randomUUID } from 'node:crypto'

import type { Payload } from 'payload'

import type { Lugare } from '../payload-types'

import { imagenDePrueba } from './imagenes'
import { vaciarColecciones } from './vaciar'

const ctx = { sinRedirecciones: true, disableRevalidate: true }

// Fechas de día completo (patrocinio): solo AAAA-MM-DD, nunca con huso (el campo guarda 00:00Z).
const soloDia = (ms: number) => new Date(ms).toISOString().slice(0, 10)

const parrafo = (texto: string) => ({
  root: {
    type: 'root', format: '' as const, indent: 0, version: 1, direction: 'ltr' as const,
    children: [{
      type: 'paragraph', format: '' as const, indent: 0, version: 1, direction: 'ltr' as const, textFormat: 0,
      children: [{ type: 'text', text: texto, format: 0, style: '', mode: 'normal' as const, detail: 0, version: 1 }],
    }],
  },
})

const CATEGORIAS = [
  { es: 'Restaurantes', en: 'Restaurants', tipo: 'Restaurant', aplica: 'lugar', grupo: 'comer-y-salir' },
  { es: 'Cafés y bares', en: 'Cafes and bars', tipo: 'CafeOrCoffeeShop', aplica: 'lugar', grupo: 'comer-y-salir' },
  { es: 'Actividades', en: 'Activities', tipo: 'TouristAttraction', aplica: 'ambos', grupo: 'aire-libre' },
  { es: 'Playas', en: 'Beaches', tipo: 'Beach', aplica: 'lugar', grupo: 'mar' },
  { es: 'Tiendas locales', en: 'Local shops', tipo: 'Store', aplica: 'lugar', grupo: 'lo-local' },
  { es: 'Mercados', en: 'Markets', tipo: 'LocalBusiness', aplica: 'ambos', grupo: 'lo-local' },
  { es: 'Cultura', en: 'Culture', tipo: 'TouristAttraction', aplica: 'ambos', grupo: 'lo-local' },
] as const

// Nombres inventados: nunca datos reales (spec §5.5).
const LUGARES = [
  { nombre: 'Cocina Marea Alta', cat: 0, en: true },
  { nombre: 'Taquería El Faro Azul', cat: 0, en: true },
  { nombre: 'Mesa del Desierto', cat: 0, en: true },
  { nombre: 'Café Duna', cat: 1, en: true },
  { nombre: 'Bar La Ballena Gris', cat: 1, en: false },
  { nombre: 'Playa Arena Fina', cat: 3, en: true },
  { nombre: 'Kayak Bahía Serena', cat: 2, en: true },
  { nombre: 'Taller de Palma', cat: 4, en: true, patrocinado: true },
] as const

export async function sembrar(
  payload: Payload,
  opciones: { contrasenaAdmin?: string; ahora?: Date } = {},
): Promise<{ admin: string }> {
  const ahora = opciones.ahora ?? new Date()
  const dia = 24 * 60 * 60 * 1000
  await vaciarColecciones(payload)

  const admin = await payload.create({
    collection: 'users',
    data: {
      email: 'admin@guia.local',
      password: opciones.contrasenaAdmin ?? randomUUID(), // sin contraseña conocida por defecto
      nombrePublico: 'Equipo de la guía',
      rol: 'admin',
    },
    overrideAccess: true,
    context: ctx,
  })

  const fotos = []
  for (const [i, color] of [{ r: 20, g: 110, b: 150 }, { r: 210, g: 160, b: 90 }, { r: 60, g: 140, b: 90 }].entries()) {
    const data = await imagenDePrueba({ color })
    fotos.push(
      await payload.create({
        collection: 'media',
        locale: 'es',
        data: { alt: { es: `Foto de prueba ${i + 1}`, en: `Sample photo ${i + 1}` }, credito: 'Generada' },
        file: { data, mimetype: 'image/jpeg', name: `semilla-${i + 1}.jpg`, size: data.length },
        overrideAccess: true,
        context: ctx,
      }),
    )
  }

  const zonas = []
  for (const z of [
    { nombre: 'La Paz', slug: 'la-paz', activa: true, sedeSlug: 'la-paz', orden: 1 },
    { nombre: 'La Ventana', slug: 'la-ventana', activa: true, sedeSlug: 'la-ventana', orden: 2 },
    { nombre: 'Puerto Chale', slug: 'puerto-chale', activa: false, sedeSlug: 'puerto-chale', orden: 3 },
  ]) {
    const doc = await payload.create({
      collection: 'zonas', locale: 'es',
      data: { ...z, descripcion: `Zona de prueba ${z.nombre}.`, foto: fotos[0].id },
      overrideAccess: true, context: ctx,
    })
    await payload.update({ collection: 'zonas', id: doc.id, locale: 'en', data: { nombre: z.nombre, descripcion: `Sample area ${z.nombre}.` }, overrideAccess: true, context: ctx })
    zonas.push(doc)
  }

  const categorias = []
  for (const [i, c] of CATEGORIAS.entries()) {
    const doc = await payload.create({
      collection: 'categorias', locale: 'es',
      data: { nombre: c.es, aplicaA: c.aplica, tipoSchema: c.tipo, grupo: c.grupo, orden: i + 1 },
      overrideAccess: true, context: ctx,
    })
    await payload.update({ collection: 'categorias', id: doc.id, locale: 'en', data: { nombre: c.en }, overrideAccess: true, context: ctx })
    categorias.push(doc)
  }

  const lugares: Lugare[] = []
  for (const [i, l] of LUGARES.entries()) {
    const doc = await payload.create({
      collection: 'lugares', locale: 'es',
      data: {
        nombre: l.nombre, zona: zonas[0].id, categorias: [categorias[l.cat].id], fotos: [fotos[i % 3].id],
        resumen: `${l.nombre}: lugar inventado para pruebas en La Paz.`, cuerpo: parrafo(`Texto de prueba sobre ${l.nombre}.`),
        direccion: 'Calle Inventada 123, La Paz, BCS', telefono: '+52 612 000 0000', rangoPrecio: '$$',
        horario: [{ dia: 'lunes', abre: '09:00', cierra: '18:00' }],
        patrocinio: 'patrocinado' in l
          ? { activo: true, desde: soloDia(ahora.getTime() - 5 * dia), hasta: soloDia(ahora.getTime() + 60 * dia), notaInterna: 'Prueba' }
          : { activo: false },
        _status: 'published',
      },
      overrideAccess: true, context: ctx,
    })
    if (l.en) {
      await payload.update({
        collection: 'lugares', id: doc.id, locale: 'en',
        data: { resumen: `${l.nombre}: made-up place for testing in La Paz.`, cuerpo: parrafo(`Sample text about ${l.nombre}.`), _status: 'published' },
        overrideAccess: true, context: ctx,
      })
    }
    lugares.push(doc)
  }

  for (const e of [
    { nombre: 'Feria de prueba (pasada)', dias: -10 },
    { nombre: 'Concierto de prueba', dias: 7 },
    { nombre: 'Festival inventado', dias: 20 },
  ]) {
    const inicio = new Date(ahora.getTime() + e.dias * dia).toISOString()
    const doc = await payload.create({
      collection: 'eventos', locale: 'es',
      data: {
        nombre: e.nombre, zona: zonas[0].id, categorias: [categorias[6].id], lugar: lugares[0].id, inicio, inicio_tz: 'America/Mazatlan',
        fotos: [fotos[1].id], resumen: `${e.nombre} en La Paz.`, cuerpo: parrafo(`Detalle de ${e.nombre}.`),
        gratis: true, _status: 'published',
      },
      overrideAccess: true, context: ctx,
    })
    await payload.update({
      collection: 'eventos', id: doc.id, locale: 'en',
      data: { nombre: `${e.nombre} (EN)`, resumen: `${e.nombre} in La Paz.`, cuerpo: parrafo(`Details of ${e.nombre}.`), _status: 'published' },
      overrideAccess: true, context: ctx,
    })
  }

  const cuerpoArticulo = (texto: string) => {
    const c = parrafo(texto)
    ;(c.root.children as unknown[]).push(
      { type: 'block', version: 2, format: '', fields: { id: 'tarjeta-1', blockName: '', blockType: 'tarjetaLugar', lugar: lugares[0].id } },
      {
        type: 'block', version: 2, format: '',
        fields: { id: 'faq-1', blockName: '', blockType: 'preguntasFrecuentes', preguntas: [{ id: 'p1', pregunta: '¿Es de prueba?', respuesta: 'Sí.' }] },
      },
    )
    return c
  }
  for (const a of [
    { es: 'Qué hacer en La Paz (prueba)', en: 'What to do in La Paz (sample)' },
    { es: 'Dónde comer en La Paz (prueba)', en: 'Where to eat in La Paz (sample)' },
  ]) {
    const doc = await payload.create({
      collection: 'articulos', locale: 'es',
      data: {
        titulo: a.es, zonas: [zonas[0].id], portada: fotos[2].id, autor: admin.id,
        resumen: `${a.es}.`, cuerpo: cuerpoArticulo(`Respuesta directa: ${a.es}.`), _status: 'published',
      },
      overrideAccess: true, context: ctx,
    })
    await payload.update({
      collection: 'articulos', id: doc.id, locale: 'en',
      data: { titulo: a.en, resumen: `${a.en}.`, cuerpo: cuerpoArticulo(`Direct answer: ${a.en}.`), _status: 'published' },
      overrideAccess: true, context: ctx,
    })
  }

  await payload.updateGlobal({
    slug: 'ajustes-guia',
    locale: 'es',
    data: {
      correosAviso: [{ correo: 'avisos@guia.local' }],
      correoPrivacidad: 'privacidad@guia.local',
      formularioActivo: false,
      portadaTitulo: 'Guía de la Baja (datos de prueba)',
      portadaIntro: 'Contenido inventado para desarrollo.',
    },
    overrideAccess: true,
    context: ctx,
  })

  return { admin: 'admin@guia.local' }
}
