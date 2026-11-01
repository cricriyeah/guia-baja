import { describe, expect, it } from 'vitest'

import { accesoSubidaDirecta, opcionesAlmacenamiento, pluginsAlmacenamiento } from '../../src/almacenamiento'

const r2 = {
  R2_ACCOUNT_ID: 'cuenta',
  R2_ACCESS_KEY_ID: 'llave',
  R2_SECRET_ACCESS_KEY: 'secreto',
  R2_BUCKET: 'guia-media',
  R2_PUBLIC_URL: 'https://img-guia.salysoltours.com/',
}

describe('almacenamiento', () => {
  it('siempre hay exactamente un plugin, con o sin R2 (mismo esquema e importMap)', () => {
    expect(pluginsAlmacenamiento({})).toHaveLength(1)
    expect(pluginsAlmacenamiento(r2)).toHaveLength(1)
  })

  it('sin R2_BUCKET el adaptador queda desactivado pero inserta los mismos campos', () => {
    const o = opcionesAlmacenamiento({})
    expect(o.enabled).toBe(false)
    expect(o.alwaysInsertFields).toBe(true)
    expect(o.clientUploads).toEqual({ access: accesoSubidaDirecta })
  })

  it('con R2 apunta al endpoint de la cuenta y sirve desde la URL pública', async () => {
    const o = opcionesAlmacenamiento(r2)
    expect(o.enabled).toBe(true)
    expect(o.bucket).toBe('guia-media')
    expect(o.config?.endpoint).toBe('https://cuenta.r2.cloudflarestorage.com')
    const media = o.collections.media
    expect(typeof media === 'object' && media.disablePayloadAccessControl).toBe(true)
    const url =
      typeof media === 'object' && media.generateFileURL
        ? await media.generateFileURL({
            filename: 'foto.webp',
            prefix: '',
            collection: {} as never,
            size: undefined,
          } as never)
        : ''
    expect(url).toBe('https://img-guia.salysoltours.com/foto.webp')
  })

  it('con bucket pero sin URL pública falla al arrancar', () => {
    expect(() => opcionesAlmacenamiento({ ...r2, R2_PUBLIC_URL: '' })).toThrow(/R2_PUBLIC_URL/)
  })

  describe('acceso a subidas directas', () => {
    const con = (user: unknown) => accesoSubidaDirecta({ req: { user } as never })

    it('deja pedir URL firmada solo al personal', () => {
      expect(con({ rol: 'admin' })).toBe(true)
      expect(con({ rol: 'editor' })).toBe(true)
    })

    it('niega a anónimos y a usuarios autenticados sin rol', () => {
      expect(con(null)).toBe(false)
      expect(con(undefined)).toBe(false)
      expect(con({ rol: null })).toBe(false)
      expect(con({})).toBe(false)
      expect(con({ rol: 'otro' })).toBe(false)
    })

    it('es el que usa el adaptador, con y sin R2', () => {
      for (const env of [{}, r2]) {
        const c = opcionesAlmacenamiento(env).clientUploads
        expect(typeof c === 'object' && c.access).toBe(accesoSubidaDirecta)
      }
    })
  })
})
