import { sql } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'

import type { TipoBusqueda } from '../dominio/busqueda'
import { filasDe, type FilaIndice } from './filas'

const COLECCION: Record<TipoBusqueda, 'lugares' | 'eventos' | 'articulos' | 'zonas' | 'categorias'> = {
  lugar: 'lugares', evento: 'eventos', articulo: 'articulos', zona: 'zonas', categoria: 'categorias',
}

type Db = { execute(q: unknown): Promise<unknown>; transaction<T>(f: (tx: Db) => Promise<T>): Promise<T> }

// La conexión de la transacción del req (o la general). db.transaction() sobre ella abre un SAVEPOINT: un error de
// SQL revierte solo el índice, nunca el guardado del documento (plan F3c). getTransaction de @payloadcms/drizzle no
// se exporta; `sessions` sí es parte del tipo público del adaptador.
async function conexion(req: PayloadRequest): Promise<Db> {
  const adaptador = req.payload.db as unknown as { drizzle: Db; sessions?: Record<string | number, { db: Db }> }
  const id = req.transactionID ? await req.transactionID : undefined
  return (id !== undefined && adaptador.sessions?.[id]?.db) || adaptador.drizzle
}

async function escribir(db: Db, tipo: TipoBusqueda, id: number, filas: FilaIndice[], forzarFallo: boolean) {
  await db.transaction(async (sp) => {
    const locales = filas.map((f) => f.locale)
    await sp.execute(sql`DELETE FROM indice_busqueda WHERE tipo = ${tipo} AND doc_id = ${id}
      AND NOT (idioma::text = ANY(${sql.param(locales)}::text[]))`) // un solo parámetro: drizzle expandiría el arreglo
    for (const f of filas) {
      await sp.execute(sql`INSERT INTO indice_busqueda
        (tipo, doc_id, idioma, slug, titulo, texto, zona_ids, categoria_ids, inicio, fin, patrocinio_activo, patrocinio_desde, patrocinio_hasta)
        VALUES (${f.tipo}, ${f.docId}, ${f.locale}, ${f.slug}, ${f.titulo}, ${f.texto}, ${JSON.stringify(f.zonaIds)}::jsonb,
          ${JSON.stringify(f.categoriaIds)}::jsonb, ${f.inicio}, ${f.fin}, ${f.patrocinioActivo}, ${f.patrocinioDesde}, ${f.patrocinioHasta})
        ON CONFLICT (tipo, doc_id, idioma) DO UPDATE SET slug = EXCLUDED.slug, titulo = EXCLUDED.titulo, texto = EXCLUDED.texto,
          zona_ids = EXCLUDED.zona_ids, categoria_ids = EXCLUDED.categoria_ids, inicio = EXCLUDED.inicio, fin = EXCLUDED.fin,
          patrocinio_activo = EXCLUDED.patrocinio_activo, patrocinio_desde = EXCLUDED.patrocinio_desde,
          patrocinio_hasta = EXCLUDED.patrocinio_hasta, updated_at = now()`)
    }
    if (forzarFallo) await sp.execute(sql`SELECT 1/0`)
  })
}

export async function indexar(req: PayloadRequest, tipo: TipoBusqueda, id: number): Promise<void> {
  try {
    const doc = (await req.payload.db.findOne({ collection: COLECCION[tipo], where: { id: { equals: id } }, locale: 'all', req })) as Record<string, unknown> | null
    await escribir(await conexion(req), tipo, id, filasDe(tipo, doc), Boolean(req.context?.forzarFalloIndice))
  } catch (e) {
    req.payload.logger.error({ msg: 'No se pudo actualizar el índice de búsqueda', tipo, id, err: e instanceof Error ? e.message : String(e) })
  }
}

export async function reindexarTodo(payload: Payload): Promise<number> {
  let n = 0
  for (const tipo of Object.keys(COLECCION) as TipoBusqueda[]) {
    const { docs } = await payload.find({ collection: COLECCION[tipo], overrideAccess: true, pagination: false, depth: 0, draft: false })
    for (const d of docs) {
      await indexar({ payload, context: {} } as unknown as PayloadRequest, tipo, d.id as number)
      n++
    }
  }
  return n
}
