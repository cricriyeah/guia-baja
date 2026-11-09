import type { Locale } from './idioma'

export const MESES = [
  { valor: 1, es: 'enero', en: 'January' }, { valor: 2, es: 'febrero', en: 'February' },
  { valor: 3, es: 'marzo', en: 'March' }, { valor: 4, es: 'abril', en: 'April' },
  { valor: 5, es: 'mayo', en: 'May' }, { valor: 6, es: 'junio', en: 'June' },
  { valor: 7, es: 'julio', en: 'July' }, { valor: 8, es: 'agosto', en: 'August' },
  { valor: 9, es: 'septiembre', en: 'September' }, { valor: 10, es: 'octubre', en: 'October' },
  { valor: 11, es: 'noviembre', en: 'November' }, { valor: 12, es: 'diciembre', en: 'December' },
] as const

// El mes actual en BCS (spec del paquete 1 §2.4). Mazatlán y La Paz comparten huso.
export function mesEnBCS(ahora: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mazatlan', month: 'numeric' }).format(ahora))
}

export const enTemporada = (meses: readonly number[], mes: number): boolean => meses.includes(mes)

const siguiente = (m: number) => (m === 12 ? 1 : m + 1)
const anterior = (m: number) => (m === 1 ? 12 : m - 1)

// [11,12,1] → «noviembre a enero»; [1,2,7] → «enero a febrero y julio». Diciembre sigue a enero.
export function mesesATexto(meses: readonly number[], lang: Locale): string | null {
  const unicos = [...new Set(meses)].sort((a, b) => a - b)
  if (!unicos.length) return null
  if (unicos.length === 12) return lang === 'es' ? 'todo el año' : 'all year'
  const nombre = (m: number) => MESES[m - 1][lang]
  const rangos = unicos.filter((m) => !unicos.includes(anterior(m))).map((inicio) => {
    let fin = inicio
    while (unicos.includes(siguiente(fin))) fin = siguiente(fin)
    return fin === inicio ? nombre(inicio) : `${nombre(inicio)} ${lang === 'es' ? 'a' : 'to'} ${nombre(fin)}`
  })
  const y = lang === 'es' ? 'y' : 'and'
  return rangos.length === 1 ? rangos[0] : `${rangos.slice(0, -1).join(', ')} ${y} ${rangos[rangos.length - 1]}`
}

// Primero los de temporada; dentro de cada grupo, el orden que traían.
export function ordenarPorTemporada<T extends { meses: readonly number[] }>(tours: T[], mes: number): T[] {
  return [...tours.filter((t) => enTemporada(t.meses, mes)), ...tours.filter((t) => !enTemporada(t.meses, mes))]
}

type DatosRegistro = { foto?: unknown; meses?: unknown[] | null; temporada?: string | null }

// Un registro de «Fotos y temporadas de tours» tiene que aportar algo. Solo se rechaza al guardar en español: `temporada`
// está localizada y en inglés no se ve el valor en español. Se evalúa sobre { ...originalDoc, ...data }.
export function registroTourConDatos(datos: DatosRegistro, locale: string | undefined): boolean {
  if (locale !== 'es') return true
  return Boolean(datos.foto) || (datos.meses?.length ?? 0) > 0 || Boolean(datos.temporada?.trim())
}
