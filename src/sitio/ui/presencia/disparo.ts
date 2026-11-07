// Cuándo aparece la tarjeta de tours (escritorio) o la fila extra de la barra (móvil). Spec de presencia §2.3.
// Sin E/S: el componente cliente junta el estado y pregunta.

export const ESPERA_MS = 5000
export const CLAVE_SESION = 'guia-tours-mostrada'

export type EstadoDisparo = {
  msEnPagina: number
  scrollY: number
  scrollHeight: number
  innerHeight: number
  salidaArriba: boolean
  escritorio: boolean
  capaAbierta: boolean
  yaMostrada: boolean
}

export function debeAparecer(e: EstadoDisparo): boolean {
  if (e.yaMostrada || e.capaAbierta || e.msEnPagina < ESPERA_MS) return false
  const recorrido = e.scrollHeight - e.innerHeight
  // En una página que no se puede bajar al menos un alto de pantalla, el disparador de scroll no existe.
  const aLaMitad = recorrido >= e.innerHeight && e.scrollY >= 0.5 * recorrido
  return aLaMitad || (e.escritorio && e.salidaArriba)
}

type Almacen = Pick<Storage, 'getItem' | 'setItem'> | null | undefined

// sessionStorage puede no existir o lanzar (modo privado, bloqueado): sin él, la tarjeta sale a lo más una vez por carga.
export function yaSeMostro(s: Almacen): boolean {
  try {
    return s?.getItem(CLAVE_SESION) === '1'
  } catch {
    return false
  }
}

export function marcarMostrada(s: Almacen): boolean {
  try {
    if (!s) return false
    s.setItem(CLAVE_SESION, '1')
    return true
  } catch {
    return false
  }
}
