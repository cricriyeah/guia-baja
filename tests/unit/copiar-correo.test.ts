import { afterEach, describe, expect, it, vi } from 'vitest'

import { copiarAlPortapapeles } from '../../src/sitio/ui/CopiarCorreo'

describe('copiarAlPortapapeles', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('copia y avisa que lo logró', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await expect(copiarAlPortapapeles('a@b.test')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('a@b.test')
  })

  it('sin API de portapapeles (contexto no seguro) no lanza y no copia', async () => {
    vi.stubGlobal('navigator', {})
    await expect(copiarAlPortapapeles('a@b.test')).resolves.toBe(false)
  })

  it('con el permiso negado no lanza y no copia', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) } })
    await expect(copiarAlPortapapeles('a@b.test')).resolves.toBe(false)
  })
})
