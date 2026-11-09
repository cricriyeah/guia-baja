import { idDe } from './lexical'

export const MAX_ENLACES_AUTOMATICOS = 10
const MIN_LETRAS = 4

export type CandidatoMencion = { id: number; nombres: string[]; enlazable: boolean }

type Nodo = { type?: string; text?: string; fields?: Record<string, unknown>; children?: Nodo[]; [k: string]: unknown }

// Un carácter por carácter, para que los índices del texto plegado sirvan en el original.
function plegar(texto: string): string {
  return Array.from(texto, (ch) => {
    const p = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    return p.length === ch.length ? p : ch
  }).join('')
}

const LETRA = /[\p{L}\p{N}]/u
const esMayuscula = (ch: string | undefined) => Boolean(ch) && ch !== ch!.toLocaleLowerCase() && ch === ch!.toLocaleUpperCase()

function recorrer(n: Nodo | undefined, visitar: (n: Nodo) => void) {
  if (!n || typeof n !== 'object') return
  visitar(n)
  n.children?.forEach((h) => recorrer(h, visitar))
}

function yaEnlazados(cuerpos: unknown[]): Set<number> {
  const ids = new Set<number>()
  for (const c of cuerpos) {
    recorrer((c as { root?: Nodo } | null)?.root, (n) => {
      if (n.type === 'link') {
        const f = n.fields as { linkType?: string; doc?: { relationTo?: string; value?: unknown } } | undefined
        const id = f?.linkType === 'internal' && f.doc?.relationTo === 'lugares' ? idDe(f.doc.value) : null
        if (id !== null) ids.add(id)
      }
      if (n.type === 'block' && n.fields?.blockType === 'tarjetaLugar') {
        const id = idDe(n.fields.lugar)
        if (id !== null) ids.add(id)
      }
    })
  }
  return ids
}

type Patron = { plegado: string; id: number }

function patronesDe(candidatos: CandidatoMencion[], bloqueados: Set<number>): Patron[] {
  const duenos = new Map<string, Set<number>>()
  for (const c of candidatos) {
    for (const nombre of c.nombres) {
      const p = plegar(nombre.trim())
      if (!p) continue
      duenos.set(p, (duenos.get(p) ?? new Set()).add(c.id))
    }
  }
  const patrones: Patron[] = []
  for (const c of candidatos) {
    if (!c.enlazable || bloqueados.has(c.id)) continue
    for (const nombre of c.nombres) {
      const plegado = plegar(nombre.trim())
      const letras = plegado.replace(/[^\p{L}\p{N}]/gu, '').length
      if (letras >= MIN_LETRAS && duenos.get(plegado)?.size === 1) patrones.push({ plegado, id: c.id })
    }
  }
  return patrones.sort((a, b) => b.plegado.length - a.plegado.length)
}

const nodoEnlace = (id: number, texto: Nodo): Nodo => ({
  type: 'link', version: 3, format: '', indent: 0, direction: null,
  fields: { linkType: 'internal', newTab: false, doc: { relationTo: 'lugares', value: id } },
  children: [texto],
})

// Enlaza la primera mención de cada lugar en una lista de cuerpos Lexical, en orden de lectura (spec del paquete 1 §2.6).
// Primera mención y máximo cuentan para toda la lista. No guarda nada: se aplica al pintar.
export function enlazarMenciones(cuerpos: unknown[], candidatos: CandidatoMencion[], opciones: { excluir?: readonly number[] } = {}): unknown[] {
  const bloqueados = yaEnlazados(cuerpos)
  opciones.excluir?.forEach((id) => bloqueados.add(id))
  const patrones = patronesDe(candidatos, bloqueados)
  const hechos = new Set<number>()

  const partir = (nodo: Nodo): Nodo[] => {
    const original = nodo.text ?? ''
    const plegado = plegar(original)
    const salida: Nodo[] = []
    let desde = 0
    let i = 0
    while (i < plegado.length && hechos.size < MAX_ENLACES_AUTOMATICOS) {
      const hallado = esMayuscula(original[i]) && !(i > 0 && LETRA.test(original[i - 1]))
        ? patrones.find((p) => !hechos.has(p.id) && plegado.startsWith(p.plegado, i) && !LETRA.test(original[i + p.plegado.length] ?? ''))
        : undefined
      if (!hallado) {
        i += 1
        continue
      }
      if (i > desde) salida.push({ ...nodo, text: original.slice(desde, i) })
      salida.push(nodoEnlace(hallado.id, { ...nodo, text: original.slice(i, i + hallado.plegado.length) }))
      hechos.add(hallado.id)
      i += hallado.plegado.length
      desde = i
    }
    if (!salida.length) return [nodo]
    if (desde < original.length) salida.push({ ...nodo, text: original.slice(desde) })
    return salida
  }

  const transformar = (nodo: Nodo): Nodo => {
    if (nodo.type === 'heading' || nodo.type === 'link' || nodo.type === 'autolink' || nodo.type === 'block' || !nodo.children) return nodo
    return { ...nodo, children: nodo.children.flatMap((h) => (h.type === 'text' ? partir(h) : [transformar(h)])) }
  }

  return cuerpos.map((c) => {
    const raiz = (c as { root?: Nodo } | null)?.root
    return raiz ? { ...(c as object), root: transformar(raiz) } : c
  })
}
