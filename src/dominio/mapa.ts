// Spec del paquete 3 §2.4: solo el fallo del estilo es fatal. Una tesela, un sprite o un glifo no lo son.
export function clasificarErrorMapa(evento: { sourceId?: unknown; tile?: unknown }, estiloCargado: boolean): 'duro' | 'leve' {
  return !estiloCargado && evento.sourceId === undefined && evento.tile === undefined ? 'duro' : 'leve'
}

export type TourDePunto = { nombre: string; precio: string | null; href: string; zona: string }
export type PuntoMapa = { lng: number; lat: number; nombre: string; ruta?: string; tours?: TourDePunto[] }
