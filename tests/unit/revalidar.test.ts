import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.fn()
vi.mock('next/cache', () => ({ revalidateTag: (...a: unknown[]) => revalidateTag(...a) }))

const { revalidar } = await import('../../src/revalidacion/revalidar')

const req = (context: Record<string, unknown> = {}) => {
  const error = vi.fn()
  return { r: { context, payload: { logger: { error } } } as never, error }
}

describe('revalidar (spec §10)', () => {
  beforeEach(() => {
    revalidateTag.mockReset()
  })

  it('revalida cada etiqueta con expiración inmediata', () => {
    revalidar(['a', 'b'], req().r)
    expect(revalidateTag.mock.calls).toEqual([
      ['a', { expire: 0 }],
      ['b', { expire: 0 }],
    ])
  })

  it('no revalida con disableRevalidate', () => {
    revalidar(['a'], req({ disableRevalidate: true }).r)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('fuera del runtime de Next no registra nada', () => {
    revalidateTag.mockImplementation(() => {
      throw new Error('Invariant: static generation store missing in revalidateTag a')
    })
    const { r, error } = req()
    expect(() => revalidar(['a'], r)).not.toThrow()
    expect(error).not.toHaveBeenCalled()
  })

  it('cualquier otro error se registra y no rompe el guardado', () => {
    revalidateTag.mockImplementation(() => {
      throw new Error('falla')
    })
    const { r, error } = req()
    expect(() => revalidar(['a', 'b'], r)).not.toThrow()
    expect(error).toHaveBeenCalledTimes(2)
  })
})
