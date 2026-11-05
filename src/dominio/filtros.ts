import { CARACTERISTICAS } from './caracteristicas'
import { diaEnMazatlan } from './fechas'
import { abiertoAhora, type FilaHorario } from './horario'
import { esSlugValido } from './slugs'

export type Filtros = { precio?: string; abierto?: true; caracteristica?: string; zona?: string; desde?: string; hasta?: string }

const PRECIOS = ['$', '$$', '$$$', '$$$$']
const DIA = /^\d{4}-\d{2}-\d{2}$/

// Spec §7: parámetros de consulta; lo que no es de la lista cerrada se ignora (no rompe la página).
export function leerFiltros(params: URLSearchParams): Filtros {
  const f: Filtros = {}
  const precio = params.get('precio')
  if (precio && PRECIOS.includes(precio)) f.precio = precio
  if (params.get('abierto') === '1') f.abierto = true
  const c = params.get('caracteristica')
  if (c && CARACTERISTICAS.some((x) => x.valor === c)) f.caracteristica = c
  const zona = params.get('zona')
  if (zona && esSlugValido(zona)) f.zona = zona
  const desde = params.get('desde')
  if (desde && DIA.test(desde)) f.desde = desde
  const hasta = params.get('hasta')
  if (hasta && DIA.test(hasta)) f.hasta = hasta
  return f
}

export function consultaDeFiltros(f: Filtros): string {
  const q = new URLSearchParams()
  if (f.precio) q.set('precio', f.precio)
  if (f.abierto) q.set('abierto', '1')
  if (f.caracteristica) q.set('caracteristica', f.caracteristica)
  if (f.zona) q.set('zona', f.zona)
  if (f.desde) q.set('desde', f.desde)
  if (f.hasta) q.set('hasta', f.hasta)
  return q.toString()
}

export const hayFiltros = (f: Filtros): boolean => consultaDeFiltros(f) !== ''

type LugarFiltrable = { rangoPrecio: string | null; caracteristicas: string[]; zonaSlug: string; horario: FilaHorario[] }
type EventoFiltrable = { inicio: string; zonaSlug: string }

export function filtrarLugares<T extends LugarFiltrable>(xs: T[], f: Filtros, ahoraIso: string): T[] {
  const ahora = new Date(ahoraIso)
  return xs.filter(
    (l) =>
      (!f.precio || l.rangoPrecio === f.precio) &&
      (!f.caracteristica || l.caracteristicas.includes(f.caracteristica)) &&
      (!f.zona || l.zonaSlug === f.zona) &&
      (!f.abierto || abiertoAhora(l.horario, ahora) === true),
  )
}

export function filtrarEventos<T extends EventoFiltrable>(xs: T[], f: Filtros): T[] {
  return xs.filter((e) => {
    const dia = diaEnMazatlan(new Date(e.inicio))
    return (!f.zona || e.zonaSlug === f.zona) && (!f.desde || dia >= f.desde) && (!f.hasta || dia <= f.hasta)
  })
}
