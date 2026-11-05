import { ZONA_HORARIA } from './fechas'

// Los mismos valores que el select «dia» de Lugares.horario.
export const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const
export type FilaHorario = { dia: string; abre: string; cierra: string }
export type EstadoHorario = {
  abierto: boolean
  cambiaEnMin: number | null
  proximaApertura: { dia: number; min: number } | null
}

const CORTOS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const formato = new Intl.DateTimeFormat('en-US', { timeZone: ZONA_HORARIA, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

function ahoraEnBcs(ahora: Date): { dia: number; min: number } {
  const p = Object.fromEntries(formato.formatToParts(ahora).map((x) => [x.type, x.value]))
  return { dia: CORTOS.indexOf(p.weekday), min: Number(p.hour) * 60 + Number(p.minute) }
}
const aMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const indiceDia = (dia: string) => (DIAS as readonly string[]).indexOf(dia)

// Spec §6: varios tramos por día; un tramo con cierra ≤ abre pasa de medianoche; sin filas no se sabe (null).
export function estadoHorario(horario: FilaHorario[] | null | undefined, ahora: Date = new Date()): EstadoHorario | null {
  if (!horario?.length) return null
  const { dia, min } = ahoraEnBcs(ahora)
  for (const f of horario.filter((x) => indiceDia(x.dia) === dia)) {
    const abre = aMin(f.abre)
    const cierra = aMin(f.cierra)
    const fin = cierra <= abre ? cierra + 1440 : cierra
    if (min >= abre && min < fin) return { abierto: true, cambiaEnMin: fin - min, proximaApertura: null }
  }
  const ayer = (dia + 6) % 7
  for (const f of horario.filter((x) => indiceDia(x.dia) === ayer)) {
    const abre = aMin(f.abre)
    const cierra = aMin(f.cierra)
    if (cierra <= abre && min < cierra) return { abierto: true, cambiaEnMin: cierra - min, proximaApertura: null }
  }
  for (let d = 0; d < 8; d++) {
    const diaX = (dia + d) % 7
    const aperturas = horario
      .filter((x) => indiceDia(x.dia) === diaX)
      .map((x) => aMin(x.abre))
      .filter((m) => d > 0 || m > min)
      .sort((x, y) => x - y)
    if (aperturas.length) return { abierto: false, cambiaEnMin: d * 1440 + aperturas[0] - min, proximaApertura: { dia: diaX, min: aperturas[0] } }
  }
  return { abierto: false, cambiaEnMin: null, proximaApertura: null }
}

export function abiertoAhora(horario: FilaHorario[] | null | undefined, ahora: Date = new Date()): boolean | null {
  const e = estadoHorario(horario, ahora)
  return e ? e.abierto : null
}

export function horarioSemana(horario: FilaHorario[] | null | undefined) {
  return DIAS.map((dia) => ({
    dia: dia as string,
    tramos: (horario ?? [])
      .filter((f) => f.dia === dia)
      .map(({ abre, cierra }) => ({ abre, cierra }))
      .sort((x, y) => aMin(x.abre) - aMin(y.abre)),
  }))
}
