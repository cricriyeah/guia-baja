import { describe, expect, it, vi } from 'vitest'

const permanentRedirect = vi.fn((url: string) => {
  throw new Error(`308 ${url}`)
})
const notFound = vi.fn(() => {
  throw new Error('404')
})
vi.mock('next/navigation', () => ({ permanentRedirect: (u: string) => permanentRedirect(u), notFound: () => notFound() }))
vi.mock('../../src/sitio/datos/cacheadas', () => ({
  mapaRedireccionesCacheado: async () => ({ '/en/guide/places/viejo': '/en/guide/places/nuevo' }),
}))

const { noEncontrado } = await import('../../src/sitio/redirigir')

describe('noEncontrado: redirecciones antes del 404 (spec §6)', () => {
  it('arma la ruta pública desde el árbol y redirige 308', async () => {
    await expect(noEncontrado('en', ['lugares', 'viejo'])).rejects.toThrow('308 /en/guide/places/nuevo')
  })

  it('sin redirección, 404', async () => {
    await expect(noEncontrado('es', ['lugares', 'otro'])).rejects.toThrow('404')
  })
})
