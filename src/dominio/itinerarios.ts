export type Parada = { hora: string | null; lugarId: number | null; tour: string | null; nota: string | null }
export type Dia = { titulo: string | null; paradas: Parada[] }

export function clavesDeItinerario(dias: Dia[]): string[] {
  return [...new Set(dias.flatMap((d) => d.paradas.flatMap((p) => (p.tour ? [p.tour] : []))))]
}

export function lugaresDeParadas(dias: Dia[]): number[] {
  return [...new Set(dias.flatMap((d) => d.paradas.flatMap((p) => (p.lugarId !== null ? [p.lugarId] : []))))]
}

export const paradaVisible = (p: { nota: string | null }, hayLugar: boolean, hayTour: boolean): boolean => hayLugar || hayTour || Boolean(p.nota)

// Spec del paquete 2 §2.2: solo se valida al guardar en español. En inglés una parada con nota sin traducir pasa: la
// página la oculta, y una corrección en otro campo no debe quedar bloqueada.
export function paradasValidas(dias: unknown, locale: string | undefined): true | string {
  if (locale !== 'es' || !Array.isArray(dias)) return true
  for (const d of dias as { paradas?: { lugar?: unknown; tour?: unknown; nota?: unknown }[] }[]) {
    for (const p of d.paradas ?? []) {
      if (!p.lugar && !p.tour && !p.nota) return 'Cada parada necesita un lugar, un tour o una nota.'
    }
  }
  return true
}
