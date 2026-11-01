# Operación de la Guía

Lo que no vive en el código: configuración de cuentas, verificaciones manuales y procedimientos.
Diseño de referencia: `docs/specs/2026-10-30-guia-baja-design.md` (§4.2, §5.3, §5.4 y §5.5).

## Desarrollo local

- `docker compose up -d`: Postgres con PostGIS (imagen `postgis/postgis:17-3.5`) en el puerto **5433** del equipo,
  con las bases `guia` y `guia_test`. Zonas usa un campo `point`, así que la base siempre necesita PostGIS
  (las migraciones de Payload crean la extensión).
- Seed con datos inventados, solo en local o en la base `preview`:
  `SEED_PERMITIDO=true SEED_CONTRASENA_ADMIN='<12+ caracteres>' npm run seed`.
  Se niega a correr contra cualquier otra base.
- Nunca datos reales en local, CI ni previews. Única excepción: la prueba de restauración de abajo, en un
  contenedor desechable que se borra al terminar.

## Vercel (proyecto `sunbaja-guia`)

- Build: lo define `vercel.json` (`npm run build:vercel`: migra con `DATABASE_URL_UNPOOLED` y construye). Región `iad1`.
- Producción solo desde `main`.
- Integración de Neon: región `aws-us-east-1`; **sin** branches automáticos para previews; sus variables solo en Production.
  PostGIS debe estar disponible en la base (Neon lo soporta; la primera migración ejecuta `CREATE EXTENSION`).
- Variables de Preview a mano (spec §5.3 y §5.5): `DATABASE_URL` y `DATABASE_URL_UNPOOLED` de la base `preview`, bucket
  `guia-media-preview` y su llave, otro `PAYLOAD_SECRET`, llaves de prueba de Turnstile, `GUIA_INDEXABLE=false`.
- Antes de autorizar el preview de un PR externo: leer el diff completo.
- Base `preview` rota: borrarla, crearla vacía en Neon y correr
  `SEED_PERMITIDO=true SEED_CONTRASENA_ADMIN='<12+ caracteres>' npm run seed` con sus variables.
- Desde el primer deploy a producción: **prohibido** `npm run migracion:regenerar`; toda migración nueva con
  `npm run payload migrate:create <nombre>` (AGENTS.md).

## GitHub

- Plan Pro (cuenta personal) o Team (organización): sin eso no hay protección de ramas en repos privados.
- Ruleset de `main`: solo por PR, aprobación de CODEOWNERS, CI verde (`calidad`), sin force push ni borrado.
  Bypass solo para el dueño y solo para la aprobación (no para el CI).
- Environment `respaldos`: rama permitida solo `main`; secretos `DATABASE_URL_UNPOOLED_PROD`, `R2_ACCOUNT_ID`,
  `R2_LECTURA_MEDIA_KEY_ID`, `R2_LECTURA_MEDIA_SECRET`, `R2_RESPALDOS_KEY_ID`, `R2_RESPALDOS_SECRET`.
  `DATABASE_URL_UNPOOLED_PROD` es la URL **directa** (sin pooler) de producción, con `sslmode=require`.
- Workflow `.github/workflows/respaldo.yml` («Respaldo»): base diaria (09:00 UTC, 02:00 en BCS) e imágenes
  semanales (domingos 10:00 UTC, 03:00 en BCS), más disparo manual. Si un respaldo programado falla, GitHub
  avisa por correo a quien editó por última vez el cron: revisar la pestaña Actions y corregir el mismo día.
- La versión de Postgres del job `base` (`container: postgres:17`) debe ser la misma versión mayor que la base de
  Neon; si Neon cambia de versión, se actualiza en el workflow.

## Cloudflare R2

- Buckets: `guia-media` (público por dominio propio), `guia-media-preview`, `guia-respaldos` (privado).
- Llaves (una por uso, limitadas a su bucket):
  - App en producción: lectura/escritura solo en `guia-media`.
  - App en previews: lectura/escritura solo en `guia-media-preview`.
  - Respaldo, lectura: solo lectura en `guia-media`.
  - Respaldo, escritura: lectura/escritura solo en `guia-respaldos`.
- CORS de `guia-media` (subidas directas del admin):
  ```json
  [{ "AllowedOrigins": ["https://sunbaja-guia.vercel.app"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }]
  ```
- `guia-respaldos`: regla de ciclo de vida que borra a los 30 días y bucket lock de 30 días.
- `guia-media`, objetos huérfanos: con `clientUploads` el navegador sube el archivo a R2 con una URL firmada
  *antes* de que Payload cree el documento. Si el alta se rechaza (validación, límite de 20 MB, formato, sesión
  vencida), el objeto queda en el bucket sin documento. Recomendado:
  - Regla de ciclo de vida «abortar cargas multiparte incompletas» a 1 día.
  - **No** poner una regla de expiración por antigüedad en `guia-media`: borraría imágenes reales.
  - Cada 3 meses, junto con la prueba de restauración, comparar el listado del bucket con los archivos de la
    colección `media` y borrar a mano los objetos sin documento.
  - En `guia-media-preview` sí se puede poner una expiración a 30 días (solo hay datos inventados).

