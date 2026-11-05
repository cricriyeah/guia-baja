import { diaEnMazatlan, ZONA_HORARIA } from './fechas'
import type { Locale } from './idioma'

// Única constante de la zona horaria de BCS (ruling C11): se define en fechas.ts y se reexporta aquí.
export { ZONA_HORARIA }

const CODIGO: Record<Locale, string> = { es: 'es-MX', en: 'en-US' }
const sinPunto = (s: string) => s.replace('.', '')

// Spec §6: las fechas de evento se muestran en America/Mazatlan. Reciben ISO (contrato JSON de la caché).
export function partesFecha(iso: string, lang: Locale) {
  const d = new Date(iso)
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(CODIGO[lang], { timeZone: ZONA_HORARIA, ...o }).format(d)
  return {
    dia: f({ day: 'numeric' }),
    mes: sinPunto(f({ month: 'short' })),
    diaSemana: sinPunto(f({ weekday: 'short' })),
    hora: f({ hour: 'numeric', minute: '2-digit' }),
  }
}

export function rangoEvento(inicio: string, fin: string | null, lang: Locale): string {
  const a = partesFecha(inicio, lang)
  const base = `${a.diaSemana} ${a.dia} ${a.mes}, ${a.hora}`
  if (!fin) return base
  const b = partesFecha(fin, lang)
  const mismoDia = diaEnMazatlan(new Date(inicio)) === diaEnMazatlan(new Date(fin))
  return mismoDia ? `${base} – ${b.hora}` : `${base} – ${b.diaSemana} ${b.dia} ${b.mes}, ${b.hora}`
}
