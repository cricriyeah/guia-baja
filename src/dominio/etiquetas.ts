type Id = number | string

// Etiquetas de caché (spec §10). zonas, categorias y media son de colección: las llevan las lecturas
// por slug y las listas, cuyo resultado puede cambiar sin que cambie su llave (plan F3a).
export const etiqueta = {
  lugar: (id: Id) => `lugar:${id}`,
  evento: (id: Id) => `evento:${id}`,
  articulo: (id: Id) => `articulo:${id}`,
  zona: (id: Id) => `zona:${id}`,
  categoria: (id: Id) => `categoria:${id}`,
  textos: (zona: Id, categoria: Id) => `textos:${zona}:${categoria}`,
  catalogo: (sedeSlug: string) => `catalogo:${sedeSlug}`,
  listados: 'listados',
  zonas: 'zonas',
  categorias: 'categorias',
  media: 'media',
  redirecciones: 'redirecciones',
  ajustes: 'ajustes',
  toursFotos: 'tours-fotos',
} as const

export type ColeccionRevalidable =
  | 'lugares' | 'eventos' | 'articulos' | 'zonas' | 'categorias'
  | 'textos-zona-categoria' | 'fotos-tours' | 'media' | 'redirects'

type Doc = Record<string, unknown> | null | undefined

const idDe = (v: unknown): Id | undefined => {
  const x = v && typeof v === 'object' ? (v as { id?: unknown }).id : v
  return typeof x === 'number' || typeof x === 'string' ? x : undefined
}
const ids = (v: unknown): Id[] => (Array.isArray(v) ? v : [v]).map(idDe).filter((x): x is Id => x !== undefined)

export function etiquetasDeCambio(coleccion: ColeccionRevalidable, doc: Doc, anterior: Doc): string[] {
  const docs = [doc, anterior].filter((d): d is Record<string, unknown> => Boolean(d))
  const de = (campo: string) => docs.flatMap((d) => ids(d[campo]))
  const t = new Set<string>()
  const agregar = (campo: string, f: (id: Id) => string) => de(campo).forEach((id) => t.add(f(id)))

  switch (coleccion) {
    case 'lugares':
      agregar('id', etiqueta.lugar)
      t.add(etiqueta.listados)
      agregar('zona', etiqueta.zona)
      agregar('categorias', etiqueta.categoria)
      break
    case 'eventos':
      agregar('id', etiqueta.evento)
      t.add(etiqueta.listados)
      agregar('zona', etiqueta.zona)
      agregar('categorias', etiqueta.categoria)
      agregar('lugar', etiqueta.lugar)
      break
    case 'articulos':
      agregar('id', etiqueta.articulo)
      t.add(etiqueta.listados)
      agregar('zonas', etiqueta.zona)
      agregar('categorias', etiqueta.categoria)
      agregar('lugaresCitados', etiqueta.lugar)
      break
    case 'zonas':
      agregar('id', etiqueta.zona)
      t.add(etiqueta.zonas)
      t.add(etiqueta.listados)
      break
    case 'categorias':
      agregar('id', etiqueta.categoria)
      t.add(etiqueta.categorias)
      t.add(etiqueta.listados)
      break
    case 'textos-zona-categoria':
      for (const d of docs) {
        const z = idDe(d.zona)
        const c = idDe(d.categoria)
        if (z !== undefined && c !== undefined) t.add(etiqueta.textos(z, c))
      }
      break
    case 'fotos-tours':
      t.add(etiqueta.toursFotos)
      break
    case 'media':
      t.add(etiqueta.media)
      break
    case 'redirects':
      t.add(etiqueta.redirecciones)
      break
  }
  return [...t].sort()
}
