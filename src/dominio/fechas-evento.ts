import { diaEnMazatlan, ZONA_HORARIA } from './fechas'
import { CODIGO_REGIONAL, type Locale } from './idioma'

// Única constante de la zona horaria de BCS (ruling C11): se define en fechas.ts y se reexporta aquí.
export { ZONA_HORARIA }

const sinPunto = (s: string) => s.replace('.', '')

// Spec §6: las fechas de evento se muestran en America/Mazatlan. Reciben ISO (contrato JSON de la caché).
export function partesFecha(iso: string, lang: Locale) {
  const d = new Date(iso)
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(CODIGO_REGIONAL[lang], { timeZone: ZONA_HORARIA, ...o }).format(d)
  return {
    dia: f({ day: 'numeric' }),
    mes: sinPunto(f({ month: 'short' })),
    diaSemana: sinPunto(f({ weekday: 'short' })),
    hora: f({ hour: 'numeric', minute: '2-digit' }),
  }
}

// Fechas sueltas en la zona de la Baja (artículos, privacidad): una sola forma de armar el formato por idioma.
export const fechaLarga = (iso: string, lang: Locale): string =>
  new Intl.DateTimeFormat(CODIGO_REGIONAL[lang], { timeZone: ZONA_HORARIA, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
export const fechaCorta = (iso: string, lang: Locale): string =>
  new Intl.DateTimeFormat(CODIGO_REGIONAL[lang], { timeZone: ZONA_HORARIA, day: 'numeric', month: 'short' }).format(new Date(iso))
export const fechaCompleta = (fecha: Date, lang: Locale): string =>
  new Intl.DateTimeFormat(CODIGO_REGIONAL[lang], { timeZone: ZONA_HORARIA, dateStyle: 'long' }).format(fecha)
export const horaDelDia = (fecha: Date, lang: Locale): string =>
  new Intl.DateTimeFormat(CODIGO_REGIONAL[lang], { timeZone: ZONA_HORARIA, hour: 'numeric', minute: '2-digit' }).format(fecha)

export function rangoEvento(inicio: string, fin: string | null, lang: Locale): string {
  const a = partesFecha(inicio, lang)
  const base = `${a.diaSemana} ${a.dia} ${a.mes}, ${a.hora}`
  if (!fin) return base
  const b = partesFecha(fin, lang)
  const mismoDia = diaEnMazatlan(new Date(inicio)) === diaEnMazatlan(new Date(fin))
  return mismoDia ? `${base} – ${b.hora}` : `${base} – ${b.diaSemana} ${b.dia} ${b.mes}, ${b.hora}`
}
