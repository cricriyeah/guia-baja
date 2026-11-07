import type { Locale } from './idioma'
import { rutasReservas } from './rutas'
import { esSlugValido } from './slugs'

// Contrato Guía → catálogo (spec §8.1). Sin E/S: valida la respuesta y arma lo que pintan las tarjetas.

const ESTRATEGIAS = ['por_grupo', 'por_persona', 'tarifa_fija', 'por_noche', 'por_ruta'] as const
export type Estrategia = (typeof ESTRATEGIAS)[number]

const DECIMAL = /^\d+(\.\d+)?$/

type Base = {
  slug: string
  nombre: string
  nombreEn: string | null
  precioMxn: string | null
  tipoCambio: string
  estrategia: Estrategia
}
export type ItemCatalogo =
  | (Base & { tipo: 'servicio'; empresaSlug: string; duracion: string | null; duracionEn: string | null })
  | (Base & { tipo: 'paquete'; sedeSlug: string; noches: number | null })

export type PrecioDesde = { monto: string; moneda: 'MXN' | 'USD'; estrategia: Estrategia }
export type Tour = {
  clave: string
  tipo: ItemCatalogo['tipo']
  slug: string
  nombre: string
  precio: PrecioDesde | null
  duracion: string | null
  noches: number | null
  ruta: string
}

const invalido = (campo: string): never => {
  throw new Error(`Catálogo: respuesta inválida en ${campo}`)
}
const texto = (v: unknown, campo: string): string => (typeof v === 'string' && v.trim() ? v : invalido(campo))
const slug = (v: unknown, campo: string): string => (typeof v === 'string' && esSlugValido(v) ? v : invalido(campo))
// El catálogo puede mandar null o texto vacío en un campo opcional: los dos son «sin dato».
const opcional = (v: unknown, campo: string): string | null => {
  if (v === null || v === undefined || v === '') return null
  return typeof v === 'string' ? v : invalido(campo)
}
const decimal = (v: unknown, campo: string): string => (typeof v === 'string' && DECIMAL.test(v) ? v : invalido(campo))
const precio = (v: unknown, campo: string): string | null => (v === null || v === undefined ? null : decimal(v, campo))
const estrategia = (v: unknown): Estrategia =>
  (ESTRATEGIAS as readonly unknown[]).includes(v) ? (v as Estrategia) : invalido('estrategia_precio')

const fraccion = (d: string): { numerador: bigint; escala: bigint } => {
  const [entero, decimales = ''] = d.split('.')
  return { numerador: BigInt(entero + decimales), escala: 10n ** BigInt(decimales.length) }
}

const tipoCambio = (v: unknown): string => {
  const d = decimal(v, 'tipo_cambio_usd')
  return fraccion(d).numerador > 0n ? d : invalido('tipo_cambio_usd')
}

const lista = (json: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(json)) return invalido('la lista')
  return json.map((x) => (x && typeof x === 'object' ? (x as Record<string, unknown>) : invalido('un elemento')))
}

const base = (x: Record<string, unknown>, campoPrecio: string): Base => ({
  slug: slug(x.slug, 'slug'),
  nombre: texto(x.nombre, 'nombre'),
  nombreEn: opcional(x.nombre_en, 'nombre_en'),
  precioMxn: precio(x[campoPrecio], campoPrecio),
  tipoCambio: tipoCambio(x.tipo_cambio_usd),
  estrategia: estrategia(x.estrategia_precio),
})

export function validarServicios(json: unknown): ItemCatalogo[] {
  return lista(json).filter((x) => x.activo === true).map((x) => ({
    ...base(x, 'precio_base'),
    tipo: 'servicio' as const,
    empresaSlug: slug(x.empresa_slug, 'empresa_slug'),
    duracion: opcional(x.duracion, 'duracion'),
    duracionEn: opcional(x.duracion_en, 'duracion_en'),
  }))
}

export function validarPaquetes(json: unknown): ItemCatalogo[] {
  return lista(json).filter((x) => x.activo === true).map((x) => ({
    ...base(x, 'precio_ancla'),
    tipo: 'paquete' as const,
    sedeSlug: slug(x.sede_slug, 'sede_slug'),
    noches: typeof x.noches === 'number' ? x.noches : null,
  }))
}

// Igual que aMoneda del sitio de reservas: cada precio en pesos se redondea hacia arriba al dólar.
export function aDolares(mxn: string, cambio: string): number {
  const m = fraccion(mxn)
  const c = fraccion(cambio)
  const numerador = m.numerador * c.escala
  const divisor = m.escala * c.numerador
  return Number((numerador + divisor - 1n) / divisor)
}

const formato = (monto: number, moneda: 'MXN' | 'USD'): string =>
  new Intl.NumberFormat(moneda === 'USD' ? 'en-US' : 'es-MX', {
    style: 'currency', currency: moneda, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(monto)

function precioDesde(item: ItemCatalogo, lang: Locale): PrecioDesde | null {
  // El sitio de reservas cotiza por ruta: aquí no hay precio «desde» que mostrar.
  if (!item.precioMxn || item.estrategia === 'por_ruta') return null
  return lang === 'en'
    ? { monto: formato(aDolares(item.precioMxn, item.tipoCambio), 'USD'), moneda: 'USD', estrategia: item.estrategia }
    : { monto: formato(Number(item.precioMxn), 'MXN'), moneda: 'MXN', estrategia: item.estrategia }
}

// Sin idioma de respaldo (spec §6): un tour sin nombre en inglés no sale en inglés.
export function toursDe(items: ItemCatalogo[], lang: Locale): Tour[] {
  return items.flatMap((item): Tour[] => {
    const nombre = lang === 'en' ? item.nombreEn : item.nombre
    if (!nombre) return []
    const comun = { clave: `${item.tipo}:${item.slug}`, tipo: item.tipo, slug: item.slug, nombre, precio: precioDesde(item, lang) }
    return item.tipo === 'servicio'
      ? [{ ...comun, duracion: lang === 'en' ? item.duracionEn : item.duracion, noches: null, ruta: rutasReservas.servicio(lang, item.empresaSlug, item.slug) }]
      : [{ ...comun, duracion: null, noches: item.noches, ruta: rutasReservas.paquete(lang, item.sedeSlug, item.slug) }]
  })
}
