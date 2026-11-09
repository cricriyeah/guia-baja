import type { Grupo } from '../../dominio/grupos'
import { CAMPOS_IDIOMA, existeEnIdioma, type Locale, textoDeLexical } from '../../dominio/idioma'
import { clavesDeItinerario, type Dia } from '../../dominio/itinerarios'
import { idDe } from '../../dominio/lexical'
import { esClaveDeTour } from '../../dominio/presencia'
import { tieneVisita, type VisitaPublica } from '../../dominio/visita'
import type { Articulo, Categoria, Evento, Itinerario, Lugare, Media, Tema, Zona } from '../../payload-types'
import type {
  CategoriaPublica, Destacado, FichaArticulo, FichaEvento, FichaItinerario, FichaLugar, FichaTema, FilaHorarioPublica, Imagen, PatrocinioPublico,
  TarjetaArticulo, TarjetaEvento, TarjetaItinerario, TarjetaLugar, TarjetaTema, ZonaPublica,
} from './tipos'

export const CLASE_GRUPO: Record<Grupo, string> = {
  mar: 'g-mar',
  'aire-libre': 'g-aire',
  'comer-y-salir': 'g-comer',
  'lo-local': 'g-local',
}

const TAMANOS = ['s480', 's960', 's1600'] as const

// Spec §4.2: sin optimizador de Next; srcset con los tamaños que genera Payload.
export function imagenDe(media: unknown, lang: Locale): Imagen | null {
  if (!media || typeof media !== 'object') return null
  const m = media as Media
  if (!m.url) return null
  const tamanos = m.sizes ?? {}
  const srcset = TAMANOS.map((k) => tamanos[k])
    .filter((t): t is { url: string; width: number } => Boolean(t?.url && t.width))
    .map((t) => `${t.url} ${t.width}w`)
    .join(', ')
  return {
    src: tamanos.s960?.url ?? m.url,
    srcset,
    ancho: m.width ?? null,
    alto: m.height ?? null,
    alt: m.alt?.[lang] ?? '',
    credito: m.credito ?? null,
    og: tamanos.og?.url ?? null,
  }
}

export function zonaDe(z: Zona, lang: Locale): ZonaPublica | null {
  if (!z.nombre || !z.slug) return null
  return {
    id: z.id,
    slug: z.slug,
    nombre: z.nombre,
    descripcion: z.descripcion ?? null,
    sedeSlug: z.sedeSlug ?? null,
    coordenadas: z.coordenadas ?? null,
    foto: imagenDe(z.foto, lang),
    orden: z.orden ?? 100,
  }
}

export function categoriaDe(c: Categoria): CategoriaPublica | null {
  if (!c.nombre || !c.slug) return null
  return {
    id: c.id,
    slug: c.slug,
    nombre: c.nombre,
    grupo: c.grupo,
    claseGrupo: CLASE_GRUPO[c.grupo],
    aplicaA: c.aplicaA,
    tipoSchema: c.tipoSchema,
    orden: c.orden ?? 100,
  }
}

const ids = (v: unknown[] | null | undefined): number[] => (v ?? []).map((x) => idDe(x)).filter((x): x is number => x !== null)
const slugDe = (v: unknown): string => (v && typeof v === 'object' ? String((v as { slug?: string }).slug ?? '') : '')
const iso = (v: unknown): string | null => (typeof v === 'string' && v ? new Date(v).toISOString() : null)

function patrocinioDe(p: { activo?: boolean | null; desde?: string | null; hasta?: string | null } | null | undefined): PatrocinioPublico {
  return { activo: Boolean(p?.activo), desde: iso(p?.desde), hasta: iso(p?.hasta) }
}
const destacadoDe = (d: { destacadoEnPortada?: boolean | null; ordenDestacado?: number | null }): Destacado => ({
  activo: Boolean(d.destacadoEnPortada),
  orden: d.ordenDestacado ?? 100,
})
const horarioDe = (h: { dia: string; abre: string; cierra: string }[] | null | undefined): FilaHorarioPublica[] =>
  (h ?? []).map(({ dia, abre, cierra }) => ({ dia, abre, cierra }))
// Minutos de lectura a 200 palabras por minuto, redondeando hacia arriba.
const minutosDe = (cuerpo: unknown) => Math.max(1, Math.ceil(textoDeLexical(cuerpo).trim().split(/\s+/).filter(Boolean).length / 200))
const fotosDe = (fotos: unknown, lang: Locale, media?: Record<string, Imagen>): Imagen[] =>
  ((fotos as unknown[]) ?? [])
    .map((f) => (media ? (media[String(idDe(f))] ?? null) : imagenDe(f, lang)))
    .filter((x): x is Imagen => x !== null)

