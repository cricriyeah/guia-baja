import type { Grupo } from '../../dominio/grupos'
import type { Locale } from '../../dominio/idioma'
import type { Categoria, Media, Zona } from '../../payload-types'
import type { CategoriaPublica, Imagen, ZonaPublica } from './tipos'

export const CLASE_GRUPO: Record<Grupo, string> = {
  mar: 'g-mar',
  'aire-libre': 'g-aire',
  'comer-y-salir': 'g-comer',
  'lo-local': 'g-local',
}

const TAMANOS = ['s480', 's960', 's1600'] as const

// Spec §4.2: sin optimizador de Next; srcset con los tamaños que genera Payload.
export function imagenDe(media: unknown, lang: Locale): Imagen | null {
  if (!media || typeof media !== 'object') return null
  const m = media as Media
  if (!m.url) return null
  const tamanos = m.sizes ?? {}
  const srcset = TAMANOS.map((k) => tamanos[k])
    .filter((t): t is { url: string; width: number } => Boolean(t?.url && t.width))
    .map((t) => `${t.url} ${t.width}w`)
    .join(', ')
  return {
    src: tamanos.s960?.url ?? m.url,
    srcset,
    ancho: m.width ?? null,
    alto: m.height ?? null,
    alt: m.alt?.[lang] ?? '',
    credito: m.credito ?? null,
    og: tamanos.og?.url ?? null,
  }
}

export function zonaDe(z: Zona, lang: Locale): ZonaPublica | null {
  if (!z.nombre || !z.slug) return null
  return {
    id: z.id,
    slug: z.slug,
    nombre: z.nombre,
    descripcion: z.descripcion ?? null,
    sedeSlug: z.sedeSlug ?? null,
    coordenadas: z.coordenadas ?? null,
    foto: imagenDe(z.foto, lang),
    orden: z.orden ?? 100,
  }
}

export function categoriaDe(c: Categoria): CategoriaPublica | null {
  if (!c.nombre || !c.slug) return null
  return {
    id: c.id,
    slug: c.slug,
    nombre: c.nombre,
    grupo: c.grupo,
    claseGrupo: CLASE_GRUPO[c.grupo],
    aplicaA: c.aplicaA,
    tipoSchema: c.tipoSchema,
    orden: c.orden ?? 100,
  }
}
