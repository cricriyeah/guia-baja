type Nodo = { type?: string; fields?: { blockType?: string; lugar?: unknown }; children?: Nodo[] }

const idDe = (valor: unknown): number | null => {
  if (typeof valor === 'number') return valor
  if (valor && typeof valor === 'object' && typeof (valor as { id?: unknown }).id === 'number') return (valor as { id: number }).id
  return null
}

// Ids de los lugares de los bloques «Tarjeta de lugar» de un cuerpo Lexical, sin repetir y en orden.
export function lugaresEnCuerpo(cuerpo: unknown): number[] {
  const ids: number[] = []
  const visitar = (nodo: Nodo | undefined) => {
    if (!nodo || typeof nodo !== 'object') return
    if (nodo.type === 'block' && nodo.fields?.blockType === 'tarjetaLugar') {
      const id = idDe(nodo.fields.lugar)
      if (id !== null && !ids.includes(id)) ids.push(id)
    }
    if (Array.isArray(nodo.children)) nodo.children.forEach(visitar)
  }
  visitar((cuerpo as { root?: Nodo } | null)?.root)
  return ids
}
