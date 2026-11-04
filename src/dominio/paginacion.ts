export const POR_PAGINA = 24

// Spec §7: paginación con URL real; fuera de rango es 404 (null).
export function paginar<T>(items: T[], pagina: number, porPagina: number = POR_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina))
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > totalPaginas) return null
  return { items: items.slice((pagina - 1) * porPagina, pagina * porPagina), pagina, totalPaginas }
}

export const numeroDePagina = (seg: string): number | null => (/^[1-9]\d*$/.test(seg) ? Number(seg) : null)
