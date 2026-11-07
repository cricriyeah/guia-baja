import type { Payload } from 'payload'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { catalogoDeSede } from '../../src/sitio/datos/lecturas/catalogo'

const payload = {} as Payload
const servicio = {
  empresa_slug: 'sal-y-sol', nombre: 'Pesca', nombre_en: 'Fishing', slug: 'pesca', estrategia_precio: 'por_grupo',
  precio_base: '100.00', tipo_cambio_usd: '17.5', activo: true, duracion: '6 h', duracion_en: '6 h',
}
const respuesta = (json: unknown, status = 200) => new Response(JSON.stringify(json), { status })

describe('catalogoDeSede', () => {
  const llamar = vi.fn<typeof fetch>()
  beforeEach(() => {
    llamar.mockReset()
    vi.stubGlobal('fetch', llamar)
    vi.stubEnv('CATALOGO_API_URL', 'https://catalogo.invalid/')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('pide servicios y paquetes de la sede, con límite de 3 s', async () => {
    llamar.mockImplementation(async (url) => (String(url).includes('/servicios/') ? respuesta([servicio]) : respuesta([])))
    const items = await catalogoDeSede(payload, 'la-paz')
    expect(items.map((i) => i.slug)).toEqual(['pesca'])
    const urls = llamar.mock.calls.map((c) => String(c[0])).sort()
    expect(urls).toEqual(['https://catalogo.invalid/api/sedes/la-paz/paquetes/', 'https://catalogo.invalid/api/sedes/la-paz/servicios/'])
    expect(llamar.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('lanza si falta la URL del catálogo', async () => {
    vi.stubEnv('CATALOGO_API_URL', '')
    await expect(catalogoDeSede(payload, 'la-paz')).rejects.toThrow()
    expect(llamar).not.toHaveBeenCalled()
  })

  it('lanza si una de las dos llamadas no da 200', async () => {
    llamar.mockImplementation(async (url) => (String(url).includes('/servicios/') ? respuesta([servicio]) : respuesta({ detail: 'x' }, 404)))
    await expect(catalogoDeSede(payload, 'la-paz')).rejects.toThrow()
  })

  it('lanza si la llamada falla o tarda', async () => {
    llamar.mockRejectedValue(new DOMException('tiempo', 'TimeoutError'))
    await expect(catalogoDeSede(payload, 'la-paz')).rejects.toThrow()
  })

  it('lanza si la respuesta no pasa el esquema', async () => {
    llamar.mockResolvedValue(respuesta([{ slug: 'x' }]))
    await expect(catalogoDeSede(payload, 'la-paz')).rejects.toThrow()
  })
})
