// Características de los lugares para el filtro ?caracteristica= (spec §6 y §7). Lista cerrada en código.
export const CARACTERISTICAS = [
  { valor: 'para-ninos', es: 'Para niños', en: 'Kid-friendly' },
  { valor: 'con-comida', es: 'Con comida', en: 'Food available' },
  { valor: 'solo-con-tour', es: 'Solo con tour', en: 'Tour only' },
] as const

export type Caracteristica = (typeof CARACTERISTICAS)[number]['valor']
