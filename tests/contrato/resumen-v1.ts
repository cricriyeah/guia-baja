// Esquema CONGELADO del contrato v1 (spec §8.2). Este archivo no se edita: un cambio incompatible es v2.
// Devuelve la lista de errores; vacía si la forma es exacta. Una clave de más también es error.

const ISO_CON_DESFASE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[-+]\d{2}:\d{2}$/
const ABSOLUTA = /^https?:\/\//

type Tipo = 'texto' | 'url' | 'url?' | 'fecha' | 'fecha?'

const vale: Record<Tipo, (v: unknown) => boolean> = {
  texto: (v) => typeof v === 'string',
  url: (v) => typeof v === 'string' && ABSOLUTA.test(v),
  'url?': (v) => v === null || (typeof v === 'string' && ABSOLUTA.test(v)),
  fecha: (v) => typeof v === 'string' && ISO_CON_DESFASE.test(v),
  'fecha?': (v) => v === null || (typeof v === 'string' && ISO_CON_DESFASE.test(v)),
}

const ZONA: Record<string, Tipo> = { nombre: 'texto', url: 'url' }
const ARTICULO: Record<string, Tipo> = { titulo: 'texto', resumen: 'texto', imagen: 'url?', url: 'url' }
const EVENTO: Record<string, Tipo> = { nombre: 'texto', inicio: 'fecha', fin: 'fecha?', imagen: 'url?', url: 'url' }

function objeto(v: unknown, forma: Record<string, Tipo>, ruta: string): string[] {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return [`${ruta}: no es un objeto`]
  const o = v as Record<string, unknown>
  const errores = Object.keys(o).filter((k) => !(k in forma)).map((k) => `${ruta}.${k}: clave de más`)
  for (const [k, tipo] of Object.entries(forma)) {
    if (!(k in o)) errores.push(`${ruta}.${k}: falta`)
    else if (!vale[tipo](o[k])) errores.push(`${ruta}.${k}: no es ${tipo}`)
  }
  return errores
}

function lista(v: unknown, forma: Record<string, Tipo>, ruta: string, maximo: number): string[] {
  if (!Array.isArray(v)) return [`${ruta}: no es una lista`]
  const errores = v.flatMap((x, i) => objeto(x, forma, `${ruta}[${i}]`))
  if (v.length > maximo) errores.push(`${ruta}: más de ${maximo}`)
  return errores
}

export function erroresResumenV1(v: unknown): string[] {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return ['raíz: no es un objeto']
  const o = v as Record<string, unknown>
  const errores = Object.keys(o).filter((k) => !['zona', 'articulos', 'eventos'].includes(k)).map((k) => `raíz.${k}: clave de más`)
  return [...errores, ...objeto(o.zona, ZONA, 'zona'), ...lista(o.articulos, ARTICULO, 'articulos', 3), ...lista(o.eventos, EVENTO, 'eventos', 3)]
}
