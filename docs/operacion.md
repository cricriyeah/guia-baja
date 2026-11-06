# Operación de la Guía

Lo que no vive en el código: configuración de cuentas, verificaciones manuales y procedimientos.
Diseño de referencia: `docs/specs/2026-10-30-guia-baja-design.md` (§4.2, §5.3, §5.4 y §5.5).

## Desarrollo local

- `docker compose up -d`: Postgres con PostGIS (imagen `postgis/postgis:17-3.5`) en el puerto **5433** del equipo,
  con las bases `guia` y `guia_test`. Zonas usa un campo `point`, así que la base siempre necesita PostGIS.
  La migración **no** trae `CREATE EXTENSION`: el adaptador de base de Payload ejecuta
  `CREATE EXTENSION IF NOT EXISTS "postgis"` (`createExtensions()`) cada vez que se conecta y antes de `migrate`
  y `migrate:fresh`. Si la base no permite crear la extensión, el error solo queda en el log
  (`Failed to create extension postgis`) y se manifiesta después como un error con `geometry` al migrar.
- Seed con datos inventados, solo en local o en la base `preview`:
  `SEED_PERMITIDO=true SEED_CONTRASENA_ADMIN='<12+ caracteres>' npm run seed`.
  Se niega a correr contra cualquier otra base.
- Nunca datos reales en local, CI ni previews, sin excepciones. Los respaldos reales se prueban solo en una base
  desechable de Neon (ver «Restaurar un respaldo»); en el equipo local solo se restauran datos inventados.

## Vercel (proyecto `sunbaja-guia`)

- Build: lo define `vercel.json` (`npm run build:vercel`: migra con `DATABASE_URL_UNPOOLED` y construye). Región `iad1`.
- Producción solo desde `main`.
- Integración de Neon: región `aws-us-east-1`; **sin** branches automáticos para previews; sus variables solo en Production.
  PostGIS debe estar disponible en la base (Neon lo soporta). No lo crea la migración sino el adaptador de Payload
  al conectarse (`createExtensions()`, `CREATE EXTENSION IF NOT EXISTS "postgis"`); si el rol de la conexión no
  puede crearla, el build falla con un error de `geometry`. En ese caso, crearla una vez a mano en el editor SQL de
  Neon (`CREATE EXTENSION IF NOT EXISTS postgis;`) en la base de producción y en la de `preview`.
- `unaccent` (búsqueda): a diferencia de PostGIS, la crea la migración `busqueda`
  (`CREATE EXTENSION IF NOT EXISTS unaccent`). Neon la permite; si el rol no pudiera, el build falla en esa migración
  y se crea una vez a mano igual que PostGIS (`CREATE EXTENSION IF NOT EXISTS unaccent;`) en producción y en `preview`.
- Node: `engines` fija `^24.22.1`; en Vercel (Settings > Build and Deployment > Node.js Version) dejar **24.x**.
  Subir a otra versión mayor es una decisión explícita (PR que cambie `engines`, `.nvmrc` y AGENTS.md).
- Variables de Preview a mano (spec §5.3 y §5.5): `DATABASE_URL` y `DATABASE_URL_UNPOOLED` de la base `preview`, bucket
  `guia-media-preview` y su llave, otro `PAYLOAD_SECRET`, llaves de prueba de Turnstile, `GUIA_INDEXABLE=false`.
- Antes de autorizar el preview de un PR externo: leer el diff completo.
- Base `preview` rota: borrarla, crearla vacía en Neon y correr
  `SEED_PERMITIDO=true SEED_CONTRASENA_ADMIN='<12+ caracteres>' npm run seed` con sus variables.
- **Correo:** con `RESEND_API_KEY` definida salen por Resend los avisos de Solicitudes **y** los de restablecer
  contraseña del admin (`/admin` > «¿Olvidaste tu contraseña?»). Sin la llave (local, CI) el adaptador
  `src/correo/silencioso.ts` descarta los mensajes y solo registra el asunto, nunca direcciones; entonces quien olvide
  su contraseña se la pide a un admin, que la cambia desde `/admin` > Usuarios (o la desbloquea si se bloqueó).
- Desde el primer deploy a producción: **prohibido** `npm run migracion:regenerar`; toda migración nueva con
  `npm run payload migrate:create <nombre>` (AGENTS.md).

## Variables de F3c (formulario, correo y crones)

Se ponen en Vercel > Settings > Environment Variables, una vez para **Production** y otra para **Preview**, con
valores distintos. Cambiar una variable no toca los deploys ya hechos: hace falta un redeploy.

