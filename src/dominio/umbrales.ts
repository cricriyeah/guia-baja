// Spec §7: una combinación zona × categoría tiene página con ≥ 1 lugar y se indexa con ≥ 3 (contados por idioma).
export const UMBRAL_PAGINA = 1
export const UMBRAL_INDEXABLE = 3

export const combinacionTienePagina = (conteo: number): boolean => conteo >= UMBRAL_PAGINA
export const combinacionIndexable = (conteo: number): boolean => conteo >= UMBRAL_INDEXABLE
