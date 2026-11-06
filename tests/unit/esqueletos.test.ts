import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CuentaRegresiva } from '../../src/sitio/ui/CuentaRegresiva'
import { HorarioEnVivo } from '../../src/sitio/ui/HorarioEnVivo'
import { Imagen } from '../../src/sitio/ui/Imagen'
import { aparecer } from '../../src/sitio/ui/navegacion/aparecer'
import { destinoDe, esCambioDeConsulta, linkDeClic } from '../../src/sitio/ui/navegacion/destino'

function archivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? archivos(join(dir, e.name)) : [e.name]))
}

describe('esqueletos del sitio', () => {
  it('no hay loading.tsx: dejaría el contenido oculto en el HTML de las páginas ISR y un redirect de --filtros en 200', () => {
    expect(archivos(resolve('src/app/(sitio)'))).not.toContain('loading.tsx')
  })
})

describe('componentes que se calculan en el navegador', () => {
  it('<HorarioEnVivo> reserva su lugar hasta tener la hora', () => {
    const html = renderToStaticMarkup(createElement(HorarioEnVivo, { lang: 'es', horario: [{ dia: 'lun', abre: '09:00', cierra: '18:00' }] as never }))
    expect(html).toContain('esq--vivo')
    expect(html).toContain('aria-hidden="true"')
  })

  it('<HorarioEnVivo> sin horario no pinta nada, ni el esqueleto', () => {
    expect(renderToStaticMarkup(createElement(HorarioEnVivo, { lang: 'es', horario: [] }))).toBe('')
  })

  it('<CuentaRegresiva> reserva su lugar hasta tener la hora', () => {
    const html = renderToStaticMarkup(createElement(CuentaRegresiva, { lang: 'es', inicio: '2099-01-10T18:00:00.000Z', fin: null }))
    expect(html).toContain('esq--vivo')
  })
})

describe('<Imagen>', () => {
  it('marca la foto para que Efectos le quite el esqueleto al cargar', () => {
    const html = renderToStaticMarkup(createElement(Imagen, { imagen: { src: '/a.jpg', srcset: '', ancho: 10, alto: 10, alt: 'a', credito: null } as never }))
    expect(html).toContain('data-img')
  })
})

describe('aparecer', () => {
  const conMovimiento = (reducido: boolean) => vi.stubGlobal('window', { matchMedia: () => ({ matches: reducido }) })
  afterEach(() => vi.unstubAllGlobals())

  it('hace un fade de opacidad muy corto, sin dejar estilos al terminar', () => {
    conMovimiento(false)
    const animate = vi.fn()
    aparecer({ animate } as never)
    const [marcos, opciones] = animate.mock.calls[0]
    expect(marcos).toEqual([{ opacity: 0 }, { opacity: 1 }])
    expect(opciones.duration).toBeLessThanOrEqual(200)
    expect(opciones.fill).toBeUndefined()
  })

  it('no anima con prefers-reduced-motion', () => {
    conMovimiento(true)
    const animate = vi.fn()
    aparecer({ animate } as never)
    expect(animate).not.toHaveBeenCalled()
  })

  it('tolera que el elemento no exista', () => {
    conMovimiento(false)
    expect(() => aparecer(null)).not.toThrow()
  })
})

describe('destinoDe', () => {
  const actual = 'https://x.test/es/guia/la-paz'

  it.each([
    ['/es/guia', 'portada'],
    ['/es/guia/la-ventana', 'zona'],
    ['/es/guia/la-paz/playas', 'categoriaEnZona'],
    ['/es/guia/categoria/playas', 'categoria'],
    ['/es/guia/eventos', 'eventos'],
    ['/es/guia/eventos/festival', 'evento'],
    ['/es/guia/lugares/cocina', 'lugar'],
    ['/es/guia/articulos/que-hacer', 'articulo'],
    ['/es/guia/privacidad', 'privacidad'],
  ])('%s lleva el esqueleto de %s', (href, destino) => {
    expect(destinoDe(href, actual)).toBe(destino)
  })

  it('reconoce los segmentos en inglés', () => {
    const en = 'https://x.test/en/guide/la-paz'
    expect(destinoDe('/en/guide', en)).toBe('portada')
    expect(destinoDe('/en/guide/places/cocina', en)).toBe('lugar')
    expect(destinoDe('/en/guide/events', en)).toBe('eventos')
    expect(destinoDe('/en/guide/articles/x', en)).toBe('articulo')
    expect(destinoDe('/en/guide/category/playas', en)).toBe('categoria')
    expect(destinoDe('/en/guide/privacy', en)).toBe('privacidad')
  })

  it.each([
    ['otro sitio', 'https://otro.test/es/guia'],
    ['el sitio de reservas, en el mismo dominio', '/es/sede/la-paz'],
    ['otro idioma, que recarga', '/en/guide'],
    ['una página sin esqueleto', '/es/guia/buscar'],
    ['una ruta bajo privacidad que no existe', '/es/guia/privacidad/otra'],
    ['la misma página con otra consulta', '/es/guia/la-paz?abierto=1'],
    ['un ancla de la misma página', '#seccion'],
  ])('no aplica a %s', (_, href) => {
    expect(destinoDe(href, actual)).toBeNull()
  })
})

describe('esCambioDeConsulta', () => {
  const actual = 'https://x.test/es/guia/la-paz/playas?precio=%24'

  it('es cierto si solo cambia la consulta', () => {
    expect(esCambioDeConsulta('/es/guia/la-paz/playas?abierto=1', actual)).toBe(true)
    expect(esCambioDeConsulta('/es/guia/la-paz/playas', actual)).toBe(true)
  })

  it('es falso si el link lleva a otra página, a otro sitio o a la misma URL', () => {
    expect(esCambioDeConsulta('/es/guia/lugares/playa-balandra', actual)).toBe(false)
    expect(esCambioDeConsulta('https://otro.test/es/guia/la-paz/playas?abierto=1', actual)).toBe(false)
    expect(esCambioDeConsulta(actual, actual)).toBe(false)
  })
})

describe('linkDeClic', () => {
  const link = (attrs: Record<string, string> = {}) => ({
    target: attrs.target ?? '',
    hasAttribute: (a: string) => a in attrs,
  })
  const clic = (a: unknown, extra: Record<string, unknown> = {}) =>
    ({ target: { closest: () => a }, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false, ...extra }) as never

  it('devuelve el link de un clic normal', () => {
    const a = link()
    expect(linkDeClic(clic(a))).toBe(a)
  })

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
    ['Mayús', { shiftKey: true }],
    ['Alt', { altKey: true }],
    ['otro botón', { button: 1 }],
    ['un clic ya atendido', { defaultPrevented: true }],
  ])('ignora %s', (_, extra) => {
    expect(linkDeClic(clic(link(), extra))).toBeNull()
  })

  it('ignora los links que abren en otra pestaña o descargan, y lo que no es link', () => {
    expect(linkDeClic(clic(link({ target: '_blank' })))).toBeNull()
    expect(linkDeClic(clic(link({ download: '' })))).toBeNull()
    expect(linkDeClic(clic(null))).toBeNull()
  })
})