- `IP_HASH_SALT`: cadena larga al azar (por ejemplo `openssl rand -hex 32`); otra en Preview. **Vacía, cada envío del
  formulario falla** con el error genérico («no se pudo enviar») antes de guardar nada. No se cambia sin motivo: con
  otra sal, los envíos de la última hora dejan de contar para el límite de 5 por IP.
- `CRON_SECRET`: cadena larga al azar (16+ caracteres). Al definirla, Vercel la manda sola a cada cron como
  `Authorization: Bearer …`. **Sin ella, cada cron responde 401**: no corren la publicación programada, la purga del
  `ipHash` a las 24 h ni la anonimización diaria (spec §12). En Preview, otro valor (los crones no corren ahí, pero
  así se puede llamar a mano).
- `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`: en Cloudflare > Turnstile, un widget con los hostnames
  `www.salysoltours.com` y `sunbaja-guia.vercel.app`. En Preview, las llaves de prueba (`1x00000000000000000000AA` y
  `1x0000000000000000000000000000000AA`). La site key queda dentro del HTML de la página del formulario, que es ISR:
  cambiar las llaves exige un redeploy, y hasta entonces el HTML guardado trae la site key vieja y el widget falla la
  verificación. Cambiar las dos juntas.
- `RESEND_API_KEY` / `CORREO_REMITENTE`: llave de Resend de esta app y un remitente de un dominio **verificado** en
  Resend (registros SPF y DKIM del dominio en su DNS; si no, Resend rechaza o el correo cae en spam). Sin
  `CORREO_REMITENTE` se usa `guia@salysoltours.com`. Desde que existe la llave también salen los correos de
  restablecer contraseña. En Preview, una llave de previews (o vacía: entonces no sale ningún correo).
- `GUIA_PROXY_SECRET`: el mismo valor que en el sitio de reservas (spec §4.1); otro en Preview. El rewrite del sitio de
  reservas debe seguir mandando `x-guia-proxy` (y `x-guia-ip`). El `proxy.ts` de la Guía la cambia por la cabecera
  interna `x-guia-sello` (HMAC del secreto, nunca el secreto); la Server Action del formulario solo cree el origen y
  la IP reenviados si traen ese sello. No hay nada que configurar para el sello: sale del mismo secreto. Sin sello
  válido la petición se trata como directa y su IP es el `x-real-ip` que pone Vercel.

## Crones (Vercel Cron, `vercel.json`)

- `/api/cron/hora` a las `5 * * * *` (minuto 5 de cada hora, UTC): corre la cola de Payload (publicaciones
  programadas), revalida lo que cambió por fechas y borra los `ipHash` de más de 24 h. `/api/cron/diario` a las
  `15 9 * * *` (09:15 UTC, 02:15 en BCS): anonimiza Solicitudes (spec §12).
- El cron de cada hora necesita **Vercel Pro** (Hobby solo permite uno al día). Los crones corren **solo en el deploy
  de producción**, nunca en previews.
- Una publicación programada sale en la siguiente corrida del minuto 5: hasta unos **65 minutos** después de la hora
  elegida en el admin. Para publicar al momento, publicar a mano.
- Revisar que corren: Vercel > proyecto > Settings > Cron Jobs (lista, último resultado y botón «Run» para correrlo a
  mano) y Logs filtrando por la ruta `/api/cron/hora` o `/api/cron/diario`. Responden 200 con un JSON de conteos; 500
  si algún paso falló (el JSON trae `fallos` con el nombre del paso o `job:<id>`, nunca datos personales); 401 si falta
  o no coincide `CRON_SECRET`.

## Búsqueda

- `npm run busqueda:reindexar` vuelve a llenar el índice de búsqueda. Se corre después de restaurar un respaldo o de cambiar `src/busqueda/filas.ts`.

## Base `preview`

- Cuando un PR rehace `inicial`, se borra la base `preview` (`npx payload migrate:fresh` con su `DATABASE_URL`) y se corre el seed antes de autorizar el preview.

## Seguridad del primer deploy a producción

Hacer estos dos pasos el mismo día del primer deploy, antes de compartir ninguna URL.

1. **Ventana del primer usuario.** Mientras la tabla `users` esté vacía, `/admin/create-first-user` y
   `POST /api/users/first-register` están abiertas a cualquiera, y quien las use queda como admin (el primer
   usuario siempre es admin). Inmediatamente después del primer deploy con migraciones aplicadas:
   - Entrar a `https://<dominio-del-deploy>/admin`, crear el admin del dueño (contraseña de 12+ caracteres, del
     gestor de contraseñas) **antes** de dar la URL a nadie ni de configurar el dominio público.
   - Verificar que la ruta ya se cierra: `/admin/create-first-user` redirige al login y
     `curl -s -o /dev/null -w "%{http_code}
" -X POST https://<dominio-del-deploy>/api/users/first-register -H 'content-type: application/json' -d '{"email":"x@prueba.test","password":"una-contrasena-larga-1","nombrePublico":"X"}'`
     responde 403 (Forbidden). Hacerlo solo después de crear el admin: si respondiera 200 habría creado un usuario.
   - Los previews usan otra base (`preview`), con su propio primer usuario (lo crea el seed).