## Llave de cifrado de respaldos

El workflow se niega a correr (con un mensaje claro) mientras no exista `ops/respaldo.age.pub`.
No se genera ningún par de llaves en este repo: lo hace el dueño.

1. El dueño, en su computadora (instala `age` desde https://github.com/FiloSottile/age):
   `age-keygen -o guia-respaldos.key`. El comando imprime `Public key: age1...`.
2. Guardar `guia-respaldos.key` (la llave **privada**) en su gestor de contraseñas y en una copia fuera de línea.
   Nunca en GitHub, Vercel ni este repo. Sin ella los respaldos no se pueden abrir; con ella cualquiera los abre.
3. Crear `ops/respaldo.age.pub` con **solo** la línea `age1...` (la llave pública) y commitearla por PR.
   No commitear nunca el archivo `.key` (`.gitignore` ya lo ignora).

## Restaurar un respaldo

Los respaldos de la base son volcados de `pg_dump` (formato custom) cifrados con `age`. El volcado trae
`CREATE EXTENSION postgis`, así que **el servidor de destino debe tener PostGIS** (en un Postgres sin PostGIS,
`pg_restore` falla con `extension "postgis" is not available`). La misma versión mayor de Postgres que la de origen (17).

Prueba de restauración (nunca contra `preview` ni producción; el destino es un contenedor local desechable):

```bash
# 1. Bajar y descifrar (necesitas aws CLI y age; la llave privada sale del gestor de contraseñas)
export AWS_ACCESS_KEY_ID=<llave R2 de respaldos> AWS_SECRET_ACCESS_KEY=<secreto>
export AWS_DEFAULT_REGION=auto AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
ENDPOINT=https://<cuenta>.r2.cloudflarestorage.com
aws s3 ls s3://guia-respaldos/base/ --endpoint-url "$ENDPOINT"
aws s3 cp s3://guia-respaldos/base/<archivo>.dump.age . --endpoint-url "$ENDPOINT"
age --decrypt --identity guia-respaldos.key --output respaldo.dump <archivo>.dump.age

# 2. Servidor desechable con PostGIS, en un puerto que no choca con el de desarrollo (5433)
docker run -d --name guia-restauracion -e POSTGRES_PASSWORD=desechable -p 127.0.0.1:55432:5432 postgis/postgis:17-3.5
docker exec guia-restauracion createdb -h 127.0.0.1 -U postgres restaurada

# 3. Restaurar (sin dueños ni permisos) y comprobar
docker exec -i guia-restauracion pg_restore --no-owner --no-acl -h 127.0.0.1 -U postgres -d restaurada < respaldo.dump
docker exec guia-restauracion psql -h 127.0.0.1 -U postgres -d restaurada -c "select count(*) from users"

# 4. Abrir la app contra esa base y entrar a /admin (con un .env.local o variables de shell)
DATABASE_URL=postgres://postgres:desechable@localhost:55432/restaurada \
DATABASE_URL_UNPOOLED=postgres://postgres:desechable@localhost:55432/restaurada npm run dev

# 5. Borrar todo, incluido el archivo descifrado
docker rm -f -v guia-restauracion
rm respaldo.dump respaldo.dump.age
```

En lugar del contenedor local se puede usar una base desechable de Neon (una base o branch nuevo con la extensión
`postgis` disponible), que se borra al terminar. Nunca la base `preview` ni la de producción.
Las imágenes no están en el volcado: viven en R2 y se restauran con `aws s3 sync` desde
`s3://guia-respaldos/media/<fecha>/` hacia el bucket que corresponda.
Anotar el resultado en el registro de abajo.

## Verificaciones de F2 (con cuentas de F0)

- [ ] Subir desde el admin de producción una foto de teléfono de **más de 10 MB** con `clientUploads` activo (spec §4.2):
      se guarda y en R2 (`guia-media`) aparecen los cuatro tamaños (`s480`, `s960`, `s1600`, `og`) además del
      original, servidos desde el dominio público del bucket. Si con subida directa no se generan, anotarlo aquí y
      aplicar el plan B del spec §4.2 (reducir en el navegador a menos de 4 MB antes de subir).
- [ ] Comprobar que un alta rechazada (por ejemplo, un archivo de 25 MB o un PDF) no deja el documento y revisar si
      quedó un objeto huérfano en R2; confirmar que la regla de ciclo de vida de arriba está puesta.
- [ ] Correr «Respaldo» a mano (`workflow_dispatch`, rama `main`) y ver `base/<fecha>.dump.age` y `media/<fecha>/`
      en `guia-respaldos`. Antes debe existir `ops/respaldo.age.pub`.
- [ ] Prueba de restauración (arriba) y anotarla en el registro.

## Registro de pruebas de restauración

Antes del lanzamiento y luego cada 3 meses (spec §5.4).

| Fecha | Respaldo usado | Quién | Resultado |
|---|---|---|---|
