import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ajustesPublicos } from '../../src/sitio/datos/lecturas/ajustes'
import { categorias } from '../../src/sitio/datos/lecturas/categorias'
import { mapaRedirecciones } from '../../src/sitio/datos/lecturas/redirecciones'
import { zonasActivas } from '../../src/sitio/datos/lecturas/zonas'
import { crearCategoria, crearZona, limpiar, obtenerPayload } from './utils'

let payload: Payload

describe('lecturas públicas del sitio', () => {
  beforeAll(async () => {
    payload = await obtenerPayload()
  })
  beforeEach(async () => {
    await limpiar(payload)
  })

  it('zonasActivas: solo activas y sin idioma de respaldo', async () => {
    await crearZona(payload, { slug: 'activa-x', nombre: 'Activa', activa: true })
    await crearZona(payload, { slug: 'inactiva-x', nombre: 'Inactiva', activa: false })
    expect((await zonasActivas(payload, 'es')).map((z) => z.slug)).toEqual(['activa-x'])
    // crearZona solo pone el nombre en español: en inglés la zona no tiene nombre y no sale.
    expect(await zonasActivas(payload, 'en')).toEqual([])
  })

  it('categorias: slug y nombre del idioma pedido', async () => {
    await crearCategoria(payload, { es: 'playas-x', en: 'beaches-x', grupo: 'mar' })
    expect((await categorias(payload, 'en')).map((c) => [c.slug, c.claseGrupo])).toEqual([['beaches-x', 'g-mar']])
  })

  it('ajustesPublicos nunca trae correosAviso', async () => {
    await payload.updateGlobal({
      slug: 'ajustes-guia',
      data: { correosAviso: [{ correo: 'equipo@prueba.test' }], correoPrivacidad: 'privacidad@prueba.test' },
      overrideAccess: true,
    })
    const a = await ajustesPublicos(payload, 'es')
    expect(a.correoPrivacidad).toBe('privacidad@prueba.test')
    expect(JSON.stringify(a)).not.toContain('equipo@prueba.test')
  })

  it('mapaRedirecciones: de la ruta vieja a la nueva', async () => {
    await payload.create({
      collection: 'redirects',
      data: { from: '/es/guia/viejo', to: { type: 'custom', url: '/es/guia/nuevo' }, type: '308' },
      overrideAccess: true,
    })
    expect(await mapaRedirecciones(payload)).toEqual({ '/es/guia/viejo': '/es/guia/nuevo' })
  })

  it('una redirección hacia un documento (reference) se rechaza', async () => {
    await expect(
      payload.create({
        collection: 'redirects',
        data: { from: '/es/guia/x', to: { type: 'reference', reference: { relationTo: 'lugares', value: 1 } }, type: '308' },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/solo aceptan una ruta/)
  })
})
