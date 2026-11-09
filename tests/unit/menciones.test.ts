import { describe, expect, it } from 'vitest'

import { enlazarMenciones, type CandidatoMencion } from '../../src/dominio/menciones'
import { candidatosMencion } from '../../src/sitio/datos/menciones'
import type { TarjetaLugar } from '../../src/sitio/datos/tipos'

const txt = (text: string) => ({ type: 'text', text, format: 0 })
const p = (...children: unknown[]) => ({ type: 'paragraph', children })
const c = (...children: unknown[]) => ({ root: { type: 'root', children } })
const h2 = (t: string) => ({ type: 'heading', tag: 'h2', children: [txt(t)] })
const link = (id: number, t: string) => ({ type: 'link', fields: { linkType: 'internal', doc: { relationTo: 'lugares', value: id } }, children: [txt(t)] })
const tarjeta = (id: number) => ({ type: 'block', fields: { blockType: 'tarjetaLugar', lugar: id } })

const balandra: CandidatoMencion = { id: 1, nombres: ['Playa Balandra', 'Balandra'], enlazable: true }
const tecolote: CandidatoMencion = { id: 2, nombres: ['El Tecolote'], enlazable: true }

type Nodo = { type?: string; text?: string; fields?: { doc?: { value?: number } }; children?: Nodo[] }
function hijos(cuerpo: unknown, i = 0): Nodo[] {
  return ((cuerpo as { root: { children: Nodo[] } }).root.children[i].children ?? []) as Nodo[]
}
const enlaces = (cuerpo: unknown): { id: number | undefined; texto: string | undefined }[] => {
  const salida: { id: number | undefined; texto: string | undefined }[] = []
  const ir = (n: Nodo) => {
    if (n.type === 'link') salida.push({ id: n.fields?.doc?.value, texto: n.children?.[0]?.text })
    n.children?.forEach(ir)
  }
  ;(cuerpo as { root: Nodo }).root.children?.forEach(ir)
  return salida
}

