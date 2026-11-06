import { describe, expect, it, vi } from 'vitest'

import { verificarTurnstile } from '../../src/formulario/turnstile'

const respuesta = (cuerpo: object) => vi.fn(async () => new Response(JSON.stringify(cuerpo)))

describe('verificarTurnstile (spec §11)', () => {
  it('manda secreto, token y remoteip', async () => {
    const f = respuesta({ success: true })
    expect(await verificarTurnstile('tok', '1.2.3.4', 'sec', f as never)).toBe(true)
    const cuerpo = (f.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body
    expect(Object.fromEntries(cuerpo)).toEqual({ secret: 'sec', response: 'tok', remoteip: '1.2.3.4' })
  })
  it('sin IP no manda remoteip', async () => {
    const f = respuesta({ success: true })
    await verificarTurnstile('tok', null, 'sec', f as never)
    expect(Object.fromEntries((f.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body)).not.toHaveProperty('remoteip')
  })
  it('falso sin token, sin secreto, con fallo o con error de red', async () => {
    expect(await verificarTurnstile(undefined, null, 'sec', respuesta({ success: true }) as never)).toBe(false)
    expect(await verificarTurnstile('tok', null, undefined, respuesta({ success: true }) as never)).toBe(false)
    expect(await verificarTurnstile('tok', null, 'sec', respuesta({ success: false }) as never)).toBe(false)
    expect(await verificarTurnstile('tok', null, 'sec', vi.fn(async () => { throw new Error('red') }) as never)).toBe(false)
  })
})
