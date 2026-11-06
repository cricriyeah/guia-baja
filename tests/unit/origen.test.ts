import { describe, expect, it } from 'vitest'

import { origenDePeticion, origenReenviado, selloDelProxy } from '../../src/dominio/origen'

const h = (o: Record<string, string>) => new Headers(o)

describe('origenDePeticion (spec §4.1)', () => {
  it('es pública con el secreto correcto y toma la IP de x-guia-ip', () => {
    expect(origenDePeticion(h({ 'x-guia-proxy': 's3cr3t', 'x-guia-ip': '1.2.3.4', 'x-real-ip': '9.9.9.9' }), 's3cr3t')).toEqual({
      tipo: 'publico',
      ip: '1.2.3.4',
    })
  })

  it('es directa con un secreto inválido y toma x-real-ip', () => {
    expect(origenDePeticion(h({ 'x-guia-proxy': 'otro', 'x-guia-ip': '1.2.3.4', 'x-real-ip': '9.9.9.9' }), 's3cr3t')).toEqual({
      tipo: 'directo',
      ip: '9.9.9.9',
    })
  })

  it('un secreto distinto del mismo largo es directo (compara contenido, no solo largo)', () => {
    expect(origenDePeticion(h({ 'x-guia-proxy': 's3cr3X', 'x-guia-ip': '1.2.3.4', 'x-real-ip': '9.9.9.9' }), 's3cr3t')).toEqual({
      tipo: 'directo',
      ip: '9.9.9.9',
    })
  })

  it('una cabecera vacía nunca coincide, ni con un secreto configurado', () => {
    expect(origenDePeticion(h({ 'x-guia-proxy': '' }), 's3cr3t').tipo).toBe('directo')
  })

  it('pública sin x-guia-ip: IP nula, sin caer a x-real-ip', () => {
    expect(origenDePeticion(h({ 'x-guia-proxy': 's3cr3t', 'x-real-ip': '9.9.9.9' }), 's3cr3t')).toEqual({ tipo: 'publico', ip: null })
  })

  it('es directa sin la cabecera', () => {
    expect(origenDePeticion(h({ 'x-real-ip': '9.9.9.9' }), 's3cr3t').tipo).toBe('directo')
  })

  it('nunca es pública si el secreto no está configurado', () => {
    expect(origenDePeticion(h({ 'x-guia-proxy': '' }), '').tipo).toBe('directo')
    expect(origenDePeticion(h({ 'x-guia-proxy': 'x' }), undefined).tipo).toBe('directo')
  })

  it('toma solo la primera IP de una lista y devuelve null si no hay', () => {
    expect(origenDePeticion(h({ 'x-real-ip': '5.5.5.5, 6.6.6.6' }), 's').ip).toBe('5.5.5.5')
    expect(origenDePeticion(h({}), 's').ip).toBeNull()
  })
})

describe('selloDelProxy', () => {
  it('sale del secreto, es estable y nunca es el secreto', () => {
    expect(selloDelProxy('s3cr3t')).toBe(selloDelProxy('s3cr3t'))
    expect(selloDelProxy('s3cr3t')).not.toBe(selloDelProxy('otro'))
    expect(selloDelProxy('s3cr3t')).not.toContain('s3cr3t')
    expect(selloDelProxy('s3cr3t')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('origenReenviado (solo con el sello del proxy)', () => {
  const sello = selloDelProxy('s3cr3t')

  it('con el sello correcto lee lo que dejó el proxy', () => {
    expect(origenReenviado(h({ 'x-guia-sello': sello, 'x-guia-origen': 'publico', 'x-guia-ip': '1.2.3.4', 'x-real-ip': '9.9.9.9' }), 's3cr3t')).toEqual({
      tipo: 'publico',
      ip: '1.2.3.4',
    })
  })

  it('con el sello correcto, cualquier otro origen es directo', () => {
    expect(origenReenviado(h({ 'x-guia-sello': sello, 'x-guia-origen': 'raro' }), 's3cr3t').tipo).toBe('directo')
  })

  it('cabeceras falsificadas sin sello: directo y la IP de x-real-ip (la pone la plataforma)', () => {
    expect(origenReenviado(h({ 'x-guia-origen': 'publico', 'x-guia-ip': '6.6.6.6', 'x-real-ip': '9.9.9.9' }), 's3cr3t')).toEqual({
      tipo: 'directo',
      ip: '9.9.9.9',
    })
  })

  it('sello equivocado (o el secreto crudo): directo y x-real-ip', () => {
    for (const falso of [selloDelProxy('otro'), 's3cr3t', '', sello.slice(0, -1) + (sello.endsWith('0') ? '1' : '0')]) {
      expect(origenReenviado(h({ 'x-guia-sello': falso, 'x-guia-origen': 'publico', 'x-guia-ip': '6.6.6.6', 'x-real-ip': '9.9.9.9' }), 's3cr3t')).toEqual({
        tipo: 'directo',
        ip: '9.9.9.9',
      })
    }
  })

  it('sin secreto configurado nunca confía en lo reenviado: directo y x-real-ip, como el proxy', () => {
    for (const secreto of [undefined, '']) {
      expect(origenReenviado(h({ 'x-guia-sello': sello, 'x-guia-origen': 'publico', 'x-guia-ip': '6.6.6.6', 'x-real-ip': '9.9.9.9' }), secreto)).toEqual({
        tipo: 'directo',
        ip: '9.9.9.9',
      })
    }
    expect(origenReenviado(h({}), undefined)).toEqual({ tipo: 'directo', ip: null })
  })
})
