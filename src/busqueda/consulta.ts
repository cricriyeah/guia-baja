import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { consultaPrefijo, type FilaResultado, type TipoBusqueda } from '../dominio/busqueda'
import type { Locale } from '../dominio/idioma'

const CONFIG: Record<Locale, string> = { es: 'spanish', en: 'english' }
const TOPE = 500

type Db = { execute(q: unknown): Promise<{ rows: Record<string, unknown>[] }> }
const db = (payload: Payload) => (payload.db as unknown as { drizzle: Db }).drizzle
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null)

// Todas las coincidencias del término en el idioma (hasta 500), como JSON puro. El orden con patrocinios, la
// exclusión de eventos pasados y la paginación se hacen fuera de la caché (plan F3c).
export async function coincidencias(
  payload: Payload,
  a: { q: string; lang: Locale; tipo?: TipoBusqueda | null; zonaId?: number | null },
): Promise<FilaResultado[]> {
  if (!a.q) return []
  // Literales (de un mapa fijo, nunca del visitante) para que la consulta coincida con los índices parciales GIN.
  const cfg = sql.raw(`'${CONFIG[a.lang]}'`)
  const idioma = sql.raw(`'${a.lang}'`)
  const { rows } = await db(payload).execute(sql`
    SELECT tipo, doc_id, slug, titulo, left(coalesce(texto, ''), 300) AS texto, zona_ids, categoria_ids, inicio, fin,
      patrocinio_activo, patrocinio_desde, patrocinio_hasta,
      ts_rank(to_tsvector(${cfg}::regconfig, guia_unaccent(titulo || ' ' || coalesce(texto, ''))),
              websearch_to_tsquery(${cfg}::regconfig, guia_unaccent(${a.q}))) AS rank
    FROM indice_busqueda
    WHERE idioma = ${idioma}
      AND to_tsvector(${cfg}::regconfig, guia_unaccent(titulo || ' ' || coalesce(texto, '')))
          @@ websearch_to_tsquery(${cfg}::regconfig, guia_unaccent(${a.q}))
      ${a.tipo ? sql`AND tipo = ${a.tipo}` : sql``}
      ${a.zonaId ? sql`AND zona_ids @> ${JSON.stringify([a.zonaId])}::jsonb` : sql``}
    ORDER BY rank DESC
    LIMIT ${TOPE}`)
  return rows.map((r) => ({
    tipo: r.tipo as TipoBusqueda,
    docId: Number(r.doc_id),
    slug: String(r.slug),
    titulo: String(r.titulo),
    texto: String(r.texto),
    zonaIds: (r.zona_ids as number[] | null) ?? [],
    categoriaIds: (r.categoria_ids as number[] | null) ?? [],
    inicio: iso(r.inicio),
    fin: iso(r.fin),
    rank: Number(r.rank),
    patrocinio: { activo: Boolean(r.patrocinio_activo), desde: iso(r.patrocinio_desde), hasta: iso(r.patrocinio_hasta) },
  }))
}

// Sugerencias de la cabecera: por prefijo, sin caché (decisión de este plan). Pocos resultados, query indexado.
export async function sugerencias(payload: Payload, a: { q: string; lang: Locale }) {
  const consulta = consultaPrefijo(a.q)
  if (!consulta) return []
  const cfg = sql.raw(`'${CONFIG[a.lang]}'`)
  const idioma = sql.raw(`'${a.lang}'`)
  const { rows } = await db(payload).execute(sql`
    SELECT tipo, doc_id, slug, titulo, zona_ids FROM indice_busqueda
    WHERE idioma = ${idioma}
      AND (tipo <> 'evento' OR coalesce(fin, inicio) >= now())
      AND to_tsvector(${cfg}::regconfig, guia_unaccent(titulo || ' ' || coalesce(texto, ''))) @@ to_tsquery(${cfg}::regconfig, guia_unaccent(${consulta}))
    ORDER BY CASE tipo WHEN 'zona' THEN 0 WHEN 'categoria' THEN 1 ELSE 2 END, titulo
    LIMIT 8`)
  return rows.map((r) => ({ tipo: r.tipo as TipoBusqueda, docId: Number(r.doc_id), slug: String(r.slug), titulo: String(r.titulo), zonaIds: (r.zona_ids as number[] | null) ?? [] }))
}
