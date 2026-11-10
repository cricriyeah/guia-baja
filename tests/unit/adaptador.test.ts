import { afterEach, describe, expect, it, vi } from 'vitest'

import { enviarEvento } from '../../src/sitio/analitica/adaptador'

describe('enviarEvento', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('emite guia:evento en la página', () => {
    const ventana = new EventTarget()
    vi.stubGlobal('window', ventana)
    const recibido: unknown[] = []
    ventana.addEventListener('guia:evento', (e) => recibido.push((e as CustomEvent).detail))
    enviarEvento('quiz_resultado', { zona: 'la-paz', gusto: 'aventura' })
    expect(recibido).toEqual([{ evento: 'quiz_resultado', props: { zona: 'la-paz', gusto: 'aventura' } }])
  })

  it('en el servidor no hace nada', () => {
    expect(() => enviarEvento('tour_clic', {})).not.toThrow()
  })
})
