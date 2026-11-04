// Grupos de color de las categorías (docs/diseno/lineamientos.md, «Color por grupo de categorías»).
export const GRUPOS = [
  { valor: 'mar', es: 'Mar', en: 'Sea' },
  { valor: 'aire-libre', es: 'Aire libre', en: 'Outdoors' },
  { valor: 'comer-y-salir', es: 'Comer y salir', en: 'Eat and go out' },
  { valor: 'lo-local', es: 'Lo local', en: 'Local' },
] as const

export type Grupo = (typeof GRUPOS)[number]['valor']
