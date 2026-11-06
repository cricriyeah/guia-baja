import { beforeEach, describe, expect, it, vi } from 'vitest'

const enviarEvento = vi.fn()
vi.mock('../../src/sitio/analitica/adaptador', () => ({ enviarEvento: (...a: unknown[]) => enviarEvento(...a) }))
const { propsDeElemento, track } = await import('../../src/sitio/analitica/track')
const { eventoDeClic, montarAnalitica } = await import('../../src/sitio/analitica/escucha')

describe('analítica (spec §13)', () => {
  beforeEach(() => enviarEvento.mockReset())

  it('solo eventos conocidos y como máximo 2 propiedades permitidas', () => {
    expect(track('tour_clic', { zona: 'la-paz', origen: 'cabecera', extra: 'x' })).toBe(true)
    expect(enviarEvento).toHaveBeenCalledWith('tour_clic', { zona: 'la-paz', origen: 'cabecera' })
    expect(track('otro', { a: '1' })).toBe(false)
    expect(enviarEvento).toHaveBeenCalledTimes(1)
  })

  it('omite propiedades vacías', () => {
    track('contacto_lugar', { lugar: 'balandra', canal: undefined })
    expect(enviarEvento).toHaveBeenCalledWith('contacto_lugar', { lugar: 'balandra' })
  })

  it('lee los data-* que pone F3b', () => {
    expect(propsDeElemento('tour_clic', { zona: 'la-paz', origen: 'zona' })).toEqual({ zona: 'la-paz', origen: 'zona' })
    expect(propsDeElemento('contacto_lugar', { lugar: 'b', canal: 'mapa' })).toEqual({ lugar: 'b', canal: 'mapa' })
    expect(propsDeElemento('boletos_clic', { eventoSlug: 'trova' })).toEqual({ evento: 'trova' })
  })
})

// Elementos falsos con la forma que usa el listener (closest + dataset). El documento es un EventTarget real.
type Dataset = Record<string, string | undefined>
function enlace(data: Dataset) {
  const el = { dataset: data, closest: () => el as unknown }
  return el
}
function clic(objetivo: unknown, doc: EventTarget) {
  const e = new Event('click')
  Object.defineProperty(e, 'target', { value: objetivo })
  doc.dispatchEvent(e)
}

describe('listener delegado de analítica', () => {
  beforeEach(() => enviarEvento.mockReset())

  it('eventoDeClic toma el data-evento del ancestro más cercano y sus data-* de F3b', () => {
    const link = enlace({ evento: 'tour_clic', zona: 'la-paz', origen: 'cabecera' })
    const dentro = { closest: () => link }
    expect(eventoDeClic(dentro)).toEqual({ evento: 'tour_clic', props: { zona: 'la-paz', origen: 'cabecera' } })
  })

  it('eventoDeClic ignora clics fuera de un link con data-evento', () => {
    expect(eventoDeClic({ closest: () => null })).toBeNull()
    expect(eventoDeClic(null)).toBeNull()
    expect(eventoDeClic(enlace({}))).toBeNull()
  })

  it('un clic en un link con data-evento manda exactamente un evento', () => {
    const doc = new EventTarget()
    montarAnalitica(doc)
    clic({ closest: () => enlace({ evento: 'boletos_clic', eventoSlug: 'trova' }) }, doc)
    expect(enviarEvento).toHaveBeenCalledTimes(1)
    expect(enviarEvento).toHaveBeenCalledWith('boletos_clic', { evento: 'trova' })
  })

  it('un clic sin data-evento no manda nada', () => {
    const doc = new EventTarget()
    montarAnalitica(doc)
    clic({ closest: () => null }, doc)
    expect(enviarEvento).not.toHaveBeenCalled()
  })

  it('el cleanup quita el listener', () => {
    const doc = new EventTarget()
    const quitar = montarAnalitica(doc)
    quitar()
    clic({ closest: () => enlace({ evento: 'tour_clic', zona: 'la-paz', origen: 'zona' }) }, doc)
    expect(enviarEvento).not.toHaveBeenCalled()
  })

  it('montar, desmontar y montar otra vez (StrictMode) deja un solo listener', () => {
    const doc = new EventTarget()
    montarAnalitica(doc)()
    const quitar = montarAnalitica(doc)
    clic({ closest: () => enlace({ evento: 'tour_clic', zona: 'la-paz', origen: 'zona' }) }, doc)
    expect(enviarEvento).toHaveBeenCalledTimes(1)
    quitar()
  })
})
