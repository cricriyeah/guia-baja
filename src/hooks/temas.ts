import { ValidationError, type CollectionBeforeValidateHook, type FieldHook, type PayloadRequest } from 'payload'

import { esPersonal } from '../acceso/roles'
import { LOCALES, type Locale } from '../dominio/idioma'
import { idDe } from '../dominio/lexical'
import { lugaresDeTema, temaIndexable, type CriteriosTema } from '../dominio/temas'
import { lugaresPublicados } from '../sitio/datos/lecturas/lugares'
import { zonasActivas } from '../sitio/datos/lecturas/zonas'
import type { TarjetaLugar } from '../sitio/datos/tipos'

const ids = (v: unknown): number[] => (Array.isArray(v) ? v : []).map(idDe).filter((x): x is number => x !== null)

export function criteriosDeDoc(doc: Record<string, unknown>): CriteriosTema {
  return {
    zonaId: idDe(doc.zona),
    categoriaIds: ids(doc.categorias),
    caracteristicas: (doc.caracteristicas as string[] | null | undefined) ?? [],
    servicios: (doc.servicios as string[] | null | undefined) ?? [],
    lugaresFijosIds: ids(doc.lugaresFijos),
  }
}

type Listas = { lugares: TarjetaLugar[]; zonasActivasIds: number[] }

// Payload corre afterRead de todas las filas en paralelo: se guarda la Promesa, no el resultado.
function listasDe(req: PayloadRequest, lang: Locale): Promise<Listas> {
  const memo = ((req.context.listasTema ??= {}) as Record<string, Promise<Listas>>)
  memo[lang] ??= (async () => {
    const [lugares, zonas] = await Promise.all([lugaresPublicados(req.payload, lang), zonasActivas(req.payload, lang)])
    return { lugares, zonasActivasIds: zonas.map((z) => z.id) }
  })()
  return memo[lang]
}

// Los hooks de campo corren antes de revisar el acceso de lectura: sin personal se sale de inmediato.
export const calcularLugaresQueCoinciden: FieldHook = async ({ data, req }) => {
  if (!esPersonal(req.user) || !data) return undefined
  const criterios = criteriosDeDoc(data)
  const partes = await Promise.all(LOCALES.map(async (l) => {
    const n = lugaresDeTema(criterios, await listasDe(req, l), new Date()).length
    return `${l}: ${n}, ${temaIndexable(n) ? 'se indexa' : 'no se indexa'}`
  }))
  return partes.join(' · ')
}

export const validarToursDeTema: CollectionBeforeValidateHook = async ({ data, req }) => {
  for (const fila of (data?.tours ?? []) as { zona?: unknown }[]) {
    const id = idDe(fila.zona)
    if (id === null) continue
    const zona = await req.payload.db.findOne<{ id: number; sedeSlug?: string | null }>({ collection: 'zonas', where: { id: { equals: id } }, req })
    if (!zona?.sedeSlug) throw new ValidationError({ collection: 'temas', errors: [{ path: 'tours', message: 'Esa zona no tiene sede en el sitio de reservas.' }] })
  }
  return data
}
