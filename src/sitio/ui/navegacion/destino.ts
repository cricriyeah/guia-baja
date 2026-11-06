import { esLocale } from '../../../dominio/idioma'
import { SEGMENTOS } from '../../../dominio/rutas'

export type Destino = 'portada' | 'zona' | 'categoriaEnZona' | 'categoria' | 'eventos' | 'evento' | 'lugar' | 'articulo' | 'privacidad'

// Qué esqueleto corresponde a un link, o null si ese link no navega dentro de la Guía: otro sitio, el sitio de reservas
// (mismo dominio tras el rewrite), otro idioma (cambia el layout raíz y recarga), páginas sin esqueleto, o solo la
// consulta de la misma página, que es asunto de TransicionFiltros.
export function destinoDe(href: string, actual: string): Destino | null {
  const a = new URL(actual)
  const d = new URL(href, actual)
  if (d.origin !== a.origin || d.pathname === a.pathname) return null
  const [lang, guia, ...resto] = d.pathname.split('/').filter(Boolean)
  if (!esLocale(lang) || guia !== SEGMENTOS[lang].guia || a.pathname.split('/')[1] !== lang) return null
  const s = SEGMENTOS[lang]
  const [primero] = resto
  if (resto.length === 0) return 'portada'
  if (primero === s.eventos) return resto.length === 1 ? 'eventos' : resto.length === 2 ? 'evento' : null
  if (primero === s.privacidad) return resto.length === 1 ? 'privacidad' : null
  if (primero === s.negocios || primero === s.buscar) return null
  if (resto.length === 1) return 'zona'
  if (resto.length !== 2) return null
  if (primero === s.lugares) return 'lugar'
  if (primero === s.articulos) return 'articulo'
  if (primero === s.categoria) return 'categoria'
  return 'categoriaEnZona'
}

// ¿El link cambia solo la consulta de la página actual? Son los chips de filtro y la paginación.
export function esCambioDeConsulta(href: string, actual: string): boolean {
  const a = new URL(actual)
  const d = new URL(href, actual)
  return d.origin === a.origin && d.pathname === a.pathname && d.search !== a.search
}

type Clic = Pick<MouseEvent, 'target' | 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'defaultPrevented'>

// El link de un clic que el navegador abriría en esta misma pestaña. Con Ctrl, Cmd o Mayús se abre donde el usuario pidió.
export function linkDeClic(e: Clic): HTMLAnchorElement | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null
  const link = (e.target as Element | null)?.closest?.('a') ?? null
  if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return null
  return link
}
