import { describe, expect, it } from 'vitest'

import { verificarSeed } from '../../src/seed/guardia'

const bueno = {
  SEED_PERMITIDO: 'true',
  SEED_CONTRASENA_ADMIN: 'una-contrasena-larga-1',
  DATABASE_URL: 'postgres://postgres:secreto@localhost:5433/guia',
}

describe('guardia del seed', () => {
  it('deja correr en localhost y en 127.0.0.1', () => {
    expect(verificarSeed(bueno)).toEqual({ permitido: true })
    expect(verificarSeed({ ...bueno, DATABASE_URL: 'postgres://u:p@127.0.0.1:5433/guia' })).toEqual({ permitido: true })
  })

  it('deja correr contra la base «preview» de Neon', () => {
    const url = 'postgres://u:p@ep-algo-123.us-west-2.aws.neon.tech/preview?sslmode=require'
    expect(verificarSeed({ ...bueno, DATABASE_URL: url })).toEqual({ permitido: true })
  })

  it('se niega con otro host y otra base', () => {
    const r = verificarSeed({ ...bueno, DATABASE_URL: 'postgres://u:p@ep-prod.neon.tech/guia' })
    expect(r.permitido).toBe(false)
  })

  it('no se deja engañar por «localhost» en otra parte de la URL', () => {
    expect(verificarSeed({ ...bueno, DATABASE_URL: 'postgres://localhost:x@prod.example.com/guia' }).permitido).toBe(false)
    expect(verificarSeed({ ...bueno, DATABASE_URL: 'postgres://u:p@prod.example.com/guia?host=localhost' }).permitido).toBe(false)
  })

  it('se niega con URL mal formada o ausente', () => {
    expect(verificarSeed({ ...bueno, DATABASE_URL: 'esto no es una url' }).permitido).toBe(false)
    expect(verificarSeed({ ...bueno, DATABASE_URL: '' }).permitido).toBe(false)
    expect(verificarSeed({ ...bueno, DATABASE_URL: undefined }).permitido).toBe(false)
  })

  it('se niega sin SEED_PERMITIDO=true', () => {
    expect(verificarSeed({ ...bueno, SEED_PERMITIDO: undefined }).permitido).toBe(false)
    expect(verificarSeed({ ...bueno, SEED_PERMITIDO: 'false' }).permitido).toBe(false)
  })

  it('se niega sin contraseña o con menos de 12 caracteres', () => {
    expect(verificarSeed({ ...bueno, SEED_CONTRASENA_ADMIN: undefined }).permitido).toBe(false)
    expect(verificarSeed({ ...bueno, SEED_CONTRASENA_ADMIN: '' }).permitido).toBe(false)
    expect(verificarSeed({ ...bueno, SEED_CONTRASENA_ADMIN: '12345678901' }).permitido).toBe(false)
    expect(verificarSeed({ ...bueno, SEED_CONTRASENA_ADMIN: '123456789012' }).permitido).toBe(true)
  })

  it('los motivos no filtran la contraseña ni la URL', () => {
    const r = verificarSeed({ ...bueno, DATABASE_URL: 'postgres://u:secreto@prod.example.com/guia', SEED_CONTRASENA_ADMIN: 'corta' })
    expect(r.permitido).toBe(false)
    if (!r.permitido) {
      expect(r.motivo).not.toContain('secreto')
      expect(r.motivo).not.toContain('prod.example.com')
      expect(r.motivo).not.toContain('corta')
    }
  })
})
