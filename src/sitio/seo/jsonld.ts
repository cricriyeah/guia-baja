import { CODIGO_REGIONAL, type Locale } from '../../dominio/idioma'
import { SERVICIOS_VISITA } from '../../dominio/visita'
import type { TourConFoto } from '../datos/cacheadas'
import type { FichaArticulo, FichaEvento, FichaLugar, Miga, TarjetaLugar } from '../datos/tipos'
import { textos } from '../textos'

const absoluta = (ruta: string, base: string) => new URL(ruta, base).toString()

export function migasLd(migas: Miga[], base: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: migas.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.nombre, item: absoluta(m.ruta, base) })),
  }
}

export function listaLd(items: { nombre: string; ruta: string }[], base: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.nombre, url: absoluta(x.ruta, base) })),
  }
}

const DIA_SCHEMA: Record<string, string> = {
  lunes: 'Monday', martes: 'Tuesday', miercoles: 'Wednesday', jueves: 'Thursday', viernes: 'Friday', sabado: 'Saturday', domingo: 'Sunday',
}
// Quita llaves vacías: schema.org no quiere null ni listas vacías.
const limpio = <T extends Record<string, unknown>>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))) as T

export function lugarLd(l: FichaLugar, c: { url: string; tipoSchema: string; zonaNombre: string; base: string; lang: Locale }) {
  const servicios = SERVICIOS_VISITA.filter((s) => s.valor !== 'sin-servicios' && l.visita?.servicios.includes(s.valor))
  return limpio({
    '@context': 'https://schema.org',
    '@id': `${absoluta(c.url, c.base)}#lugar`,
    '@type': c.tipoSchema,
    name: l.nombre,
    description: l.resumen,
    url: absoluta(c.url, c.base),
    image: l.fotos.map((f) => absoluta(f.src, c.base)),
    address: limpio({ '@type': 'PostalAddress', streetAddress: l.direccion, addressLocality: c.zonaNombre, addressRegion: 'Baja California Sur', addressCountry: 'MX' }),
    geo: l.coordenadas ? { '@type': 'GeoCoordinates', latitude: l.coordenadas[1], longitude: l.coordenadas[0] } : null,
    telephone: l.telefono,
    priceRange: l.rangoPrecio,
    openingHoursSpecification: l.horario.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${DIA_SCHEMA[h.dia]}`,
      opens: h.abre,
      closes: h.cierra,
    })),
    isAccessibleForFree: l.visita?.entradaGratis ? true : null,
    amenityFeature: servicios.map((s) => ({ '@type': 'LocationFeatureSpecification', name: s[c.lang], value: true })),
  })
}

export function eventoLd(e: FichaEvento, c: { url: string; lugar: TarjetaLugar | null; zonaNombre: string; base: string }) {
  const url = absoluta(c.url, c.base)
  return limpio({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.nombre,
    description: e.resumen,
    url,
    startDate: e.inicio,
    endDate: e.fin,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: e.fotos.map((f) => absoluta(f.src, c.base)),
    isAccessibleForFree: e.gratis || null,
    location: limpio({
      '@type': 'Place',
      name: c.lugar?.nombre ?? e.direccionLibre ?? c.zonaNombre,
      address: limpio({ '@type': 'PostalAddress', streetAddress: c.lugar ? null : e.direccionLibre, addressLocality: c.zonaNombre, addressRegion: 'Baja California Sur', addressCountry: 'MX' }),
    }),
    offers: e.gratis
      ? { '@type': 'Offer', price: 0, priceCurrency: 'MXN', url }
      : e.urlBoletos
        ? { '@type': 'Offer', url: e.urlBoletos }
        : null,
  })
}

export function articuloLd(a: FichaArticulo, c: { url: string; lang: Locale; base: string }) {
  return limpio({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.titulo,
    description: a.resumen,
    mainEntityOfPage: absoluta(c.url, c.base),
    image: a.portada ? [absoluta(a.portada.src, c.base)] : null,
    author: a.autorNombre ? { '@type': 'Person', name: a.autorNombre } : null,
    datePublished: a.publicadoEl,
    dateModified: a.actualizadoEl ?? a.publicadoEl,
    inLanguage: CODIGO_REGIONAL[c.lang],
  })
}

export function faqLd(preguntas: { pregunta: string; respuesta: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: preguntas.map((p) => ({ '@type': 'Question', name: p.pregunta, acceptedAnswer: { '@type': 'Answer', text: p.respuesta } })),
  }
}

function tourLd(t: TourConFoto, c: { lang: Locale; base: string; lugarId?: string }) {
  const url = absoluta(t.ruta, c.base)
  const unidad = t.precio ? textos(c.lang).tours.por[t.precio.estrategia] : ''
  return limpio({
    '@type': 'TouristTrip',
    name: t.nombre,
    url,
    image: t.foto ? absoluta(t.foto.src, c.base) : null,
    itinerary: c.lugarId ? { '@id': c.lugarId } : null,
    provider: { '@type': 'Organization', name: 'Sun Baja', url: c.base },
    offers: t.precio
      ? {
          '@type': 'Offer',
          url,
          priceSpecification: limpio({
            '@type': 'UnitPriceSpecification',
            minPrice: t.precio.valor,
            priceCurrency: t.precio.moneda,
            unitText: unidad || null,
          }),
        }
      : null,
  })
}

// Spec del paquete 1 §2.5: TouristTrip y no Product, porque los resultados de comerciante piden envío y devoluciones.
export function toursLd(tours: TourConFoto[], c: { lang: Locale; base: string; lugarId?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: tours.map((t, i) => ({ '@type': 'ListItem', position: i + 1, item: tourLd(t, c) })),
  }
}

export function itinerarioLd(i: { titulo: string; resumen: string }, c: { url: string; base: string; lugares: { nombre: string; ruta: string }[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: i.titulo,
    description: i.resumen,
    url: absoluta(c.url, c.base),
    itinerary: {
      '@type': 'ItemList',
      itemListElement: c.lugares.map((l, n) => ({
        '@type': 'ListItem', position: n + 1,
        item: { '@type': 'TouristAttraction', name: l.nombre, url: absoluta(l.ruta, c.base) },
      })),
    },
  }
}
