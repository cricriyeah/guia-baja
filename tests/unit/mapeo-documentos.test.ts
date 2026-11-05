import { describe, expect, it } from 'vitest'

import { articuloDe, eventoDe, fichaArticuloDe, fichaEventoDe, fichaLugarDe, lugarDe } from '../../src/sitio/datos/mapeo'

const lexical = (t: string) => ({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: t }] }] } })
const foto = { id: 5, url: '/m/f.jpg', width: 1600, height: 1067, alt: { es: 'Foto', en: 'Photo' }, sizes: { s480: { url: '/m/f-480.webp', width: 480 } } }

const lugar = {
  id: 1, nombre: 'Playa Balandra', slug: 'balandra', resumen: 'Agua baja', cuerpo: lexical('Texto'),
  zona: { id: 2, slug: 'la-paz' }, categorias: [{ id: 3 }, 4], fotos: [foto], rangoPrecio: '$',
  horario: [{ id: 'x', dia: 'martes', abre: '08:00', cierra: '18:00' }], caracteristicas: ['para-ninos'],
  coordenadas: [-110.32, 24.32], orden: 5, destacadoEnPortada: true, ordenDestacado: 2,
  patrocinio: { activo: true, desde: '2026-11-01T00:00:00.000Z', hasta: '2026-12-01T00:00:00.000Z', notaInterna: 'no' },
  seo: { noIndexar: false }, direccion: 'Km 25', telefono: null, web: 'https://x.test', _status: 'published',
}

const idaYVuelta = (x: unknown) => JSON.parse(JSON.stringify(x))

describe('mapeos de documentos (regla de idioma, spec §6)', () => {
  it('lugarDe arma la tarjeta y es JSON puro', () => {
    const t = lugarDe(lugar as never, 'es')
    expect(t).toMatchObject({ id: 1, slug: 'balandra', zonaId: 2, zonaSlug: 'la-paz', categoriaIds: [3, 4], destacado: { activo: true, orden: 2 } })
    expect(t?.horario).toEqual([{ dia: 'martes', abre: '08:00', cierra: '18:00' }])
    expect(JSON.stringify(t)).not.toContain('notaInterna')
    expect(idaYVuelta(t)).toEqual(t)
  })

  it('con la zona sin poblar (id suelto: inactiva o sin acceso), lugar y evento no existen', () => {
    expect(lugarDe({ ...lugar, zona: 2 } as never, 'es')).toBeNull()
    expect(lugarDe({ ...lugar, zona: { id: 2 } } as never, 'es')).toBeNull()
    const evento = { id: 7, nombre: 'Trova', slug: 'trova', resumen: 'r', cuerpo: lexical('c'), categorias: [3], fotos: [foto],
      inicio: '2026-11-07T02:00:00.000Z', fin: null, patrocinio: {}, seo: {} }
    expect(eventoDe({ ...evento, zona: 2 } as never, 'es')).toBeNull()
    expect(eventoDe({ ...evento, zona: { id: 2, slug: 'la-paz' } } as never, 'es')).not.toBeNull()
  })

  it('sin resumen o sin cuerpo en el idioma, el lugar no existe', () => {
    expect(lugarDe({ ...lugar, resumen: null } as never, 'en')).toBeNull()
    expect(lugarDe({ ...lugar, cuerpo: lexical(' ') } as never, 'en')).toBeNull()
  })

  it('fichaLugarDe usa el mapa de media para fotos e imágenes', () => {
    const media = { '5': { src: '/m/f.jpg', srcset: '', ancho: 1600, alto: 1067, alt: 'Foto', credito: null, og: null } }
    const f = fichaLugarDe({ ...lugar, fotos: [5] } as never, 'es', media)
    expect(f?.fotos).toEqual([media['5']])
    expect(f?.web).toBe('https://x.test')
    expect(idaYVuelta(f)).toEqual(f)
  })

  it('eventoDe: fechas ISO y lugar como id', () => {
    const e = eventoDe(
      { id: 7, nombre: 'Trova', slug: 'trova', resumen: 'r', cuerpo: lexical('c'), zona: { id: 2, slug: 'la-paz' }, categorias: [3], fotos: [foto],
        inicio: '2026-11-07T02:00:00.000Z', fin: null, gratis: true, precio: null, lugar: { id: 1 }, patrocinio: {}, seo: {} } as never,
      'es',
    )
    expect(e).toMatchObject({ inicio: '2026-11-07T02:00:00.000Z', fin: null, lugarId: 1, gratis: true })
    expect(idaYVuelta(e)).toEqual(e)
  })

  it('articuloDe: minutos de lectura y lugares citados', () => {
    const palabras = Array.from({ length: 450 }, () => 'pez').join(' ')
    const a = articuloDe(
      { id: 8, titulo: 'Siete mesas', slug: 'siete', resumen: 'r', cuerpo: lexical(palabras), zonas: [2], categorias: [{ id: 3 }],
        portada: foto, autorNombre: 'Ana', publicadoEl: '2026-10-20T00:00:00.000Z', actualizadoEl: null, lugaresCitados: [1, { id: 4 }], seo: {} } as never,
      'es',
    )
    expect(a).toMatchObject({ minutosLectura: 3, lugaresCitados: [1, 4], zonaIds: [2], autorNombre: 'Ana' })
    expect(idaYVuelta(a)).toEqual(a)
  })

  it('fichaEventoDe: fotos del mapa de media, urlBoletos y JSON puro', () => {
    const media = { '5': { src: '/m/f.jpg', srcset: '', ancho: 1600, alto: 1067, alt: 'Foto', credito: null, og: null } }
    const f = fichaEventoDe(
      { id: 7, nombre: 'Trova', slug: 'trova', resumen: 'r', cuerpo: lexical('c'), zona: { id: 2, slug: 'la-paz' }, categorias: [3], fotos: [5],
        inicio: '2026-11-07T02:00:00.000Z', fin: '2026-11-07T05:00:00.000Z', gratis: false, precio: '$100', lugar: 1, urlBoletos: 'https://b.test',
        patrocinio: {}, seo: { metaTitulo: 'T' } } as never,
      'es',
      media,
    )
    expect(f).toMatchObject({ foto: media['5'], fotos: [media['5']], urlBoletos: 'https://b.test', metaTitulo: 'T', lugarId: 1, fin: '2026-11-07T05:00:00.000Z' })
    expect(f?.media).toEqual(media)
    expect(idaYVuelta(f)).toEqual(f)
  })

  it('fichaArticuloDe: la portada sale del mapa de media y es JSON puro', () => {
    const media = { '5': { src: '/m/del-mapa.jpg', srcset: '', ancho: 1600, alto: 1067, alt: 'Del mapa', credito: null, og: null } }
    const f = fichaArticuloDe(
      { id: 8, titulo: 'Siete mesas', slug: 'siete', resumen: 'r', cuerpo: lexical('c'), zonas: [2], categorias: [3],
        portada: 5, autorNombre: 'Ana', publicadoEl: '2026-10-20T00:00:00.000Z', actualizadoEl: null, lugaresCitados: [], seo: { metaDescripcion: 'D' } } as never,
      'es',
      media,
    )
    expect(f?.portada).toEqual(media['5'])
    expect(f).toMatchObject({ metaDescripcion: 'D', metaTitulo: null })
    expect(idaYVuelta(f)).toEqual(f)
  })
})
