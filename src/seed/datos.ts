import { randomUUID } from 'node:crypto'

import type { Payload } from 'payload'

import { mesEnBCS } from '../dominio/temporada'
import type { Evento, Lugare, Media, Zona } from '../payload-types'

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

// Nombres inventados: nunca datos reales (spec §5.5). Coordenadas cerca de La Paz.
const LUGARES = [
  { nombre: 'Cocina Marea Alta', cat: 0, en: true, coord: [-110.3105, 24.1601], destacado: 1, carac: ['con-comida'] },
  { nombre: 'Taquería El Faro Azul', cat: 0, en: true, coord: [-110.3152, 24.1588], carac: ['para-ninos', 'con-comida'] },
  { nombre: 'Mesa del Desierto', cat: 0, en: true, coord: [-110.3001, 24.1405], carac: [] },
  { nombre: 'Café Duna', cat: 1, en: true, coord: [-110.3121, 24.1633], carac: [], madrugada: true },
  { nombre: 'Bar La Ballena Gris', cat: 1, en: false, coord: [-110.3135, 24.1622], carac: [], vencido: true },
  { nombre: 'Playa Arena Fina', cat: 3, en: true, coord: [-110.3226, 24.3216], destacado: 2, carac: ['para-ninos'] },
  { nombre: 'Kayak Bahía Serena', cat: 2, en: true, coord: [-110.2911, 24.2102], carac: ['solo-con-tour'], futuro: true },
  { nombre: 'Taller de Palma', cat: 4, en: true, patrocinado: true, coord: [-110.3099, 24.1555], carac: [] },
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

  const fotos: Media[] = []
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

  const zonas: Zona[] = []
  for (const z of [
    { nombre: 'La Paz', slug: 'la-paz', activa: true, sedeSlug: 'la-paz', orden: 1, coordenadas: [-110.3128, 24.1426] as [number, number] },
    { nombre: 'La Ventana', slug: 'la-ventana', activa: true, sedeSlug: 'la-ventana', orden: 2, coordenadas: [-109.9906, 24.0469] as [number, number] },
    { nombre: 'Puerto Chale', slug: 'puerto-chale', activa: false, sedeSlug: 'puerto-chale', orden: 3, coordenadas: [-111.0311, 24.4247] as [number, number] },
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
        coordenadas: [...l.coord] as [number, number],
        caracteristicas: [...l.carac],
        destacadoEnPortada: 'destacado' in l,
        ordenDestacado: 'destacado' in l ? l.destacado : 100,
        horario: 'madrugada' in l
          ? [{ dia: 'viernes', abre: '18:00', cierra: '02:00' }, { dia: 'sabado', abre: '18:00', cierra: '02:00' }]
          : [
              { dia: 'martes', abre: '12:00', cierra: '17:00' },
              { dia: 'martes', abre: '19:00', cierra: '23:00' },
              { dia: 'miercoles', abre: '09:00', cierra: '18:00' },
              { dia: 'jueves', abre: '09:00', cierra: '18:00' },
              { dia: 'viernes', abre: '09:00', cierra: '18:00' },
              { dia: 'sabado', abre: '09:00', cierra: '18:00' },
            ],
        patrocinio: 'patrocinado' in l
          ? { activo: true, desde: soloDia(ahora.getTime() - 5 * dia), hasta: soloDia(ahora.getTime() + 60 * dia), notaInterna: 'Prueba' }
          : 'futuro' in l
            ? { activo: true, desde: soloDia(ahora.getTime() + 10 * dia), hasta: soloDia(ahora.getTime() + 40 * dia), notaInterna: 'Declarado, aún no vigente' }
            : 'vencido' in l
              ? { activo: true, desde: soloDia(ahora.getTime() - 60 * dia), hasta: soloDia(ahora.getTime() - 5 * dia), notaInterna: 'Vencido' }
              : { activo: false },
        web: 'https://ejemplo.invalid',
        instagram: '@guia_ficticia_0000',
        whatsapp: '+52 612 000 0000',
        ...(l.nombre === 'Playa Arena Fina'
          ? {
              otrosNombres: ['Arena Fina'],
              visita: { costoEntrada: '$100 MXN por persona', minutosDesdeZona: 45, medio: 'auto' as const, comoLlegar: 'Por la carretera a Pichilingue.', servicios: ['sombra' as const, 'banos' as const], mejorHora: 'Temprano, antes de las 10.' },
              preguntas: [{ pregunta: '¿Hay sombra?', respuesta: 'Sí, con palapas.' }],
            }
          : {}),
        ...('patrocinado' in l ? { otrosNombres: ['Patrocinado Prueba'] } : {}),
        _status: 'published',
      },
      overrideAccess: true, context: ctx,
    })
    if (l.en) {
      await payload.update({
        collection: 'lugares', id: doc.id, locale: 'en',
        data: {
          resumen: `${l.nombre}: made-up place for testing in La Paz.`, cuerpo: parrafo(`Sample text about ${l.nombre}.`), _status: 'published',
          ...(l.nombre === 'Playa Arena Fina'
            ? {
                visita: { costoEntrada: '$100 MXN per person', comoLlegar: 'Take the road to Pichilingue.', mejorHora: 'Early, before 10.' },
                preguntas: [{ pregunta: 'Is there shade?', respuesta: 'Yes, palapas.' }],
              }
            : {}),
        },
        overrideAccess: true, context: ctx,
      })
    }
    lugares.push(doc)
  }

  const eventos: Evento[] = []
  for (const e of [
    { nombre: 'Feria de prueba (pasada)', dias: -10 },
    { nombre: 'Concierto de prueba', dias: 7, conFin: true },
    { nombre: 'Festival inventado', dias: 20 },
  ]) {
    const inicio = new Date(ahora.getTime() + e.dias * dia).toISOString()
    const doc = await payload.create({
      collection: 'eventos', locale: 'es',
      data: {
        nombre: e.nombre, zona: zonas[0].id, categorias: [categorias[6].id], lugar: lugares[0].id, inicio, inicio_tz: 'America/Mazatlan',
        ...('conFin' in e
          ? {
              fin: new Date(new Date(inicio).getTime() + 3 * 60 * 60 * 1000).toISOString(),
              fin_tz: 'America/Mazatlan' as const,
              destacadoEnPortada: true,
              ordenDestacado: 3,
              gratis: false,
              precio: '$150 MXN',
              urlBoletos: 'https://ejemplo.invalid/boletos',
            }
          : { gratis: true }),
        fotos: [fotos[1].id], resumen: `${e.nombre} en La Paz.`, cuerpo: parrafo(`Detalle de ${e.nombre}.`),
        _status: 'published',
      },
      overrideAccess: true, context: ctx,
    })
    await payload.update({
      collection: 'eventos', id: doc.id, locale: 'en',
      data: { nombre: `${e.nombre} (EN)`, resumen: `${e.nombre} in La Paz.`, cuerpo: parrafo(`Details of ${e.nombre}.`), _status: 'published' },
      overrideAccess: true, context: ctx,
    })
    eventos.push(doc)
  }

  const cuerpoArticulo = (texto: string) => {
    const c = parrafo(texto)
    const txt = (t: string) => ({ type: 'text', text: t, format: 0, style: '', mode: 'normal', detail: 0, version: 1 })
    const h2 = (t: string) => ({ type: 'heading', tag: 'h2', version: 1, format: '', indent: 0, direction: 'ltr', children: [txt(t)] })
    ;(c.root.children as unknown[]).push(
      { type: 'paragraph', version: 1, format: '', indent: 0, direction: 'ltr', textFormat: 0, children: [txt('Muy cerca de Arena Fina y de Patrocinado Prueba.')] },
      { type: 'block', version: 2, format: '', fields: { id: 'tour-1', blockName: '', blockType: 'tour', zona: zonas[0].id, tour: 'servicio:ballenas-prueba' } },
      h2('En el centro'),
      {
        type: 'paragraph', version: 1, format: '', indent: 0, direction: 'ltr', textFormat: 0,
        children: [{
          type: 'link', version: 3, format: '', indent: 0, direction: 'ltr',
          fields: { linkType: 'internal', doc: { relationTo: 'lugares', value: lugares[1].id }, newTab: false },
          children: [txt('la taquería del faro')],
        }],
      },
      { type: 'block', version: 2, format: '', fields: { id: 'tarjeta-1', blockName: '', blockType: 'tarjetaLugar', lugar: lugares[0].id } },
      h2('Qué ver'),
      { type: 'upload', version: 3, format: '', relationTo: 'media', value: fotos[0].id, fields: null },
      { type: 'block', version: 2, format: '', fields: { id: 'evento-1', blockName: '', blockType: 'tarjetaEvento', evento: eventos[1].id } },
      { type: 'block', version: 2, format: '', fields: { id: 'tours-1', blockName: '', blockType: 'toursZona', zona: zonas[0].id } },
      {
        type: 'block', version: 2, format: '',
        fields: { id: 'faq-1', blockName: '', blockType: 'preguntasFrecuentes', preguntas: [{ id: 'p1', pregunta: '¿Es de prueba?', respuesta: 'Sí.' }] },
      },
    )
    return c
  }
  for (const [i, a] of [
    { es: 'Qué hacer en La Paz (prueba)', en: 'What to do in La Paz (sample)' },
    { es: 'Dónde comer en La Paz (prueba)', en: 'Where to eat in La Paz (sample)' },
  ].entries()) {
    const doc = await payload.create({
      collection: 'articulos', locale: 'es',
      data: {
        titulo: a.es, zonas: [zonas[0].id], portada: fotos[2].id, autor: admin.id,
        resumen: `${a.es}.`, cuerpo: cuerpoArticulo(`Respuesta directa: ${a.es}.`),
        destacadoEnPortada: i === 0, ordenDestacado: i === 0 ? 1 : 100, _status: 'published',
      },
      overrideAccess: true, context: ctx,
    })
    await payload.update({
      collection: 'articulos', id: doc.id, locale: 'en',
      data: { titulo: a.en, resumen: `${a.en}.`, cuerpo: cuerpoArticulo(`Direct answer: ${a.en}.`), _status: 'published' },
      overrideAccess: true, context: ctx,
    })
  }

  await payload.create({
    collection: 'fotos-tours', locale: 'es', overrideAccess: true, context: { disableRevalidate: true },
    data: { sedeSlug: 'la-paz', tipo: 'servicio', slug: 'ballenas-prueba', meses: [String(mesEnBCS(new Date()))] as never },
  })

  const texto = await payload.create({
    collection: 'textos-zona-categoria', locale: 'es',
    data: { zona: zonas[0].id, categoria: categorias[0].id, introduccion: 'Tres mesas inventadas para probar la página de Restaurantes en La Paz.' },
    overrideAccess: true, context: ctx,
  })
  await payload.update({
    collection: 'textos-zona-categoria', id: texto.id, locale: 'en',
    data: { introduccion: 'Three made-up tables to test the Restaurants in La Paz page.' },
    overrideAccess: true, context: ctx,
  })

  await payload.updateGlobal({
    slug: 'ajustes-guia',
    locale: 'es',
    data: {
      versionAviso: '2026-11',
      avisoVigenteDesde: soloDia(ahora.getTime()),
      avisoPrivacidad: parrafo('Aviso de privacidad de prueba. El texto legal lo entrega el dueño.'),
      correosAviso: [{ correo: 'avisos@guia.local' }],
      correoPrivacidad: 'privacidad@guia.local',
      formularioActivo: false,
      portadaTitulo: 'Guía de la Baja (datos de prueba)',
      portadaIntro: 'Contenido inventado para desarrollo.',
    },
    overrideAccess: true,
    context: ctx,
  })
  await payload.updateGlobal({
    slug: 'ajustes-guia',
    locale: 'en',
    data: {
      avisoPrivacidad: parrafo('Sample privacy notice. The legal text is provided by the owner.'),
      portadaTitulo: 'Baja Guide (sample data)',
      portadaIntro: 'Made-up content for development.',
    },
    overrideAccess: true,
    context: ctx,
  })

  return { admin: 'admin@guia.local' }
}
