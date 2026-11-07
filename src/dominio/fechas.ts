export const ZONA_HORARIA = 'America/Mazatlan'
// BCS no usa horario de verano desde 2022: siempre UTC−7.
const DESFASE = '-07:00'
const DESFASE_MS = 7 * 60 * 60 * 1000

// El mismo instante, escrito con el desfase de BCS (contrato v1, spec §8.2).
export function isoEnMazatlan(valor: string): string {
  return `${new Date(new Date(valor).getTime() - DESFASE_MS).toISOString().slice(0, 19)}${DESFASE}`
}

const formatoDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function diaEnMazatlan(fecha: Date): string {
  return formatoDia.format(fecha)
}

export function inicioDelDiaMazatlan(fecha: Date | string): Date {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return new Date(`${diaEnMazatlan(d)}T00:00:00${DESFASE}`)
}

// Los campos «solo día» (dayOnly) de Payload 3.92.1 se guardan a mediodía UTC desde el panel y a 00:00Z desde la
// Local API («2026-11-01»). En ambos casos el día elegido es el día calendario UTC del valor guardado: leerlo con
// el huso de BCS (UTC−7) movería el 00:00Z al día anterior. Para instantes reales usar inicioDelDiaMazatlan.
export function inicioDelDiaGuardado(valor: Date | string): Date {
  const d = typeof valor === 'string' ? new Date(valor) : valor
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00${DESFASE}`)
}
