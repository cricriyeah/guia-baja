// tests/unit/cachear.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const unstableCache = vi.hoisted(() => vi.fn((fn: () => unknown) => fn))
vi.mock('next/cache', () => ({ unstable_cache: unstableCache }))
vi.mock('../../src/sitio/datos/payload', () => ({ obtenerPayload: async () => ({}) }))

describe('cachear: versión de despliegue en la llave', () => {
  beforeEach(() => {
    unstableCache.mockClear()
    vi.stubEnv('VERCEL_DEPLOYMENT_ID', '')
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '')
  })
  afterEach(() => vi.unstubAllEnvs())

  async function llaveUsada() {
    const { cachear } = await import('../../src/sitio/datos/cacheadas')
    await cachear(async () => 1, () => ({ llave: ['zonasActivas', 'es'], etiquetas: ['t'] }))()
    const [, partes, opciones] = unstableCache.mock.calls[0] as unknown as [unknown, string[], { tags: string[] }]
    return { partes, opciones }
  }

  it('sin variables de Vercel, la llave empieza con «local» y las etiquetas no cambian', async () => {
    const { partes, opciones } = await llaveUsada()
    expect(partes).toEqual(['local', 'zonasActivas', 'es'])
    expect(opciones.tags).toEqual(['t'])
  })

  it('con VERCEL_DEPLOYMENT_ID se usa ese valor, aunque haya SHA', async () => {
    vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_123')
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'abc')
    expect((await llaveUsada()).partes[0]).toBe('dpl_123')
  })

  it('sin deployment id, usa el SHA del commit', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'abc')
    expect((await llaveUsada()).partes[0]).toBe('abc')
  })
})
