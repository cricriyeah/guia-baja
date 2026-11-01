export const SLUGS_RESERVADOS_ZONA = [
  'lugares', 'places', 'eventos', 'events', 'articulos', 'articles', 'categoria', 'category',
  'aparece-en-la-guia', 'get-listed', 'privacidad', 'privacy',
] as const

const FORMATO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function esSlugValido(slug: string): boolean {
  return FORMATO.test(slug)
}

export function esSlugReservadoZona(slug: string): boolean {
  return (SLUGS_RESERVADOS_ZONA as readonly string[]).includes(slug)
}
