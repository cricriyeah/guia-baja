import type { Locale } from './idioma'
import { enTemporada } from './temporada'

// Perfil de los tours para «¿Qué tour es para mí?» (spec del paquete 3 §2.1). Listas cerradas en código, como
// CARACTERISTICAS. Este módulo lo usa el módulo cliente del quiz: nada de imports de `sitio/`.
export const PARA_QUIEN = [
  { valor: 'pareja', es: 'En pareja', en: 'As a couple', motivoEs: 'Para parejas', motivoEn: 'For couples' },
  { valor: 'familia', es: 'En familia con niños', en: 'Family with kids', motivoEs: 'Para familias', motivoEn: 'For families' },
  { valor: 'amigos', es: 'Con amigos', en: 'With friends', motivoEs: 'Para amigos', motivoEn: 'For friends' },
  { valor: 'solo', es: 'Solo', en: 'On my own', motivoEs: 'Para ir solo', motivoEn: 'For solo travelers' },
] as const

export const GUSTOS = [
  { valor: 'mar-y-animales', es: 'Mar y animales', en: 'Sea and wildlife' },
  { valor: 'aventura', es: 'Aventura', en: 'Adventure' },
  { valor: 'playa-y-descanso', es: 'Playa y descanso', en: 'Beach and rest' },
  { valor: 'cultura-y-comida', es: 'Cultura y comida', en: 'Culture and food' },
] as const

export const JORNADAS = [
  { valor: 'medio-dia', es: 'Medio día', en: 'Half a day' },
  { valor: 'dia-completo', es: 'Un día completo', en: 'A full day' },
  { valor: 'varios-dias', es: 'Varios días', en: 'Several days' },
] as const

export const jornadaDe = (tipo: 'servicio' | 'paquete', jornada: string | null | undefined): string | null =>
  jornada ?? (tipo === 'paquete' ? 'varios-dias' : null)

export type Respuestas = { gusto: string; paraQuien?: string | null; jornada?: string | null }
export type TourPuntuable = { clave: string; gustos: readonly string[]; paraQuien: readonly string[]; jornada: string | null; meses: readonly number[] }
export type Etiquetas = { paraQuien: Record<string, string>; gustos: Record<string, string>; jornadas: Record<string, string>; temporada: string }

const coincidePara = (t: TourPuntuable, r: Respuestas) => Boolean(r.paraQuien) && t.paraQuien.includes(r.paraQuien as string)
const coincideJornada = (t: TourPuntuable, r: Respuestas) => Boolean(r.jornada) && t.jornada === r.jornada

// Hasta 2 tours del gusto elegido. `sort` es estable: un empate conserva el orden de toursDeSede. null: usar el respaldo.
export function puntuarTours<T extends TourPuntuable>(tours: readonly T[], r: Respuestas, mes: number): T[] | null {
  const puntos = (t: T) => Number(coincidePara(t, r)) + Number(coincideJornada(t, r)) + Number(enTemporada(t.meses, mes))
  const ganadores = tours.filter((t) => t.gustos.includes(r.gusto)).sort((a, b) => puntos(b) - puntos(a)).slice(0, 2)
  return ganadores.length ? ganadores : null
}

// Las tarjetas que el servidor deja ocultas: los primeros 12 con perfil más los 2 primeros de la sede (spec §2.2).
export function toursDelQuiz<T extends { clave: string; gustos: readonly string[] }>(tours: readonly T[]): { tarjetas: T[]; respaldo: string[] } | null {
  const conPerfil = tours.filter((t) => t.gustos.length > 0)
  if (conPerfil.length < 3) return null
  const respaldo = tours.slice(0, 2).map((t) => t.clave)
  const incluidos = new Set([...conPerfil.slice(0, 12).map((t) => t.clave), ...respaldo])
  return { tarjetas: tours.filter((t) => incluidos.has(t.clave)), respaldo }
}

export function etiquetasQuiz(lang: Locale): Etiquetas {
  const es = lang === 'es'
  const minusculas = (lista: readonly { valor: string; es: string; en: string }[]) =>
    Object.fromEntries(lista.map((o) => [o.valor, (es ? o.es : o.en).toLowerCase()]))
  return {
    paraQuien: Object.fromEntries(PARA_QUIEN.map((o) => [o.valor, es ? o.motivoEs : o.motivoEn])),
    gustos: minusculas(GUSTOS),
    jornadas: minusculas(JORNADAS),
    temporada: es ? 'en temporada' : 'in season',
  }
}

// La línea de por qué salió el tour. Solo nombra lo que de verdad coincide.
export function razonTour(t: TourPuntuable, r: Respuestas, mes: number, e: Etiquetas): string {
  const partes = [
    coincidePara(t, r) ? e.paraQuien[r.paraQuien as string] : null,
    e.gustos[r.gusto],
    coincideJornada(t, r) ? e.jornadas[r.jornada as string] : null,
    enTemporada(t.meses, mes) ? e.temporada : null,
  ].filter(Boolean).join(' · ')
  return partes.charAt(0).toUpperCase() + partes.slice(1)
}
