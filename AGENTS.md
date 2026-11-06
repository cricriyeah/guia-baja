# AGENTS.md — sunbaja-guia

Guía «Lugares y eventos en la Baja»: Next.js + Payload que se sirve bajo salysoltours.com por rewrite.
Diseño completo: `docs/specs/2026-10-30-guia-baja-design.md`. Diseño visual de referencia: `docs/diseno/` (lo entrega el equipo del dueño; puede no existir todavía).

## Alcance

- Este repo es solo la Guía. Nunca se toca el sitio de reservas ni su API desde aquí.
- La Guía solo **lee** del catálogo de reservas; nunca escribe en él.

## Versiones fijas

- Node 24.x desde 24.22.1 (`engines`: `^24.22.1`, así Vercel no salta solo a otra versión mayor), npm. Payload 3.92.1, Next.js 16.4.3 (mínimos del spec: Payload ≥ 3.73, Next ≥ 16.2.6).
- Versiones exactas en `package.json` (sin `^`). No usar Cache Components ni PPR.

## Comandos

Todos funcionan igual en Git Bash y en shells POSIX.

- `docker compose up -d` — Postgres local con PostGIS (imagen `postgis/postgis:17-3.5`), puerto **5433** del equipo; bases `guia` y `guia_test`.
- `npm run dev` — app en http://localhost:3000 (admin en `/admin`).
- `npm run test:unit` / `npm run test:int` — Vitest. La integración corre contra el Postgres real de `.env.test` (`guia_test`, puerto 5433) y antes rehace la base con `payload migrate:fresh`.
- `npm run typecheck`, `npm run lint`.
- `npm run generate:types`, `npm run generate:importmap` — después de cambiar el esquema.
- `npm run payload migrate:create <nombre>` — nueva migración (expandir y luego contraer).
- `npm run migracion:regenerar -- --no-hay-deploy` — rehace las dos migraciones previas al deploy (`inicial` y `busqueda`); solo antes del primer deploy a producción (ver Reglas).
- Seed (datos inventados, borra todo):
  `SEED_PERMITIDO=true SEED_CONTRASENA_ADMIN='<12+ caracteres>' npm run seed`.
  Exige `SEED_PERMITIDO=true` **y** `SEED_CONTRASENA_ADMIN` de 12 caracteres o más, y solo corre contra `localhost`, `127.0.0.1` o una base llamada `preview`.

## CI

`.github/workflows/ci.yml` corre en cada PR y en `main`: tipos e importMap al día, `typecheck`, `lint`, unitarias,
comprobación de que el esquema no tiene cambios sin migración, integración contra Postgres/PostGIS y `build`.
Un PR no se mezcla con el CI en rojo.

## Reglas

- **Contrato `v1`** (`src/app/api/publico/v1/**`, cuando exista): su forma no cambia nunca. Un cambio incompatible es `v2`.
- **Migraciones ya aplicadas no se editan.** Hasta el primer deploy a producción hay **dos** migraciones: `inicial` y `busqueda` (escrita a mano desde
  `scripts/migraciones/busqueda.ts.txt`). `npm run migracion:regenerar -- --no-hay-deploy` rehace las dos. Desde el primer deploy a producción
  `migracion:regenerar` está **prohibido**: todo cambio de esquema es una migración nueva con `npm run payload migrate:create <nombre>`.
  Toda migración debe funcionar con el código anterior: primero se agrega; se borra o renombra en un PR posterior.
- El CI falla si el esquema cambia sin migración correspondiente en `src/migrations/`.
- **Nunca `push`** de esquema en ninguna base; el adaptador va con `push: false`.
- **Acceso negado por defecto.** Toda colección y campo sensible usa reglas de `src/acceso/reglas.ts`.
- **Hooks:** nunca llamar a la Local API pasando el `req` de la operación con un `locale` distinto
  (Payload reescribe `req.locale` y se pierden los campos localizados). Lecturas por idioma: `req.payload.db.*`.
- **URLs públicas** solo desde `src/dominio/rutas.ts`.
- Importaciones dentro de `src/` relativas (no `@/`).
- **Toda dependencia nueva se justifica en la descripción del PR.**
- Nunca datos reales en local, CI ni previews. Los logs nunca llevan correo, teléfono ni IP.
- Commits y PRs en español.