2. **Regla de firewall de Vercel para el login** (spec §11): limitar `POST /api/users/login` por IP. El bloqueo de
   Payload (5 intentos fallidos, 10 minutos) es por cuenta; esta regla frena el abuso por IP y el relleno de
   credenciales sobre muchas cuentas. En el proyecto: Firewall > Configure > Add New Rule.
   - Nombre: `limite-login-admin`.
   - Condición: *Request Path* **equals** `/api/users/login` (y, si se quiere, *Method* equals `POST`).
   - Acción: **Rate Limit**, ventana fija de 60 s, **10 solicitudes** por **IP**; al superarla, responder 429
     (opcionalmente con denegación posterior de 10 minutos).
   - Guardar y **Publish** (los cambios del firewall no aplican hasta publicarlos).
   - Comprobar con 11 intentos seguidos desde una misma IP (credenciales falsas): el 11.º responde 429.
   - El spec (§11) no fija cifras; 10 por minuto por IP deja pasar a una persona que se equivoca y frena la
     automatización. Si se ajustan, anotar aquí el valor final. Nota: la regla depende de que el slug de la
     colección siga siendo `users`.
   - Opcional, misma forma: `/api/users/forgot-password` y `/api/users/first-register`.

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
- CORS de `guia-media-preview` (los admins de preview corren en un origen distinto por cada deploy,
  `https://sunbaja-guia-<hash>-<equipo>.vercel.app`, y suben directo al bucket): los orígenes cambian en cada deploy
  y este bucket solo contiene datos inventados, así que se permite cualquier origen y solo `PUT`/`GET`:
  ```json
  [{ "AllowedOrigins": ["*"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }]
  ```
  (Si se prefiere restringir, listar el dominio fijo de la rama/preview de Vercel como en `guia-media`.)
  No usar `*` en `guia-media` ni en `guia-respaldos`.
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
4. Comprobar que la pública corresponde a la privada guardada, antes del primer respaldo (si no coinciden, los
   respaldos quedarían ilegibles):
   ```bash
   test "$(age-keygen -y guia-respaldos.key)" = "$(tr -d '\r\n' < ops/respaldo.age.pub)" && echo "coinciden" || echo "NO COINCIDEN"
   ```
5. **Hacer los pasos 1 a 4 antes de que el workflow llegue a `main`.** Sin `ops/respaldo.age.pub` el job `base`
   falla a propósito todos los días.

## Restaurar un respaldo

Los respaldos de la base son volcados de `pg_dump` (formato custom) cifrados con `age`. El volcado trae
`CREATE EXTENSION postgis`, así que **el servidor de destino debe tener PostGIS** (en un Postgres sin PostGIS,
`pg_restore` falla con `extension "postgis" is not available`). Misma versión mayor de Postgres que el origen (17).

El volcado de producción contiene datos reales (correos, teléfonos, hashes de IP). Reglas:

- Un respaldo real se restaura **solo** en una base de Neon nueva y vacía, desechable, separada de producción
  (un proyecto nuevo o una base nueva en un proyecto aparte). **Nunca un branch de producción** (es una copia de
  los datos reales), nunca la base `preview`, nunca producción, nunca Docker local.
- El volcado descifrado **nunca se guarda en un equipo personal**. Se descifra en el mismo comando que lo restaura
  (por tubería, sin archivo intermedio). Solo el archivo `.dump.age` (cifrado) puede tocar el disco.
- La base restaurada se verifica con consultas de solo lectura (conteos) y se borra al terminar.
- No se apunta la app (`npm run dev`) a esa base ni se abre `/admin` contra ella.

### Prueba real: respaldo de producción a una base desechable de Neon