// Regla de idioma (spec §6): con los campos leídos en `lang` (fallbackLocale: false).
export function lugarDe(doc: Lugare, lang: Locale): TarjetaLugar | null {
  if (!existeEnIdioma(doc as never, CAMPOS_IDIOMA.lugares)) return null
  const zonaId = idDe(doc.zona)
  // Una zona inactiva no se puebla (acceso público): el id suelto no trae slug y la URL daría 404.
  if (zonaId === null || !slugDe(doc.zona) || !doc.slug) return null
  return {
    id: doc.id,
    slug: doc.slug,
    nombre: doc.nombre,
    resumen: doc.resumen ?? '',
    zonaId,
    zonaSlug: slugDe(doc.zona),
    categoriaIds: ids(doc.categorias),
    foto: fotosDe(doc.fotos, lang)[0] ?? null,
    rangoPrecio: doc.rangoPrecio ?? null,
    horario: horarioDe(doc.horario),
    caracteristicas: doc.caracteristicas ?? [],
    coordenadas: doc.coordenadas ?? null,
    patrocinio: patrocinioDe(doc.patrocinio),
    orden: doc.orden ?? 100,
    destacado: destacadoDe(doc),
    noIndexar: Boolean(doc.seo?.noIndexar),
    // Sin el campo (datos de antes del cambio) es lista vacía; una clave mal formada se descarta.
    toursRelacionados: (doc.toursRelacionados ?? []).filter(esClaveDeTour),
    otrosNombres: doc.otrosNombres ?? [],
    enlazarMenciones: doc.enlazarMenciones !== false,
    servicios: doc.visita?.servicios ?? [],
  }
}

function visitaDe(doc: Lugare): VisitaPublica | null {
  const v = doc.visita
  if (!v) return null
  const publica: VisitaPublica = {
    costoEntrada: v.costoEntrada ?? null,
    entradaGratis: Boolean(v.entradaGratis),
    minutosDesdeZona: v.minutosDesdeZona ?? null,
    medio: v.medio ?? null,
    comoLlegar: v.comoLlegar ?? null,
    servicios: v.servicios ?? [],
    mejorHora: v.mejorHora ?? null,
  }
  return tieneVisita(publica) ? publica : null
}

export function fichaLugarDe(doc: Lugare, lang: Locale, media: Record<string, Imagen>): FichaLugar | null {
  const t = lugarDe(doc, lang)
  if (!t) return null
  const fotos = fotosDe(doc.fotos, lang, media)
  return {
    ...t,
    foto: fotos[0] ?? null,
    cuerpo: doc.cuerpo ?? null,
    fotos,
    direccion: doc.direccion ?? null,
    telefono: doc.telefono ?? null,
    whatsapp: doc.whatsapp ?? null,
    web: doc.web ?? null,
    instagram: doc.instagram ?? null,
    notaHorario: doc.notaHorario ?? null,
    preguntas: (doc.preguntas ?? []).map((p) => ({ pregunta: p.pregunta, respuesta: p.respuesta })),
    visita: visitaDe(doc),
    metaTitulo: doc.seo?.metaTitulo ?? null,
    metaDescripcion: doc.seo?.metaDescripcion ?? null,
    media,
  }
}

export function eventoDe(doc: Evento, lang: Locale): TarjetaEvento | null {
  if (!existeEnIdioma(doc as never, CAMPOS_IDIOMA.eventos)) return null
  const zonaId = idDe(doc.zona)
  const inicio = iso(doc.inicio)
  if (zonaId === null || !slugDe(doc.zona) || !doc.slug || !inicio) return null
  return {
    id: doc.id,
    slug: doc.slug,
    nombre: doc.nombre,
    resumen: doc.resumen ?? '',
    zonaId,
    zonaSlug: slugDe(doc.zona),
    categoriaIds: ids(doc.categorias),
    foto: fotosDe(doc.fotos, lang)[0] ?? null,
    inicio,
    fin: iso(doc.fin),
    gratis: Boolean(doc.gratis),
    precio: doc.precio ?? null,
    lugarId: idDe(doc.lugar),
    direccionLibre: doc.direccionLibre ?? null,
    patrocinio: patrocinioDe(doc.patrocinio),
    orden: 100,
    destacado: destacadoDe(doc),
    noIndexar: Boolean(doc.seo?.noIndexar),
  }
}

export function fichaEventoDe(doc: Evento, lang: Locale, media: Record<string, Imagen>): FichaEvento | null {
  const t = eventoDe(doc, lang)
  if (!t) return null
  const fotos = fotosDe(doc.fotos, lang, media)
  return {
    ...t,
    foto: fotos[0] ?? null,
    cuerpo: doc.cuerpo ?? null,
    fotos,
    urlBoletos: doc.urlBoletos ?? null,
    metaTitulo: doc.seo?.metaTitulo ?? null,
    metaDescripcion: doc.seo?.metaDescripcion ?? null,
    media,
  }
}

