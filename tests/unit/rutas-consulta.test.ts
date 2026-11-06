import { describe, expect, it } from 'vitest'

import { conConsulta, conPagina, rutas } from '../../src/dominio/rutas'

describe('URLs con consulta', () => {
  it('conPagina no pone nada en la página 1', () => {
    expect(conPagina('/es/guia/eventos', 1)).toBe('/es/guia/eventos')
    expect(conPagina('/es/guia/eventos', 2)).toBe('/es/guia/eventos?pagina=2')
    expect(conPagina('/es/guia/eventos', 3, 'zona=la-paz')).toBe('/es/guia/eventos?zona=la-paz&pagina=3')
    expect(conPagina('/es/guia/eventos', 1, 'zona=la-paz')).toBe('/es/guia/eventos?zona=la-paz')
  })
  it('conConsulta', () => {
    expect(conConsulta('/en/guide/la-paz/beaches', '')).toBe('/en/guide/la-paz/beaches')
    expect(conConsulta('/en/guide/la-paz/beaches', 'precio=%24')).toBe('/en/guide/la-paz/beaches?precio=%24')
  })

  it('rutas.sugerencias por idioma', () => {
    expect(rutas.sugerencias('es')).toBe('/es/guia/buscar/sugerencias')
    expect(rutas.sugerencias('en')).toBe('/en/guide/search/sugerencias')
  })
})
