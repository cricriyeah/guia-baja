import { patrocinioVigente, type Patrocinio } from './patrocinio'

export const MAX_PATROCINIOS_ARRIBA = 2

export type Ordenable = {
  nombre: string
  orden?: number | null
  inicio?: string | null
  patrocinio?: Patrocinio | null
}

const porNombre = (a: Ordenable, b: Ordenable) => a.nombre.localeCompare(b.nombre, 'es')
const tiempo = (v: string | Date | null | undefined) => (v ? new Date(v).getTime() : 0)

// Spec §7, «Orden de los listados».
export function ordenarListado<T extends Ordenable>(items: T[], ahora: Date = new Date(), opciones: { porInicio?: boolean } = {}): T[] {
  const arriba = items
    .filter((i) => patrocinioVigente(i.patrocinio, ahora))
    .sort((a, b) => tiempo(a.patrocinio?.desde) - tiempo(b.patrocinio?.desde) || porNombre(a, b))
    .slice(0, MAX_PATROCINIOS_ARRIBA)
  const resto = items
    .filter((i) => !arriba.includes(i))
    .sort(
      opciones.porInicio
        ? (a, b) => tiempo(a.inicio) - tiempo(b.inicio) || porNombre(a, b)
        : (a, b) => (a.orden ?? 100) - (b.orden ?? 100) || porNombre(a, b),
    )
  return [...arriba, ...resto]
}