export function articuloDe(doc: Articulo, lang: Locale): TarjetaArticulo | null {
  if (!existeEnIdioma(doc as never, CAMPOS_IDIOMA.articulos) || !doc.slug) return null
  return {
    id: doc.id,
    slug: doc.slug,
    titulo: doc.titulo,
    resumen: doc.resumen ?? '',
    zonaIds: ids(doc.zonas),
    categoriaIds: ids(doc.categorias),
    portada: imagenDe(doc.portada, lang),
    autorNombre: doc.autorNombre ?? '',
    publicadoEl: iso(doc.publicadoEl),
    actualizadoEl: iso(doc.actualizadoEl),
    lugaresCitados: ids(doc.lugaresCitados),
    minutosLectura: minutosDe(doc.cuerpo),
    destacado: destacadoDe(doc),
    noIndexar: Boolean(doc.seo?.noIndexar),
  }
}

export function fichaArticuloDe(doc: Articulo, lang: Locale, media: Record<string, Imagen>): FichaArticulo | null {
  const t = articuloDe(doc, lang)
  if (!t) return null
  return {
    ...t,
    portada: media[String(idDe(doc.portada))] ?? t.portada,
    cuerpo: doc.cuerpo ?? null,
    metaTitulo: doc.seo?.metaTitulo ?? null,
    metaDescripcion: doc.seo?.metaDescripcion ?? null,
    media,
  }
}

function diasDe(doc: Itinerario): Dia[] {
  return (doc.dias ?? []).map((d) => ({
    titulo: d.titulo ?? null,
    paradas: (d.paradas ?? []).map((p) => ({ hora: p.hora ?? null, lugarId: idDe(p.lugar), tour: p.tour ?? null, nota: p.nota ?? null })),
  }))
}

export function itinerarioDe(doc: Itinerario, lang: Locale): TarjetaItinerario | null {
  if (!existeEnIdioma(doc as never, CAMPOS_IDIOMA.itinerarios) || !doc.slug) return null
  const zonaId = idDe(doc.zona)
  // Una zona inactiva no se puebla (acceso público): sin slug la página no existe, como un lugar.
  if (zonaId === null || !slugDe(doc.zona)) return null
  const dias = diasDe(doc)
  return {
    id: doc.id, slug: doc.slug, titulo: doc.titulo, resumen: doc.resumen ?? '', zonaId,
    portada: imagenDe(doc.portada, lang), autorNombre: doc.autorNombre ?? '',
    publicadoEl: iso(doc.publicadoEl), actualizadoEl: iso(doc.actualizadoEl),
    lugaresCitados: ids(doc.lugaresCitados), numeroDias: dias.length, clavesTours: clavesDeItinerario(dias),
    categoriaIds: [], destacado: destacadoDe(doc), noIndexar: Boolean(doc.seo?.noIndexar),
  }
}

export function fichaItinerarioDe(doc: Itinerario, lang: Locale, media: Record<string, Imagen>): FichaItinerario | null {
  const t = itinerarioDe(doc, lang)
  if (!t) return null
  return {
    ...t,
    portada: media[String(idDe(doc.portada))] ?? t.portada,
    cuerpo: doc.cuerpo ?? null,
    dias: diasDe(doc),
    preguntas: (doc.preguntas ?? []).map((p) => ({ pregunta: p.pregunta, respuesta: p.respuesta })),
    metaTitulo: doc.seo?.metaTitulo ?? null, metaDescripcion: doc.seo?.metaDescripcion ?? null, media,
  }
}

export function temaDe(doc: Tema, lang: Locale): TarjetaTema | null {
  if (!existeEnIdioma(doc as never, CAMPOS_IDIOMA.temas) || !doc.slug) return null
  const zonaId = idDe(doc.zona)
  return {
    id: doc.id, slug: doc.slug, titulo: doc.titulo, resumen: doc.resumen ?? '', zonaId,
    portada: imagenDe(doc.portada, lang), publicadoEl: iso(doc.publicadoEl), actualizadoEl: iso(doc.actualizadoEl),
    criterios: { zonaId, categoriaIds: ids(doc.categorias), caracteristicas: doc.caracteristicas ?? [], servicios: doc.servicios ?? [], lugaresFijosIds: ids(doc.lugaresFijos) },
    tours: (doc.tours ?? []).flatMap((f) => {
      const z = idDe(f.zona)
      return z !== null && esClaveDeTour(f.tour) ? [{ zonaId: z, clave: f.tour }] : []
    }),
    categoriaIds: ids(doc.categorias), destacado: destacadoDe(doc), noIndexar: Boolean(doc.seo?.noIndexar),
  }
}

export function fichaTemaDe(doc: Tema, lang: Locale, media: Record<string, Imagen>): FichaTema | null {
  const t = temaDe(doc, lang)
  if (!t) return null
  return {
    ...t,
    portada: media[String(idDe(doc.portada))] ?? t.portada,
    introduccion: doc.introduccion ?? null, autorNombre: doc.autorNombre ?? '',
    preguntas: (doc.preguntas ?? []).map((p) => ({ pregunta: p.pregunta, respuesta: p.respuesta })),
    metaTitulo: doc.seo?.metaTitulo ?? null, metaDescripcion: doc.seo?.metaDescripcion ?? null, media,
  }
}