describe('enlazarMenciones', () => {
  it('enlaza la primera mención y parte el texto', () => {
    const [r] = enlazarMenciones([c(p(txt('Ve a Balandra y a Balandra otra vez.')))], [balandra])
    expect(hijos(r).map((n) => n.type)).toEqual(['text', 'link', 'text'])
    expect(enlaces(r)).toEqual([{ id: 1, texto: 'Balandra' }])
  })
  it('gana la más larga', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('En Playa Balandra.')))], [balandra])[0])).toEqual([{ id: 1, texto: 'Playa Balandra' }])
  })
  it('sin acentos', () => {
    const lugar: CandidatoMencion = { id: 3, nombres: ['Pichilingüe'], enlazable: true }
    expect(enlaces(enlazarMenciones([c(p(txt('Vamos a Pichilingue hoy.')))], [lugar])[0])).toEqual([{ id: 3, texto: 'Pichilingue' }])
  })
  it('palabra completa', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('Las Balandras son barcos.')))], [balandra])[0])).toEqual([])
  })
  it('primera letra minúscula no enlaza', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('una balandra blanca')))], [balandra])[0])).toEqual([])
  })
  it('no toca encabezados, links ya hechos ni bloques', () => {
    expect(enlaces(enlazarMenciones([c(h2('Balandra'))], [balandra])[0])).toEqual([])
    expect(enlaces(enlazarMenciones([c(p(link(9, 'Balandra')))], [balandra])[0])).toEqual([{ id: 9, texto: 'Balandra' }])
  })
  it('tarjeta del mismo lugar: no enlaza', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('Balandra.')), tarjeta(1))], [balandra])[0])).toEqual([])
  })
  it('propia ficha con excluir', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('Balandra.')))], [balandra], { excluir: [1] })[0])).toEqual([])
  })
  it('nombre ambiguo no se enlaza', () => {
    const otro: CandidatoMencion = { id: 7, nombres: ['Balandra'], enlazable: true }
    expect(enlaces(enlazarMenciones([c(p(txt('Balandra.')))], [balandra, otro])[0])).toEqual([])
  })
  it('un no enlazable que comparte nombre también lo vuelve ambiguo', () => {
    const patrocinado: CandidatoMencion = { id: 7, nombres: ['Balandra'], enlazable: false }
    expect(enlaces(enlazarMenciones([c(p(txt('Balandra.')))], [balandra, patrocinado])[0])).toEqual([])
  })
  it('no enlazable no se enlaza', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('El Tecolote.')))], [{ ...tecolote, enlazable: false }])[0])).toEqual([])
  })
  it('menos de 4 letras', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('Ir a Ola.')))], [{ id: 4, nombres: ['Ola'], enlazable: true }])[0])).toEqual([])
  })
  it('máximo 10 entre dos cuerpos', () => {
    const lugares = Array.from({ length: 12 }, (_, i): CandidatoMencion => ({ id: i + 1, nombres: [`Lugarcito${String.fromCharCode(65 + i)}`], enlazable: true }))
    const nombres = lugares.map((l) => l.nombres[0])
    const r = enlazarMenciones([c(p(txt(nombres.slice(0, 6).join(' y ')))), c(p(txt(nombres.slice(6).join(' y '))))], lugares)
    expect(enlaces(r[0]).length + enlaces(r[1]).length).toBe(10)
  })
  it('nodo partido no enlaza', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('Playa Bal'), { ...txt('andra'), format: 1 }))], [{ id: 5, nombres: ['Playa Balandra'], enlazable: true }])[0])).toEqual([])
  })
  it('primera mención en el cuerpo 1: el 2 no recibe enlace', () => {
    const r = enlazarMenciones([c(p(txt('Balandra.'))), c(p(txt('Balandra.')))], [balandra])
    expect(enlaces(r[0])).toHaveLength(1)
    expect(enlaces(r[1])).toHaveLength(0)
  })
  it('enlace manual en el cuerpo 2 impide enlazar en el 1', () => {
    expect(enlaces(enlazarMenciones([c(p(txt('Balandra.'))), c(p(link(1, 'ahí')))], [balandra])[0])).toEqual([])
  })
  it('conserva el formato del texto', () => {
    const [r] = enlazarMenciones([c(p({ ...txt('Balandra'), format: 1 }))], [balandra])
    const n = hijos(r)[0] as Nodo & { children: (Nodo & { format?: number })[] }
    expect(n.children[0].format).toBe(1)
  })
  it('no muta la entrada y deja pasar un cuerpo nulo', () => {
    const e = c(p(txt('Balandra.')))
    const copia = JSON.stringify(e)
    expect(enlazarMenciones([null, e], [balandra])[0]).toBeNull()
    expect(JSON.stringify(e)).toBe(copia)
  })
})

describe('candidatosMencion', () => {
  const lugar = (extra: Partial<TarjetaLugar>) => ({
    id: 1, nombre: 'Playa Balandra', otrosNombres: ['Balandra'], enlazarMenciones: true, patrocinio: { activo: false, desde: null, hasta: null }, ...extra,
  }) as TarjetaLugar
  it('nombre y otros nombres, enlazable por defecto', () => {
    expect(candidatosMencion([lugar({})])).toEqual([{ id: 1, nombres: ['Playa Balandra', 'Balandra'], enlazable: true }])
  })
  it('casilla apagada: no enlazable, pero sigue en la lista', () => {
    expect(candidatosMencion([lugar({ enlazarMenciones: false })])[0].enlazable).toBe(false)
  })
  it('patrocinio declarado: no enlazable', () => {
    const p = { activo: true, desde: '2020-01-01', hasta: '2999-01-01' }
    expect(candidatosMencion([lugar({ patrocinio: p })])[0].enlazable).toBe(false)
  })
})
