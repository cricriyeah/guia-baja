import { describe, expect, it } from 'vitest'

import { CLAVE_SESION, debeAparecer, marcarMostrada, yaSeMostro } from '../../src/sitio/ui/presencia/disparo'

const base = {
  msEnPagina: 6000, scrollY: 0, scrollHeight: 3000, innerHeight: 800, salidaArriba: false, escritorio: true, capaAbierta: false, yaMostrada: false,
}

describe('debeAparecer (spec presencia §2.3)', () => {
  it('aparece al bajar a la mitad de lo que se puede bajar', () => {
    expect(debeAparecer({ ...base, scrollY: 1099 })).toBe(false)
    expect(debeAparecer({ ...base, scrollY: 1100 })).toBe(true)
  })
  it('nunca antes de 5 segundos, aunque ya haya bajado', () => {
    expect(debeAparecer({ ...base, scrollY: 2200, msEnPagina: 4999 })).toBe(false)
  })
  it('nunca solo por tiempo', () => {
    expect(debeAparecer({ ...base, msEnPagina: 600_000 })).toBe(false)
  })
  it('en una página que no se puede bajar al menos un alto de pantalla, el scroll no dispara', () => {
    expect(debeAparecer({ ...base, scrollHeight: 1500, scrollY: 700 })).toBe(false)
    expect(debeAparecer({ ...base, scrollHeight: 1600, scrollY: 400 })).toBe(true)
  })
  it('la salida por arriba solo dispara en escritorio', () => {
    expect(debeAparecer({ ...base, salidaArriba: true })).toBe(true)
    expect(debeAparecer({ ...base, salidaArriba: true, escritorio: false })).toBe(false)
  })
  it('nunca con otra capa abierta ni si ya se mostró en la sesión', () => {
    expect(debeAparecer({ ...base, scrollY: 2200, capaAbierta: true })).toBe(false)
    expect(debeAparecer({ ...base, scrollY: 2200, yaMostrada: true })).toBe(false)
  })
})

describe('una vez por sesión', () => {
  const memoria = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
  }
  it('marca y lee la sesión', () => {
    const s = memoria()
    expect(yaSeMostro(s)).toBe(false)
    expect(marcarMostrada(s)).toBe(true)
    expect(yaSeMostro(s)).toBe(true)
    expect(s.getItem(CLAVE_SESION)).toBe('1')
  })
  it('sin sessionStorage (lanza o no existe) no truena: cuenta como no mostrada y no se puede marcar', () => {
    const rota = { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') } }
    expect(yaSeMostro(rota)).toBe(false)
    expect(marcarMostrada(rota)).toBe(false)
    expect(yaSeMostro(null)).toBe(false)
    expect(marcarMostrada(null)).toBe(false)
  })
})
