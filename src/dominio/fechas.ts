export const ZONA_HORARIA = 'America/Mazatlan'
// BCS no usa horario de verano desde 2022: siempre UTC−7.
const DESFASE = '-07:00'

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
