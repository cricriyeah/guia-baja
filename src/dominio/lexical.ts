import { textoDeLexical } from './idioma'
import { slugify } from './slugs'

type NodoLexical = {
  type?: string
  tag?: string
  value?: unknown
  relationTo?: string
  fields?: Record<string, unknown> & { blockType?: string }
  children?: NodoLexical[]
}

export const idDe = (valor: unknown): number | null => {
  if (typeof valor === 'number') return valor
  if (valor && typeof valor === 'object' && typeof (valor as { id?: unknown }).id === 'number') return (valor as { id: number }).id
  return null
}

function recorrer(cuerpo: unknown, visitar: (n: NodoLexical) => void) {
  const ir = (n: NodoLexical | undefined) => {
    if (!n || typeof n !== 'object') return
    visitar(n)
    if (Array.isArray(n.children)) n.children.forEach(ir)
  }
  ir((cuerpo as { root?: NodoLexical } | null)?.root)
}

// Ids de los lugares de los bloques «Tarjeta de lugar» de un cuerpo Lexical, sin repetir y en orden.
export function lugaresEnCuerpo(cuerpo: unknown): number[] {
  const ids: number[] = []
  recorrer(cuerpo, (nodo) => {
    if (nodo.type === 'block' && nodo.fields?.blockType === 'tarjetaLugar') {
      const id = idDe(nodo.fields.lugar)
      if (id !== null && !ids.includes(id)) ids.push(id)
    }
  })
  return ids
}

const sinRepetir = (xs: number[]) => [...new Set(xs)]

// Ids que el cuerpo menciona: se resuelven contra las listas cacheadas del idioma (plan F3b, «Cuerpos Lexical»).
export function idsEnCuerpo(cuerpo: unknown) {
  const eventos: number[] = []
  const media: number[] = []
  const enlaces: { relationTo: string; id: number }[] = []
  recorrer(cuerpo, (n) => {
    if (n.type === 'block' && n.fields?.blockType === 'tarjetaEvento') {
      const id = idDe(n.fields.evento)
      if (id !== null) eventos.push(id)
    }
    if (n.type === 'upload') {
      const id = idDe(n.value)
      if (id !== null) media.push(id)
    }
    if (n.type === 'link' && n.fields?.linkType === 'internal') {
      const doc = n.fields.doc as { relationTo?: string; value?: unknown } | undefined
      const id = idDe(doc?.value)
      if (doc?.relationTo && id !== null) enlaces.push({ relationTo: doc.relationTo, id })
    }
  })
  return { lugares: lugaresEnCuerpo(cuerpo), eventos: sinRepetir(eventos), media: sinRepetir(media), enlaces }
}

// h2 con ids únicos: los usan el índice «En este artículo» y CuerpoRico, así que siempre coinciden.
export function encabezadosDe(cuerpo: unknown): { id: string; texto: string }[] {
  const vistos = new Map<string, number>()
  const salida: { id: string; texto: string }[] = []
  recorrer(cuerpo, (n) => {
    if (n.type !== 'heading' || n.tag !== 'h2') return
    const texto = textoDeLexical(n).trim()
    const base = slugify(texto) || 'seccion'
    const veces = (vistos.get(base) ?? 0) + 1
    vistos.set(base, veces)
    salida.push({ id: veces === 1 ? base : `${base}-${veces}`, texto })
  })
  return salida
}

export function preguntasDe(cuerpo: unknown): { pregunta: string; respuesta: string }[] {
  const salida: { pregunta: string; respuesta: string }[] = []
  recorrer(cuerpo, (n) => {
    if (n.type === 'block' && n.fields?.blockType === 'preguntasFrecuentes' && Array.isArray(n.fields.preguntas)) {
      for (const q of n.fields.preguntas as { pregunta?: string; respuesta?: string }[]) {
        if (q.pregunta && q.respuesta) salida.push({ pregunta: q.pregunta, respuesta: q.respuesta })
      }
    }
  })
  return salida
}
