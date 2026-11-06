import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { selloDelProxy } from '../../src/dominio/origen'
import { proxy } from '../../src/proxy'

const pedir = (ruta: string, headers: Record<string, string> = {}) => proxy(new NextRequest(`https://guia.test${ruta}`, { headers }))
const reenviada = (res: Response, nombre: string) => res.headers.get(`x-middleware-request-${nombre}`)

describe('proxy de la Guía (spec §4.1)', () => {
  beforeEach(() => {
    process.env.GUIA_PROXY_SECRET = 's3cr3t'
  })
  afterEach(() => {
    delete process.env.GUIA_PROXY_SECRET
  })

  it('con el secreto: pública, sin X-Robots-Tag, y reenvía la IP del visitante', () => {
    const res = pedir('/es/guia', { 'x-guia-proxy': 's3cr3t', 'x-guia-ip': '1.2.3.4' })
    expect(res.headers.get('x-guia-origen')).toBe('publico')
    expect(res.headers.get('X-Robots-Tag')).toBeNull()
    expect(reenviada(res, 'x-guia-origen')).toBe('publico')
    expect(reenviada(res, 'x-guia-ip')).toBe('1.2.3.4')
  })

  it('secreto equivocado del mismo largo: directa, con noindex y sin confiar en x-guia-ip', () => {
    const res = pedir('/es/guia', { 'x-guia-proxy': 's3cr3X', 'x-guia-ip': '6.6.6.6', 'x-real-ip': '9.9.9.9' })
    expect(res.headers.get('x-guia-origen')).toBe('directo')
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
    expect(reenviada(res, 'x-guia-ip')).toBe('9.9.9.9')
  })

  it('cabecera de secreto vacía: directa', () => {
    const res = pedir('/es/guia', { 'x-guia-proxy': '' })
    expect(res.headers.get('x-guia-origen')).toBe('directo')
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
  })

  it('con el secreto vacío en el entorno, ni siquiera una cabecera vacía da pública', () => {
    process.env.GUIA_PROXY_SECRET = ''
    const res = pedir('/es/guia', { 'x-guia-proxy': '' })
    expect(res.headers.get('x-guia-origen')).toBe('directo')
  })

  it('pública sin x-guia-ip: no reenvía ninguna IP, aunque el cliente mande x-real-ip', () => {
    const res = pedir('/es/guia', { 'x-guia-proxy': 's3cr3t', 'x-real-ip': '9.9.9.9' })
    expect(res.headers.get('x-guia-origen')).toBe('publico')
    expect(reenviada(res, 'x-guia-ip')).toBeNull()
  })

  it('sin el secreto: directa con noindex, y sobrescribe la x-guia-ip que mandó el cliente', () => {
    const res = pedir('/es/guia', { 'x-guia-ip': '6.6.6.6', 'x-real-ip': '9.9.9.9' })
    expect(res.headers.get('x-guia-origen')).toBe('directo')
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
    expect(reenviada(res, 'x-guia-ip')).toBe('9.9.9.9')
    expect(reenviada(res, 'x-guia-origen')).toBe('directo')
  })

  it('nunca reenvía ni devuelve el secreto', () => {
    const res = pedir('/es/guia', { 'x-guia-proxy': 's3cr3t' })
    expect(reenviada(res, 'x-guia-proxy')).toBeNull()
    expect(res.headers.get('x-middleware-override-headers') ?? '').not.toContain('x-guia-proxy')
    expect(res.headers.get('x-guia-proxy')).toBeNull()
  })

  it('pone el sello derivado del secreto y pisa el que mande el cliente', () => {
    const res = pedir('/es/guia', { 'x-guia-sello': 'falso', 'x-guia-origen': 'publico', 'x-guia-ip': '6.6.6.6' })
    expect(reenviada(res, 'x-guia-sello')).toBe(selloDelProxy('s3cr3t'))
    expect(res.headers.get('x-guia-sello')).toBeNull()
  })

  it('también sella las reescrituras', () => {
    expect(reenviada(pedir('/en/guide/places/balandra'), 'x-guia-sello')).toBe(selloDelProxy('s3cr3t'))
  })

  it('sin secreto configurado no sella y borra el sello que mande el cliente', () => {
    delete process.env.GUIA_PROXY_SECRET
    const res = pedir('/es/guia', { 'x-guia-sello': selloDelProxy('s3cr3t') })
    expect(reenviada(res, 'x-guia-sello')).toBeNull()
    expect(res.headers.get('x-middleware-override-headers') ?? '').not.toContain('x-guia-sello')
  })

  it('reescribe el inglés al árbol en español', () => {
    const res = pedir('/en/guide/places/balandra')
    expect(res.headers.get('x-middleware-rewrite')).toBe('https://guia.test/en/guia/lugares/balandra')
  })

  it('una combinación cruzada se reescribe a la ruta de 404 del idioma de la URL', () => {
    expect(pedir('/en/guia/lugares/x').headers.get('x-middleware-rewrite')).toBe('https://guia.test/en/guia/--')
  })

  it('?pagina=1 redirige 308 a la URL sin el parámetro', () => {
    const res = pedir('/es/guia/eventos?pagina=1')
    expect(res.status).toBe(308)
    expect(new URL(res.headers.get('location') ?? '', 'https://guia.test').pathname).toBe('/es/guia/eventos')
  })

  it('?precio…&pagina=1 redirige 308 a la misma consulta sin pagina (no 200)', () => {
    const res = pedir('/es/guia/eventos?zona=la-paz&pagina=1')
    expect(res.status).toBe(308)
    const destino = new URL(res.headers.get('location') ?? '', 'https://guia.test')
    expect(destino.pathname).toBe('/es/guia/eventos')
    expect(destino.search).toBe('?zona=la-paz')
  })
})
