import { describe, expect, it } from 'vitest'

import { esAdmin, esPersonal } from '../../src/acceso/roles'

describe('roles', () => {
  it('admin es admin y personal', () => {
    expect(esAdmin({ rol: 'admin' })).toBe(true)
    expect(esPersonal({ rol: 'admin' })).toBe(true)
  })
  it('editor es personal pero no admin', () => {
    expect(esAdmin({ rol: 'editor' })).toBe(false)
    expect(esPersonal({ rol: 'editor' })).toBe(true)
  })
  it('sin usuario o con rol desconocido no es nada', () => {
    expect(esPersonal(null)).toBe(false)
    expect(esPersonal(undefined)).toBe(false)
    expect(esPersonal({ rol: 'otro' })).toBe(false)
  })
})