```bash
# 1. Base destino: en Neon, crear una base NUEVA y VACÍA (proyecto desechable aparte, no un branch de producción)
#    y habilitar PostGIS (en su editor SQL: CREATE EXTENSION IF NOT EXISTS postgis;).
#    Pegar su URL directa (sin pooler) sin dejarla en el historial del shell (no se muestra al teclear):
read -rs URL_DESTINO; export URL_DESTINO

# 2. Bajar el respaldo cifrado (el .age sí puede estar en disco)
read -rs AWS_ACCESS_KEY_ID; read -rs AWS_SECRET_ACCESS_KEY; export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=auto AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
ENDPOINT=https://<cuenta>.r2.cloudflarestorage.com
aws s3 ls s3://guia-respaldos/base/ --endpoint-url "$ENDPOINT"
aws s3 cp s3://guia-respaldos/base/<archivo>.dump.age . --endpoint-url "$ENDPOINT"

# 3. Descifrar y restaurar en el mismo paso, sin dejar el volcado en claro
#    (llave privada: pegarla desde el gestor de contraseñas en guia-respaldos.key y borrarla al terminar)
set -o pipefail   # si falla el descifrado, el comando completo falla (no sale con 0)
age --decrypt --identity guia-respaldos.key <archivo>.dump.age \
  | pg_restore --no-owner --no-acl --dbname "$URL_DESTINO"

# 4. Verificar con consultas de solo lectura
psql "$URL_DESTINO" -c "select extname from pg_extension" \
  -c "select count(*) from users" -c "select count(*) from lugares" -c "select count(*) from zonas"

# 5. Limpiar: borrar el proyecto/base desechable en Neon, y localmente:
rm -f <archivo>.dump.age guia-respaldos.key
unset URL_DESTINO AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
```

Idealmente los pasos 3 y 4 corren en un contenedor temporal sin carpetas montadas
(`docker run --rm -it postgres:17`, con `age` instalado dentro) para no dejar nada en el equipo.
Anotar el resultado en el registro de abajo.

### Imágenes

Las imágenes no están en el volcado: viven en R2 y se respaldan en `s3://guia-respaldos/media/<fecha>/`.

- **Prueba de restauración:** sincronizar a un bucket **desechable** creado solo para la prueba
  (por ejemplo `guia-restauracion-prueba`, con una llave propia limitada a él) y borrarlo, con su llave, al terminar:
  `aws s3 sync s3://guia-respaldos/media/<fecha> s3://guia-restauracion-prueba --endpoint-url "$ENDPOINT"`.
  **Prohibido** usar `guia-media` (producción) y `guia-media-preview` como destino de una prueba.
- **Recuperación real ante desastre** (se perdió o corrompió `guia-media`): escribir de vuelta en `guia-media` es un
  paso aparte, explícito y decidido por el dueño, nunca parte de una prueba, y **nunca con `--delete`**.

### Simulacro local con datos inventados

Para ensayar el procedimiento sin datos reales (por ejemplo, tras `npm run seed` en la base local `guia`, con un
volcado hecho por ti mismo y una llave `age` de prueba), el destino es un contenedor local con PostGIS:

```bash
docker run -d --name guia-restauracion -e POSTGRES_PASSWORD=desechable -p 127.0.0.1:55432:5432 postgis/postgis:17-3.5
until docker exec guia-restauracion pg_isready -h 127.0.0.1 -U postgres; do sleep 2; done
docker exec guia-restauracion createdb -h 127.0.0.1 -U postgres restaurada
docker exec -i guia-restauracion pg_restore --no-owner --no-acl -h 127.0.0.1 -U postgres -d restaurada < simulacro.dump
docker exec guia-restauracion psql -h 127.0.0.1 -U postgres -d restaurada -c "select count(*) from users"
docker rm -f -v guia-restauracion
rm simulacro.dump
```

(El puerto 55432 evita chocar con el de desarrollo, 5433.)

## Verificaciones de F2 (con cuentas de F0)

- [ ] Subir desde el admin de producción una foto de teléfono de **más de 10 MB** con `clientUploads` activo (spec §4.2):
      se guarda y en R2 (`guia-media`) aparecen los cuatro tamaños (`s480`, `s960`, `s1600`, `og`) además del
      original, servidos desde el dominio público del bucket. Si con subida directa no se generan, anotarlo aquí y
      aplicar el plan B del spec §4.2 (reducir en el navegador a menos de 4 MB antes de subir).
- [ ] Comprobar que un alta rechazada (por ejemplo, un archivo de 25 MB o un PDF) no deja el documento y revisar si
      quedó un objeto huérfano en R2; confirmar que la regla de ciclo de vida de arriba está puesta.
- [ ] Correr «Respaldo» a mano (`workflow_dispatch`, rama `main`) y ver `base/<fecha>.dump.age` y `media/<fecha>/`
      en `guia-respaldos`. Antes debe existir `ops/respaldo.age.pub`.
- [ ] Prueba real de restauración en una base desechable de Neon (arriba) y anotarla en el registro.

## Registro de pruebas de restauración

Antes del lanzamiento y luego cada 3 meses (spec §5.4).

| Fecha | Respaldo usado | Quién | Resultado |
|---|---|---|---|
