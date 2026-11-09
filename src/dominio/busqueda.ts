import { MAX_PATROCINIOS_ARRIBA } from './orden'
import { patrocinioVigente } from './patrocinio'
import { esSlugValido } from './slugs'

export const TIPOS_BUSQUEDA = ['lugar', 'evento', 'articulo', 'itinerario', 'tema', 'zona', 'categoria'] as const
export type TipoBusqueda = (typeof TIPOS_BUSQUEDA)[number]
const FILTRABLES = ['lugar', 'evento', 'articulo'] as const

export type FilaResultado = {
  tipo: TipoBusqueda
  docId: number
  slug: string
  titulo: string
  texto: string
  zonaIds: number[]
  categoriaIds: number[]
  inicio: string | null
  fin: string | null
  rank: number
  patrocinio: { activo: boolean; desde: string | null; hasta: string | null }
}

// Llave de caché y texto que se busca: el término llega de la URL y se muestra siempre como texto (spec §7).
export function limpiarTermino(q: string | null): string {
  // NFC primero (el resaltado compara posiciones); los controles (NUL incluido, que Postgres rechaza) cuentan como
  // espacio; se recorta otra vez tras el corte para no terminar en espacio.
  return (q ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
    .trim()
}

// Sugerencias por prefijo: solo letras y números del visitante; nunca su sintaxis de tsquery.
export function consultaPrefijo(q: string): string | null {
  const tokens = q.toLowerCase().match(/[\p{L}\p{N}]+/gu)
  if (!tokens?.length) return null
  return tokens.map((t, i) => (i === tokens.length - 1 ? `${t}:*` : t)).join(' & ')
}

export function leerConsultaBusqueda(p: URLSearchParams) {
  const tipo = p.get('tipo')
  const zona = p.get('zona')
  const pagina = /^[1-9]\d*$/.test(p.get('pagina') ?? '') ? Number(p.get('pagina')) : 1
  return {
    q: limpiarTermino(p.get('q')),
    tipo: (FILTRABLES as readonly string[]).includes(tipo ?? '') ? (tipo as (typeof FILTRABLES)[number]) : null,
    zona: zona && esSlugValido(zona) ? zona : null,
    pagina,
  }
}

// Spec §7: en cada grupo suben hasta 2 patrocinios vigentes (por desde); el resto va por relevancia.
// Se aplica a todo el grupo antes de paginar.
export function ordenarGrupo(filas: FilaResultado[], ahora: Date): FilaResultado[] {
  const tiempo = (v: string | null) => (v ? new Date(v).getTime() : 0)
  const arriba = filas
    .filter((f) => patrocinioVigente(f.patrocinio, ahora))
    .sort((a, b) => tiempo(a.patrocinio.desde) - tiempo(b.patrocinio.desde) || a.titulo.localeCompare(b.titulo, 'es'))
    .slice(0, MAX_PATROCINIOS_ARRIBA)
  const resto = filas.filter((f) => !arriba.includes(f)).sort((a, b) => b.rank - a.rank)
  return [...arriba, ...resto]
}

const plano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Resalta las palabras del término en el texto, sin importar acentos ni mayúsculas. React escapa cada parte.
export function partesResaltadas(texto: string, termino: string): { texto: string; coincide: boolean }[] {
  const palabras = (plano(termino).match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 1)
  if (!palabras.length) return [{ texto, coincide: false }]
  const base = plano(texto)
  const marcas = new Array<boolean>(texto.length).fill(false)
  for (const w of palabras) {
    let i = base.indexOf(w)
    while (i !== -1) {
      for (let k = i; k < i + w.length; k++) marcas[k] = true
      i = base.indexOf(w, i + w.length)
    }
  }
  const partes: { texto: string; coincide: boolean }[] = []
  for (let i = 0; i < texto.length; i++) {
    const ultima = partes[partes.length - 1]
    if (ultima && ultima.coincide === marcas[i]) ultima.texto += texto[i]
    else partes.push({ texto: texto[i], coincide: marcas[i] })
  }
  return partes
}
