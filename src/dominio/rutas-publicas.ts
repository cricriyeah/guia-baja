import { LOCALES, type Locale } from './idioma'
import { SEGMENTOS } from './rutas'

export type AccionRuta =
  | { tipo: 'pasar' }
  | { tipo: 'reescribir'; destino: string }
  | { tipo: 'redirigir'; destino: string }
  | { tipo: 'noEncontrado'; lang: Locale }

// Segmentos internos: empiezan con «--», que ningún slug puede tener (dominio/slugs.ts, FORMATO).
export const SEGMENTO_NO_ENCONTRADO = '--'
export const SEGMENTO_PAGINA = '--pagina'
export const SEGMENTO_FILTROS = '--filtros'
export const FILTROS_LISTADO = ['precio', 'abierto', 'caracteristica', 'zona', 'desde', 'hasta'] as const

type Clave = Exclude<keyof (typeof SEGMENTOS)['es'], 'guia'>
const CLAVES = (Object.keys(SEGMENTOS.es) as (keyof (typeof SEGMENTOS)['es'])[]).filter((k): k is Clave => k !== 'guia')
const claveDe = (lang: Locale, seg: string): Clave | undefined => CLAVES.find((k) => SEGMENTOS[lang][k] === seg)
const otro = (lang: Locale): Locale => (lang === 'es' ? 'en' : 'es')
const esLocale = (v: string | undefined): v is Locale => (LOCALES as readonly string[]).includes(v ?? '')

// Spec §7: zona × categoría, categoría en todas las zonas y eventos (árbol en español).
function esListado(arbol: string[]): boolean {
  const [a] = arbol
  if (arbol.length === 1) return a === SEGMENTOS.es.eventos
  if (arbol.length !== 2) return false
  if (a === SEGMENTOS.es.categoria) return true
  return claveDe('es', a) === undefined
}

export function resolverRutaPublica(pathname: string, params: URLSearchParams): AccionRuta {
  const [lang, guia, ...resto] = pathname.split('/').filter(Boolean)
  if (!esLocale(lang)) return { tipo: 'pasar' }
  if (guia === SEGMENTOS[otro(lang)].guia) return { tipo: 'noEncontrado', lang }
  if (guia !== SEGMENTOS[lang].guia) return { tipo: 'pasar' }
  if (resto.some((s) => s.startsWith('--'))) return { tipo: 'noEncontrado', lang }

  const [primero, ...demas] = resto
  let arbol = resto
  if (primero !== undefined) {
    if (claveDe(otro(lang), primero) && !claveDe(lang, primero)) return { tipo: 'noEncontrado', lang }
    const clave = claveDe(lang, primero)
    if (clave) arbol = [SEGMENTOS.es[clave], ...demas]
  }
  const base = `/${lang}/guia${arbol.length ? `/${arbol.join('/')}` : ''}`
  const consulta = params.toString()

  if (esListado(arbol)) {
    if (FILTROS_LISTADO.some((f) => params.has(f))) {
      return { tipo: 'reescribir', destino: `${base}/${SEGMENTO_FILTROS}?${consulta}` }
    }
    const pagina = params.get('pagina')
    if (pagina !== null) {
      if (pagina === '1') {
        const otros = new URLSearchParams(params)
        otros.delete('pagina')
        const q = otros.toString()
        return { tipo: 'redirigir', destino: `/${lang}/${SEGMENTOS[lang].guia}${resto.length ? `/${resto.join('/')}` : ''}${q ? `?${q}` : ''}` }
      }
      if (!/^[1-9]\d*$/.test(pagina)) return { tipo: 'noEncontrado', lang }
      return { tipo: 'reescribir', destino: `${base}/${SEGMENTO_PAGINA}/${pagina}` }
    }
  }

  // En español sin cambios no hay nada que hacer; la diagonal final se quita para que el árbol reciba una sola forma.
  if (lang === 'es' && !pathname.endsWith('/')) return { tipo: 'pasar' }
  return { tipo: 'reescribir', destino: consulta ? `${base}?${consulta}` : base }
}

// Inversa: segmentos del árbol en español (después de «guia») → ruta pública del idioma.
export function rutaPublicaDesdeArbol(lang: Locale, segmentos: string[]): string {
  const [primero, ...demas] = segmentos
  const clave = primero === undefined ? undefined : claveDe('es', primero)
  const publicos = primero === undefined ? [] : [clave ? SEGMENTOS[lang][clave] : primero, ...demas]
  return `/${lang}/${SEGMENTOS[lang].guia}${publicos.length ? `/${publicos.join('/')}` : ''}`
}
