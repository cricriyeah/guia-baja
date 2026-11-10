import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Migración escrita a mano (plan F3c): búsqueda por idioma con unaccent e índices GIN. La rehace
// `npm run migracion:regenerar` después de `inicial`; no editar el archivo generado, sino esta plantilla.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS unaccent;
    CREATE OR REPLACE FUNCTION guia_unaccent(text) RETURNS text
      LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
      AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
    CREATE INDEX IF NOT EXISTS indice_busqueda_fts_es ON indice_busqueda
      USING gin (to_tsvector('spanish', guia_unaccent(titulo || ' ' || coalesce(texto, '')))) WHERE idioma = 'es';
    CREATE INDEX IF NOT EXISTS indice_busqueda_fts_en ON indice_busqueda
      USING gin (to_tsvector('english', guia_unaccent(titulo || ' ' || coalesce(texto, '')))) WHERE idioma = 'en';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS indice_busqueda_fts_en;
    DROP INDEX IF EXISTS indice_busqueda_fts_es;
    DROP FUNCTION IF EXISTS guia_unaccent(text);
  `)
}
