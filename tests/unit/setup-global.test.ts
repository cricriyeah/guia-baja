import { describe, expect, it } from 'vitest'

import { verificarBaseDePruebas } from '../int/setup-global'

describe('guardia de la base de pruebas de integración', () => {
  it('deja pasar solo la base guia_test', () => {
    expect(() => verificarBaseDePruebas('postgres://postgres:postgres@localhost:5433/guia_test')).not.toThrow()
    expect(() => verificarBaseDePruebas('postgres://postgres:postgres@localhost:5433/guia_test?sslmode=disable')).not.toThrow()
  })

  it('se niega con cualquier otra base, URL ausente o mal formada', () => {
    for (const url of [
      'postgres://postgres:postgres@localhost:5433/guia',
      'postgres://u:p@ep-prod.neon.tech/neondb',
      'postgres://u:p@localhost:5433/guia_test2',
      'postgres://u:p@localhost:5433/',
      'no es una url',
      '',
      undefined,
    ]) {
      expect(() => verificarBaseDePruebas(url)).toThrow(/guia_test/)
    }
  })

  it('el mensaje no incluye la URL', () => {
    expect(() => verificarBaseDePruebas('postgres://u:secreto@prod.example.com/guia')).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('secreto') }),
    )
  })
})
