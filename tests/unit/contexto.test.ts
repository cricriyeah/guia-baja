import { describe, expect, it, vi } from 'vitest'

const zona = (id: number, slug: string, nombre: string, sedeSlug: string | null = null) =>
  ({ id, slug, nombre, sedeSlug, descripcion: null, coordenadas: null, foto: null, orden: 1 })
const cat = (id: number, slug: string) => ({ id, slug, nombre: slug, grupo: 'mar', claseGrupo: 'g-mar', aplicaA: 'lugar', tipoSchema: 'Beach', orden: 1 })

vi.mock('../../src/sitio/datos/cacheadas', () => ({
  zonasActivasCacheadas: async (lang: string) =>
    lang === 'es' ? [zona(1, 'la-paz', 'La Paz', 'la-paz'), zona(2, 'solo-es', 'Solo ES')] : [zona(1, 'la-paz', 'La Paz', 'la-paz')],
  categoriasCacheadas: async (lang: string) => (lang === 'es' ? [cat(5, 'playas'), cat(6, 'solo-es')] : [cat(5, 'beaches')]),
  lugaresCacheados: async (lang: string) =>
    lang === 'es'
      ? [{ id: 1, slug: 'balandra', zonaId: 1, categoriaIds: [5] }, { id: 2, slug: 'solo-es', zonaId: 1, categoriaIds: [6] }]
      : [{ id: 1, slug: 'balandra-beach', zonaId: 1, categoriaIds: [5] }],
  eventosCacheados: async (lang: string) => (lang === 'es' ? [{ id: 7, slug: 'trova', zonaId: 1 }] : [{ id: 7, slug: 'trova-night', zonaId: 1 }]),
  articulosCacheados: async (lang: string) => (lang === 'es' ? [{ id: 8, slug: 'siete', zonaIds: [1] }] : []),
}))

const { contextoDe } = await import('../../src/sitio/contexto')

describe('contextoDe (spec §7: cambio de idioma y puente)', () => {
  it('portada y páginas fijas', async () => {
    expect(await contextoDe('es', [])).toEqual({ alterno: '/en/guide', zona: null })
    expect(await contextoDe('en', ['eventos'])).toEqual({ alterno: '/es/guia/eventos', zona: null })
    expect(await contextoDe('es', ['eventos', '--pagina', '2'])).toEqual({ alterno: '/en/guide/events', zona: null })
    expect(await contextoDe('es', ['privacidad'])).toEqual({ alterno: '/en/guide/privacy', zona: null })
  })

  it('zona y zona × categoría, con la zona para el puente', async () => {
    expect(await contextoDe('es', ['la-paz'])).toMatchObject({ alterno: '/en/guide/la-paz', zona: { slug: 'la-paz' } })
    expect((await contextoDe('es', ['la-paz', 'playas'])).alterno).toBe('/en/guide/la-paz/beaches')
    expect((await contextoDe('es', ['la-paz', 'solo-es'])).alterno).toBe('/en/guide/la-paz')
  })

  it('categoría en todas las zonas', async () => {
    expect((await contextoDe('es', ['categoria', 'playas'])).alterno).toBe('/en/guide/category/beaches')
    expect((await contextoDe('es', ['categoria', 'solo-es'])).alterno).toBe('/en/guide')
  })

  it('lo que no existe en el otro idioma va a su portada', async () => {
    expect(await contextoDe('es', ['solo-es'])).toMatchObject({ alterno: '/en/guide' })
    expect(await contextoDe('es', ['no-existe'])).toEqual({ alterno: '/en/guide', zona: null })
    expect(await contextoDe('es', ['--'])).toEqual({ alterno: '/en/guide', zona: null })
  })

  it('documentos: mismo documento en el otro idioma, con su zona', async () => {
    expect(await contextoDe('es', ['lugares', 'balandra'])).toMatchObject({ alterno: '/en/guide/places/balandra-beach', zona: { slug: 'la-paz' } })
    expect(await contextoDe('es', ['eventos', 'trova'])).toMatchObject({ alterno: '/en/guide/events/trova-night', zona: { slug: 'la-paz' } })
    expect(await contextoDe('es', ['articulos', 'siete'])).toMatchObject({ alterno: '/en/guide', zona: { slug: 'la-paz' } })
    expect(await contextoDe('es', ['lugares', 'no-existe'])).toEqual({ alterno: '/en/guide', zona: null })
  })

  it('zona × categoría sin lugares en el otro idioma cae a la zona', async () => {
    expect((await contextoDe('es', ['la-paz', 'playas'])).alterno).toBe('/en/guide/la-paz/beaches')
    // categoría 6 (solo-es) no tiene lugares en inglés ni slug en inglés: zona
    expect((await contextoDe('es', ['la-paz', 'solo-es'])).alterno).toBe('/en/guide/la-paz')
  })
})
