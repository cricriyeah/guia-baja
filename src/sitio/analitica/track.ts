import { enviarEvento } from './adaptador'

// Spec §13: eventos y sus propiedades (máximo 2, lo que admite Vercel Web Analytics en Pro).
export const EVENTOS: Record<string, readonly string[]> = {
  tour_clic: ['zona', 'origen'],
  contacto_lugar: ['lugar', 'canal'],
  boletos_clic: ['evento'],
  solicitud_enviada: ['zona'],
}

export function track(evento: string, props: Record<string, string | undefined>): boolean {
  const permitidas = EVENTOS[evento]
  if (!permitidas) return false
  const limpio: Record<string, string> = {}
  for (const k of permitidas.slice(0, 2)) {
    const v = props[k]
    if (v) limpio[k] = v.slice(0, 100)
  }
  enviarEvento(evento, limpio)
  return true
}

// Los data-* que pone F3b en los links (data-zona, data-origen, data-lugar, data-canal, data-evento-slug).
export function propsDeElemento(evento: string, d: Record<string, string | undefined>): Record<string, string | undefined> {
  if (evento === 'tour_clic') return { zona: d.zona, origen: d.origen }
  if (evento === 'contacto_lugar') return { lugar: d.lugar, canal: d.canal }
  if (evento === 'boletos_clic') return { evento: d.eventoSlug }
  return {}
}
