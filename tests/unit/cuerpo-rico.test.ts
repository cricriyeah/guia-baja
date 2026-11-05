// tests/unit/cuerpo-rico.test.ts
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// Fuera de Next, <Link> se simula como un <a> simple.
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: ReactNode }) => createElement('a', { href, ...resto }, children),
}))

import { CuerpoRico } from '../../src/sitio/ui/CuerpoRico'

const texto = (t: string) => ({ type: 'text', text: t, format: 0, style: '', mode: 'normal', detail: 0, version: 1 })
const nodo = (type: string, extra: object, children: object[] = []) => ({ type, version: 1, format: '', indent: 0, direction: 'ltr', children, ...extra })

const cuerpo = {
  root: nodo('root', {}, [
    nodo('heading', { tag: 'h2' }, [texto('En el centro')]),
    nodo('paragraph', { textFormat: 0 }, [
      nodo('link', { fields: { linkType: 'internal', doc: { relationTo: 'lugares', value: 1 } } }, [texto('Balandra')]),
      texto(' y '),
      nodo('link', { fields: { linkType: 'internal', doc: { relationTo: 'lugares', value: 99 } } }, [texto('otro')]),
    ]),
    { type: 'block', version: 2, format: '', fields: { blockType: 'tarjetaLugar', lugar: 1 } },
    { type: 'block', version: 2, format: '', fields: { blockType: 'tarjetaLugar', lugar: 99 } },
    { type: 'block', version: 2, format: '', fields: { blockType: 'toursZona', zona: 1 } },
    { type: 'upload', version: 3, format: '', relationTo: 'media', value: 12 },
    { type: 'relationship', version: 1, format: '', relationTo: 'lugares', value: 1 },
    { type: 'block', version: 2, format: '', fields: { blockType: 'preguntasFrecuentes', preguntas: [{ pregunta: '¿Hora?', respuesta: 'A la 1.' }] } },
  ]),
}

const lugar = { id: 1, slug: 'balandra', nombre: 'Playa Balandra', resumen: 'Agua baja', foto: null, categoriaIds: [], horario: [], patrocinio: { activo: false, desde: null, hasta: null } }
const resolutor = {
  lugar: (id: number) => (id === 1 ? lugar : undefined),
  evento: () => undefined,
  href: (rel: string, id: number) => (rel === 'lugares' && id === 1 ? '/es/guia/lugares/balandra' : null),
}
const media = { '12': { src: '/m/x.webp', srcset: '', ancho: 10, alto: 10, alt: 'Pangas', credito: 'Ana', og: null } }

describe('CuerpoRico', () => {
  const html = renderToStaticMarkup(createElement(CuerpoRico, { lang: 'es', cuerpo, resolutor: resolutor as never, media, categorias: [] }))

  it('h2 con el id de encabezadosDe', () => expect(html).toContain('<h2 id="en-el-centro">'))
  it('link interno que existe, y texto sin link si no existe', () => {
    expect(html).toContain('href="/es/guia/lugares/balandra"')
    expect(html).toContain('otro')
    expect(html).not.toContain('href="#"')
    expect(html).not.toMatch(/<a[^>]*>otro<\/a>/)
  })
  it('tarjeta de lugar resuelta; la que no existe no se pinta', () => {
    expect(html.match(/b-lugar/g)).toHaveLength(1)
    expect(html).toContain('Playa Balandra')
  })
  it('imagen del cuerpo con su crédito', () => {
    expect(html).toContain('src="/m/x.webp"')
    expect(html).toContain('Ana')
  })
  it('preguntas frecuentes como details', () => expect(html).toContain('<summary>¿Hora?</summary>'))
  it('sin «unknown node» ni tours (F4)', () => {
    expect(html).not.toContain('unknown node')
    expect(html).not.toContain('b-tours')
  })
})
