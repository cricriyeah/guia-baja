import { propsDeElemento, track } from './track'

// Lo que el listener necesita de un elemento: el ancestro con data-evento y su dataset (data-* de F3b).
export interface ElementoAnalitico {
  dataset: Record<string, string | undefined>
}
export interface Objetivo {
  closest(selector: string): ElementoAnalitico | null
}

export function eventoDeClic(objetivo: unknown): { evento: string; props: Record<string, string | undefined> } | null {
  if (!objetivo || typeof (objetivo as Objetivo).closest !== 'function') return null
  const el = (objetivo as Objetivo).closest('[data-evento]')
  const evento = el?.dataset.evento
  if (!el || !evento) return null
  return { evento, props: propsDeElemento(evento, { ...el.dataset }) }
}

// Un solo listener delegado en captura. Devuelve el cleanup: StrictMode monta, desmonta y vuelve a montar,
// y sin quitar el anterior cada clic contaría dos veces.
export function montarAnalitica(doc: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>): () => void {
  const alClic = (e: Event) => {
    const dato = eventoDeClic(e.target)
    if (dato) track(dato.evento, dato.props)
  }
  doc.addEventListener('click', alClic, { capture: true })
  return () => doc.removeEventListener('click', alClic, { capture: true })
}
