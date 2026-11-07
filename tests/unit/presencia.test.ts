import { describe, expect, it } from 'vitest'

import { precioPorPersonaDesde, validarPaquetes, validarServicios } from '../../src/dominio/catalogo'
import { relacionadosVisibles, tipoDePagina, validarToursRelacionados, zonaDeTours } from '../../src/dominio/presencia'

const servicio = (extra: Record<string, unknown> = {}) => ({
  empresa_slug: 'sal-y-sol', nombre: 'Pesca', nombre_en: 'Fishing', slug: 'pesca', estrategia_precio: 'por_persona',
  precio_base: '1500.00', tipo_cambio_usd: '17.5000', activo: true, duracion: '6 h', duracion_en: '6 hrs', ...extra,
})
const paquete = (extra: Record<string, unknown> = {}) => ({
  sede_slug: 'la-paz', nombre: 'Paquete', nombre_en: 'Package', slug: 'paquete', precio_ancla: '900.00',
  tipo_cambio_usd: '17.5000', estrategia_precio: 'por_persona', activo: true, noches: 3, ...extra,
})

describe('validarToursRelacionados', () => {
  it('acepta vacío, null y hasta 3 claves con formato de catálogo', () => {
    expect(validarToursRelacionados(null)).toBe(true)
    expect(validarToursRelacionados([])).toBe(true)
    expect(validarToursRelacionados(['servicio:pesca', 'paquete:cinco-noches', 'servicio:ballenas'])).toBe(true)
  })
  it('rechaza más de 3, claves repetidas y formatos inválidos', () => {
    expect(validarToursRelacionados(['servicio:a', 'servicio:b', 'servicio:c', 'servicio:d'])).toMatch(/3/)
    expect(validarToursRelacionados(['servicio:a', 'servicio:a'])).toMatch(/repet/i)
    for (const mala of ['pesca', 'tour:pesca', 'servicio:', 'servicio:Pesca', 'servicio:pesca deportiva', 'paquete:--x']) {
      expect(validarToursRelacionados([mala])).not.toBe(true)
    }
    expect(validarToursRelacionados('servicio:pesca')).not.toBe(true)
  })
})

describe('relacionadosVisibles', () => {
  const tours = [{ clave: 'servicio:a' }, { clave: 'servicio:b' }, { clave: 'paquete:c' }]
  it('respeta el orden guardado e ignora claves que el catálogo ya no tiene', () => {
    expect(relacionadosVisibles(tours, ['paquete:c', 'servicio:vieja', 'servicio:a']).map((t) => t.clave)).toEqual(['paquete:c', 'servicio:a'])
  })
  it('sin claves o sin tours, lista vacía', () => {
    expect(relacionadosVisibles(tours, null)).toEqual([])
    expect(relacionadosVisibles(tours, undefined)).toEqual([])
    expect(relacionadosVisibles([], ['servicio:a'])).toEqual([])
  })
})

describe('precioPorPersonaDesde', () => {
  it('el más bajo entre servicios por persona; los paquetes no cuentan', () => {
    const items = [
      ...validarServicios([servicio({ slug: 'a', precio_base: '2000.00' }), servicio({ slug: 'b', precio_base: '1500.00' })]),
      ...validarPaquetes([paquete()]),
    ]
    expect(precioPorPersonaDesde(items, 'es')).toBe('$1,500')
    expect(precioPorPersonaDesde(items, 'en')).toBe('$86')
  })
  it('nunca compara con un precio por grupo, y sin precio por persona da null', () => {
    const items = validarServicios([servicio({ estrategia_precio: 'por_grupo', precio_base: '100.00' }), servicio({ slug: 'x', precio_base: null })])
    expect(precioPorPersonaDesde(items, 'es')).toBeNull()
    expect(precioPorPersonaDesde([], 'es')).toBeNull()
  })
  it('en inglés solo cuentan los tours que existen en inglés', () => {
    const items = validarServicios([servicio({ slug: 'a', precio_base: '1000.00', nombre_en: null }), servicio({ slug: 'b', precio_base: '1750.00' })])
    expect(precioPorPersonaDesde(items, 'es')).toBe('$1,000')
    expect(precioPorPersonaDesde(items, 'en')).toBe('$100')
  })
})

