import { describe, expect, it } from 'vitest'

import { origenDePeticion, origenReenviado } from '../../src/dominio/origen'

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

describe('origenReenviado', () => {
  it('lee lo que dejó el proxy', () => {
    expect(origenReenviado(h({ 'x-guia-origen': 'publico', 'x-guia-ip': '1.2.3.4' }))).toEqual({ tipo: 'publico', ip: '1.2.3.4' })
  })

  it('cualquier otro valor es directo', () => {
    expect(origenReenviado(h({ 'x-guia-origen': 'raro' })).tipo).toBe('directo')
  })
})
