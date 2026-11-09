import type { Locale } from './idioma'

// Datos de visita de un lugar (spec del paquete 1 §2.3). Listas cerradas en código, como CARACTERISTICAS.
export const SERVICIOS_VISITA = [
  { valor: 'sombra', es: 'Sombra', en: 'Shade' },
  { valor: 'banos', es: 'Baños', en: 'Restrooms' },
  { valor: 'regaderas', es: 'Regaderas', en: 'Showers' },
  { valor: 'estacionamiento', es: 'Estacionamiento', en: 'Parking' },
  { valor: 'renta-de-equipo', es: 'Renta de equipo', en: 'Equipment rental' },
  { valor: 'comida-cerca', es: 'Comida cerca', en: 'Food nearby' },
  { valor: 'sin-servicios', es: 'Sin servicios', en: 'No services' },
] as const

export const MEDIOS = [
  { valor: 'auto', es: 'en auto', en: 'by car' },
  { valor: 'lancha', es: 'en lancha', en: 'by boat' },
  { valor: 'a-pie', es: 'a pie', en: 'on foot' },
  { valor: '4x4', es: 'en 4x4', en: 'by 4x4' },
] as const

const ETIQUETAS = {
  es: { entrada: 'Entrada', gratis: 'Gratis', tiempo: 'Cómo se llega', indicaciones: 'Indicaciones', servicios: 'Servicios', hora: 'Mejor hora', desde: 'desde' },
  en: { entrada: 'Entrance', gratis: 'Free', tiempo: 'Getting there', indicaciones: 'Directions', servicios: 'Services', hora: 'Best time', desde: 'from' },
} as const

export type VisitaPublica = {
  costoEntrada: string | null
  entradaGratis: boolean
  minutosDesdeZona: number | null
  medio: string | null
  comoLlegar: string | null
  servicios: string[]
  mejorHora: string | null
}

export function validarVisita(v: unknown): true | string {
  const d = (v ?? {}) as { minutosDesdeZona?: number | null; medio?: string | null; servicios?: string[] | null }
  if (Boolean(d.minutosDesdeZona) !== Boolean(d.medio)) return 'El tiempo y el medio van juntos: llena los dos o ninguno.'
  if (d.servicios?.includes('sin-servicios') && d.servicios.length > 1) return '«Sin servicios» no se combina con otro servicio.'
  return true
}

const textoTiempo = (v: VisitaPublica, lang: Locale, zona: string): string | null => {
  if (!v.minutosDesdeZona || !v.medio) return null
  const medio = MEDIOS.find((m) => m.valor === v.medio)
  return medio ? `${v.minutosDesdeZona} min ${medio[lang]} ${ETIQUETAS[lang].desde} ${zona}` : null
}

const textoEntrada = (v: VisitaPublica, lang: Locale): string | null => (v.entradaGratis ? ETIQUETAS[lang].gratis : v.costoEntrada)

export function filasVisita(v: VisitaPublica, lang: Locale, zonaNombre: string): { dato: string; valor: string }[] {
  const e = ETIQUETAS[lang]
  const servicios = SERVICIOS_VISITA.filter((s) => v.servicios.includes(s.valor)).map((s) => s[lang]).join(', ')
  const filas: [string, string | null][] = [
    [e.entrada, textoEntrada(v, lang)],
    [e.tiempo, textoTiempo(v, lang, zonaNombre)],
    [e.indicaciones, v.comoLlegar],
    [e.servicios, servicios || null],
    [e.hora, v.mejorHora],
  ]
  return filas.filter((f): f is [string, string] => Boolean(f[1])).map(([dato, valor]) => ({ dato, valor }))
}

// Lo que además sale arriba, en .datos (spec principal §9: datos duros arriba y en texto).
export function chipsVisita(v: VisitaPublica, lang: Locale, zonaNombre: string): string[] {
  return [textoEntrada(v, lang), textoTiempo(v, lang, zonaNombre)].filter((x): x is string => Boolean(x))
}

export const tieneVisita = (v: VisitaPublica): boolean =>
  Boolean(v.entradaGratis || v.costoEntrada || v.minutosDesdeZona || v.comoLlegar || v.servicios.length || v.mejorHora)