describe('tipoDePagina (árbol en español tras «guia»)', () => {
  it('ficha, formulario, privacidad y búsqueda', () => {
    expect(tipoDePagina(['lugares', 'cafe-duna'])).toBe('ficha')
    expect(tipoDePagina(['aparece-en-la-guia'])).toBe('formulario')
    expect(tipoDePagina(['privacidad'])).toBe('privacidad')
    expect(tipoDePagina(['buscar'])).toBe('busqueda')
  })
  it('filtrada solo en la variante --filtros de eventos y de categoría en todas las zonas', () => {
    expect(tipoDePagina(['eventos', '--filtros'])).toBe('filtrada')
    expect(tipoDePagina(['categoria', 'restaurantes', '--filtros'])).toBe('filtrada')
    expect(tipoDePagina(['eventos'])).toBe('otra')
    expect(tipoDePagina(['eventos', '--pagina', '2'])).toBe('otra')
    expect(tipoDePagina(['la-paz', 'restaurantes', '--filtros'])).toBe('otra')
  })
  it('lo demás es otra, incluido el 404 interno', () => {
    for (const s of [[], ['la-paz'], ['lugares', '--'], ['--'], ['articulos', 'x'], ['eventos', 'feria']]) expect(tipoDePagina(s)).toBe('otra')
  })
})

describe('zonaDeTours (regla única de zona, spec presencia §2.2)', () => {
  const laPaz = { id: 1, slug: 'la-paz', sedeSlug: 'la-paz' }
  const ventana = { id: 2, slug: 'la-ventana', sedeSlug: 'la-ventana' }
  const todosSantos = { id: 3, slug: 'todos-santos', sedeSlug: null }
  const zonas = [todosSantos, laPaz, ventana]

  it('1: en páginas filtradas y búsqueda manda el filtro ?zona= de una zona activa', () => {
    expect(zonaDeTours({ tipo: 'filtrada', filtroZona: 'la-ventana', zonaContexto: null, zonas })).toBe(ventana)
    expect(zonaDeTours({ tipo: 'busqueda', filtroZona: 'la-ventana', zonaContexto: null, zonas })).toBe(ventana)
  })
  it('el filtro se ignora en otras páginas y si no es una zona activa', () => {
    expect(zonaDeTours({ tipo: 'otra', filtroZona: 'la-ventana', zonaContexto: null, zonas })).toBe(laPaz)
    expect(zonaDeTours({ tipo: 'filtrada', filtroZona: 'no-existe', zonaContexto: null, zonas })).toBe(laPaz)
  })
  it('2: la zona del contexto', () => {
    expect(zonaDeTours({ tipo: 'otra', filtroZona: null, zonaContexto: ventana, zonas })).toBe(ventana)
  })
  it('3: sin zona, la zona principal (la primera activa con sede)', () => {
    expect(zonaDeTours({ tipo: 'otra', filtroZona: null, zonaContexto: null, zonas })).toBe(laPaz)
  })
  it('4: una zona concreta sin sede no salta a la principal: null («Tours en la Baja»)', () => {
    expect(zonaDeTours({ tipo: 'otra', filtroZona: null, zonaContexto: todosSantos, zonas })).toBeNull()
    expect(zonaDeTours({ tipo: 'filtrada', filtroZona: 'todos-santos', zonaContexto: null, zonas })).toBeNull()
    expect(zonaDeTours({ tipo: 'otra', filtroZona: null, zonaContexto: null, zonas: [todosSantos] })).toBeNull()
  })
})
