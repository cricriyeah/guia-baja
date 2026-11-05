import { describe, expect, it } from 'vitest'

import { encabezadosDe, idsEnCuerpo, preguntasDe } from '../../src/dominio/lexical'

const texto = (t: string) => ({ type: 'text', text: t })
const cuerpo = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', tag: 'h2', children: [texto('En el centro')] },
      { type: 'paragraph', children: [{ type: 'link', fields: { linkType: 'internal', doc: { relationTo: 'eventos', value: 9 } }, children: [texto('trova')] }] },
      { type: 'block', fields: { blockType: 'tarjetaLugar', lugar: 3 } },
      { type: 'block', fields: { blockType: 'tarjetaEvento', evento: { id: 9 } } },
      { type: 'upload', relationTo: 'media', value: 12 },
      { type: 'heading', tag: 'h2', children: [texto('En el centro')] },
      { type: 'heading', tag: 'h3', children: [texto('No cuenta')] },
      { type: 'block', fields: { blockType: 'preguntasFrecuentes', preguntas: [{ pregunta: '¿Hora?', respuesta: 'A la 1.' }] } },
    ],
  },
}

describe('lectura de cuerpos Lexical', () => {
  it('idsEnCuerpo junta lo que hay que resolver', () => {
    expect(idsEnCuerpo(cuerpo)).toEqual({ lugares: [3], eventos: [9], media: [12], enlaces: [{ relationTo: 'eventos', id: 9 }] })
    expect(idsEnCuerpo(null)).toEqual({ lugares: [], eventos: [], media: [], enlaces: [] })
  })

  it('encabezadosDe: solo h2, con ids únicos', () => {
    expect(encabezadosDe(cuerpo)).toEqual([
      { id: 'en-el-centro', texto: 'En el centro' },
      { id: 'en-el-centro-2', texto: 'En el centro' },
    ])
  })

  it('preguntasDe', () => {
    expect(preguntasDe(cuerpo)).toEqual([{ pregunta: '¿Hora?', respuesta: 'A la 1.' }])
  })
})
