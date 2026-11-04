import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('es', 'en');
  CREATE TYPE "public"."enum_users_rol" AS ENUM('admin', 'editor');
  CREATE TYPE "public"."enum_categorias_aplica_a" AS ENUM('lugar', 'evento', 'ambos');
  CREATE TYPE "public"."enum_categorias_tipo_schema" AS ENUM('Restaurant', 'CafeOrCoffeeShop', 'BarOrPub', 'Store', 'TouristAttraction', 'Beach', 'LocalBusiness');
  CREATE TYPE "public"."enum_categorias_grupo" AS ENUM('mar', 'aire-libre', 'comer-y-salir', 'lo-local');
  CREATE TYPE "public"."enum_lugares_horario_dia" AS ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');
  CREATE TYPE "public"."enum_lugares_caracteristicas" AS ENUM('para-ninos', 'con-comida', 'solo-con-tour');
  CREATE TYPE "public"."enum_lugares_rango_precio" AS ENUM('$', '$$', '$$$', '$$$$');
  CREATE TYPE "public"."enum_lugares_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__lugares_v_version_horario_dia" AS ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');
  CREATE TYPE "public"."enum__lugares_v_version_caracteristicas" AS ENUM('para-ninos', 'con-comida', 'solo-con-tour');
  CREATE TYPE "public"."enum__lugares_v_version_rango_precio" AS ENUM('$', '$$', '$$$', '$$$$');
  CREATE TYPE "public"."enum__lugares_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__lugares_v_published_locale" AS ENUM('es', 'en');
  CREATE TYPE "public"."enum_eventos_inicio_tz" AS ENUM('America/Mazatlan');
  CREATE TYPE "public"."enum_eventos_fin_tz" AS ENUM('America/Mazatlan');
  CREATE TYPE "public"."enum_eventos_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__eventos_v_version_inicio_tz" AS ENUM('America/Mazatlan');
  CREATE TYPE "public"."enum__eventos_v_version_fin_tz" AS ENUM('America/Mazatlan');
  CREATE TYPE "public"."enum__eventos_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__eventos_v_published_locale" AS ENUM('es', 'en');
  CREATE TYPE "public"."enum_articulos_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articulos_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articulos_v_published_locale" AS ENUM('es', 'en');
  CREATE TYPE "public"."enum_solicitudes_estado" AS ENUM('nueva', 'en-contacto', 'aceptada', 'rechazada');
  CREATE TYPE "public"."enum_redirects_to_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_redirects_type" AS ENUM('308');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre_publico" varchar NOT NULL,
  	"rol" "enum_users_rol" DEFAULT 'editor',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt_es" varchar NOT NULL,
  	"alt_en" varchar NOT NULL,
  	"credito" varchar,
  	"prefix" varchar DEFAULT '',
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_s480_url" varchar,
  	"sizes_s480_width" numeric,
  	"sizes_s480_height" numeric,
  	"sizes_s480_mime_type" varchar,
  	"sizes_s480_filesize" numeric,
  	"sizes_s480_filename" varchar,
  	"sizes_s960_url" varchar,
  	"sizes_s960_width" numeric,
  	"sizes_s960_height" numeric,
  	"sizes_s960_mime_type" varchar,
  	"sizes_s960_filesize" numeric,
  	"sizes_s960_filename" varchar,
  	"sizes_s1600_url" varchar,
  	"sizes_s1600_width" numeric,
  	"sizes_s1600_height" numeric,
  	"sizes_s1600_mime_type" varchar,
  	"sizes_s1600_filesize" numeric,
  	"sizes_s1600_filename" varchar,
  	"sizes_og_url" varchar,
  	"sizes_og_width" numeric,
  	"sizes_og_height" numeric,
  	"sizes_og_mime_type" varchar,
  	"sizes_og_filesize" numeric,
  	"sizes_og_filename" varchar
  );
  
  CREATE TABLE "zonas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"foto_id" integer,
  	"coordenadas" geometry(Point),
  	"orden" numeric DEFAULT 100,
  	"activa" boolean DEFAULT false,
  	"sede_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "zonas_locales" (
  	"nombre" varchar NOT NULL,
  	"descripcion" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "categorias" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"aplica_a" "enum_categorias_aplica_a" DEFAULT 'lugar' NOT NULL,
  	"tipo_schema" "enum_categorias_tipo_schema" DEFAULT 'LocalBusiness' NOT NULL,
  	"grupo" "enum_categorias_grupo" NOT NULL,
  	"orden" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "categorias_locales" (
  	"nombre" varchar NOT NULL,
  	"slug" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "lugares_horario" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"dia" "enum_lugares_horario_dia",
  	"abre" varchar,
  	"cierra" varchar
  );
  
  CREATE TABLE "lugares_caracteristicas" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_lugares_caracteristicas",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "lugares" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar,
  	"zona_id" integer,
  	"direccion" varchar,
  	"coordenadas" geometry(Point),
  	"telefono" varchar,
  	"whatsapp" varchar,
  	"web" varchar,
  	"instagram" varchar,
  	"rango_precio" "enum_lugares_rango_precio",
  	"orden" numeric DEFAULT 100,
  	"destacado_en_portada" boolean DEFAULT false,
  	"orden_destacado" numeric DEFAULT 100,
  	"patrocinio_activo" boolean DEFAULT false,
  	"patrocinio_desde" timestamp(3) with time zone,
  	"patrocinio_hasta" timestamp(3) with time zone,
  	"patrocinio_nota_interna" varchar,
  	"seo_no_indexar" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_lugares_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "lugares_locales" (
  	"slug" varchar,
  	"resumen" varchar,
  	"cuerpo" jsonb,
  	"nota_horario" varchar,
  	"seo_meta_titulo" varchar,
  	"seo_meta_descripcion" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "lugares_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "_lugares_v_version_horario" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"dia" "enum__lugares_v_version_horario_dia",
  	"abre" varchar,
  	"cierra" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_lugares_v_version_caracteristicas" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__lugares_v_version_caracteristicas",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_lugares_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_nombre" varchar,
  	"version_zona_id" integer,
  	"version_direccion" varchar,
  	"version_coordenadas" geometry(Point),
  	"version_telefono" varchar,
  	"version_whatsapp" varchar,
  	"version_web" varchar,
  	"version_instagram" varchar,
  	"version_rango_precio" "enum__lugares_v_version_rango_precio",
  	"version_orden" numeric DEFAULT 100,
  	"version_destacado_en_portada" boolean DEFAULT false,
  	"version_orden_destacado" numeric DEFAULT 100,
  	"version_patrocinio_activo" boolean DEFAULT false,
  	"version_patrocinio_desde" timestamp(3) with time zone,
  	"version_patrocinio_hasta" timestamp(3) with time zone,
  	"version_patrocinio_nota_interna" varchar,
  	"version_seo_no_indexar" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__lugares_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__lugares_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_lugares_v_locales" (
  	"version_slug" varchar,
  	"version_resumen" varchar,
  	"version_cuerpo" jsonb,
  	"version_nota_horario" varchar,
  	"version_seo_meta_titulo" varchar,
  	"version_seo_meta_descripcion" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_lugares_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "eventos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"zona_id" integer,
  	"lugar_id" integer,
  	"direccion_libre" varchar,
  	"inicio" timestamp(3) with time zone,
  	"inicio_tz" "enum_eventos_inicio_tz" DEFAULT 'America/Mazatlan',
  	"fin" timestamp(3) with time zone,
  	"fin_tz" "enum_eventos_fin_tz" DEFAULT 'America/Mazatlan',
  	"gratis" boolean DEFAULT false,
  	"url_boletos" varchar,
  	"patrocinio_activo" boolean DEFAULT false,
  	"patrocinio_desde" timestamp(3) with time zone,
  	"patrocinio_hasta" timestamp(3) with time zone,
  	"patrocinio_nota_interna" varchar,
  	"destacado_en_portada" boolean DEFAULT false,
  	"orden_destacado" numeric DEFAULT 100,
  	"seo_no_indexar" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_eventos_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "eventos_locales" (
  	"nombre" varchar,
  	"slug" varchar,
  	"precio" varchar,
  	"resumen" varchar,
  	"cuerpo" jsonb,
  	"seo_meta_titulo" varchar,
  	"seo_meta_descripcion" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "eventos_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "_eventos_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_zona_id" integer,
  	"version_lugar_id" integer,
  	"version_direccion_libre" varchar,
  	"version_inicio" timestamp(3) with time zone,
  	"version_inicio_tz" "enum__eventos_v_version_inicio_tz" DEFAULT 'America/Mazatlan',
  	"version_fin" timestamp(3) with time zone,
  	"version_fin_tz" "enum__eventos_v_version_fin_tz" DEFAULT 'America/Mazatlan',
  	"version_gratis" boolean DEFAULT false,
  	"version_url_boletos" varchar,
  	"version_patrocinio_activo" boolean DEFAULT false,
  	"version_patrocinio_desde" timestamp(3) with time zone,
  	"version_patrocinio_hasta" timestamp(3) with time zone,
  	"version_patrocinio_nota_interna" varchar,
  	"version_destacado_en_portada" boolean DEFAULT false,
  	"version_orden_destacado" numeric DEFAULT 100,
  	"version_seo_no_indexar" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__eventos_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__eventos_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_eventos_v_locales" (
  	"version_nombre" varchar,
  	"version_slug" varchar,
  	"version_precio" varchar,
  	"version_resumen" varchar,
  	"version_cuerpo" jsonb,
  	"version_seo_meta_titulo" varchar,
  	"version_seo_meta_descripcion" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_eventos_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "articulos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"portada_id" integer,
  	"autor_id" integer,
  	"autor_nombre" varchar,
  	"publicado_el" timestamp(3) with time zone,
  	"actualizado_el" timestamp(3) with time zone,
  	"destacado_en_portada" boolean DEFAULT false,
  	"orden_destacado" numeric DEFAULT 100,
  	"seo_no_indexar" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_articulos_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "articulos_locales" (
  	"titulo" varchar,
  	"slug" varchar,
  	"resumen" varchar,
  	"cuerpo" jsonb,
  	"seo_meta_titulo" varchar,
  	"seo_meta_descripcion" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "articulos_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"zonas_id" integer,
  	"categorias_id" integer
  );
  
  CREATE TABLE "_articulos_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_portada_id" integer,
  	"version_autor_id" integer,
  	"version_autor_nombre" varchar,
  	"version_publicado_el" timestamp(3) with time zone,
  	"version_actualizado_el" timestamp(3) with time zone,
  	"version_destacado_en_portada" boolean DEFAULT false,
  	"version_orden_destacado" numeric DEFAULT 100,
  	"version_seo_no_indexar" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__articulos_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__articulos_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_articulos_v_locales" (
  	"version_titulo" varchar,
  	"version_slug" varchar,
  	"version_resumen" varchar,
  	"version_cuerpo" jsonb,
  	"version_seo_meta_titulo" varchar,
  	"version_seo_meta_descripcion" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_articulos_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"zonas_id" integer,
  	"categorias_id" integer
  );
  
  CREATE TABLE "solicitudes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"negocio" varchar NOT NULL,
  	"giro" varchar,
  	"zona_texto" varchar,
  	"zona_id" integer,
  	"contacto_nombre" varchar,
  	"correo" varchar,
  	"telefono" varchar,
  	"web_o_instagram" varchar,
  	"mensaje" varchar,
  	"acepto_privacidad" boolean DEFAULT false NOT NULL,
  	"version_aviso" varchar,
  	"ip_hash" varchar,
  	"estado" "enum_solicitudes_estado" DEFAULT 'nueva',
  	"notas_internas" varchar,
  	"lugar_creado_id" integer,
  	"anonimizada_el" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to_type" "enum_redirects_to_type" DEFAULT 'reference',
  	"to_url" varchar,
  	"type" "enum_redirects_type" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"lugares_id" integer,
  	"eventos_id" integer,
  	"articulos_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"zonas_id" integer,
  	"categorias_id" integer,
  	"lugares_id" integer,
  	"eventos_id" integer,
  	"articulos_id" integer,
  	"solicitudes_id" integer,
  	"redirects_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ajustes_guia_correos_aviso" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"correo" varchar NOT NULL
  );
  
  CREATE TABLE "ajustes_guia" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"correo_privacidad" varchar,
  	"formulario_activo" boolean DEFAULT false,
  	"version_aviso" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "ajustes_guia_locales" (
  	"portada_titulo" varchar,
  	"portada_intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "zonas" ADD CONSTRAINT "zonas_foto_id_media_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "zonas_locales" ADD CONSTRAINT "zonas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."zonas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categorias_locales" ADD CONSTRAINT "categorias_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lugares_horario" ADD CONSTRAINT "lugares_horario_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lugares"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lugares_caracteristicas" ADD CONSTRAINT "lugares_caracteristicas_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."lugares"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lugares" ADD CONSTRAINT "lugares_zona_id_zonas_id_fk" FOREIGN KEY ("zona_id") REFERENCES "public"."zonas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lugares_locales" ADD CONSTRAINT "lugares_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lugares"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lugares_rels" ADD CONSTRAINT "lugares_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."lugares"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lugares_rels" ADD CONSTRAINT "lugares_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lugares_rels" ADD CONSTRAINT "lugares_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lugares_v_version_horario" ADD CONSTRAINT "_lugares_v_version_horario_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lugares_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lugares_v_version_caracteristicas" ADD CONSTRAINT "_lugares_v_version_caracteristicas_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_lugares_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lugares_v" ADD CONSTRAINT "_lugares_v_parent_id_lugares_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."lugares"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_lugares_v" ADD CONSTRAINT "_lugares_v_version_zona_id_zonas_id_fk" FOREIGN KEY ("version_zona_id") REFERENCES "public"."zonas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_lugares_v_locales" ADD CONSTRAINT "_lugares_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lugares_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lugares_v_rels" ADD CONSTRAINT "_lugares_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_lugares_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lugares_v_rels" ADD CONSTRAINT "_lugares_v_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lugares_v_rels" ADD CONSTRAINT "_lugares_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "eventos" ADD CONSTRAINT "eventos_zona_id_zonas_id_fk" FOREIGN KEY ("zona_id") REFERENCES "public"."zonas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "eventos" ADD CONSTRAINT "eventos_lugar_id_lugares_id_fk" FOREIGN KEY ("lugar_id") REFERENCES "public"."lugares"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "eventos_locales" ADD CONSTRAINT "eventos_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "eventos_rels" ADD CONSTRAINT "eventos_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "eventos_rels" ADD CONSTRAINT "eventos_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "eventos_rels" ADD CONSTRAINT "eventos_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_eventos_v" ADD CONSTRAINT "_eventos_v_parent_id_eventos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."eventos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_eventos_v" ADD CONSTRAINT "_eventos_v_version_zona_id_zonas_id_fk" FOREIGN KEY ("version_zona_id") REFERENCES "public"."zonas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_eventos_v" ADD CONSTRAINT "_eventos_v_version_lugar_id_lugares_id_fk" FOREIGN KEY ("version_lugar_id") REFERENCES "public"."lugares"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_eventos_v_locales" ADD CONSTRAINT "_eventos_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_eventos_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_eventos_v_rels" ADD CONSTRAINT "_eventos_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_eventos_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_eventos_v_rels" ADD CONSTRAINT "_eventos_v_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_eventos_v_rels" ADD CONSTRAINT "_eventos_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articulos" ADD CONSTRAINT "articulos_portada_id_media_id_fk" FOREIGN KEY ("portada_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articulos" ADD CONSTRAINT "articulos_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articulos_locales" ADD CONSTRAINT "articulos_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articulos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articulos_rels" ADD CONSTRAINT "articulos_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articulos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articulos_rels" ADD CONSTRAINT "articulos_rels_zonas_fk" FOREIGN KEY ("zonas_id") REFERENCES "public"."zonas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articulos_rels" ADD CONSTRAINT "articulos_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articulos_v" ADD CONSTRAINT "_articulos_v_parent_id_articulos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articulos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articulos_v" ADD CONSTRAINT "_articulos_v_version_portada_id_media_id_fk" FOREIGN KEY ("version_portada_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articulos_v" ADD CONSTRAINT "_articulos_v_version_autor_id_users_id_fk" FOREIGN KEY ("version_autor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articulos_v_locales" ADD CONSTRAINT "_articulos_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articulos_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articulos_v_rels" ADD CONSTRAINT "_articulos_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_articulos_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articulos_v_rels" ADD CONSTRAINT "_articulos_v_rels_zonas_fk" FOREIGN KEY ("zonas_id") REFERENCES "public"."zonas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articulos_v_rels" ADD CONSTRAINT "_articulos_v_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_zona_id_zonas_id_fk" FOREIGN KEY ("zona_id") REFERENCES "public"."zonas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_lugar_creado_id_lugares_id_fk" FOREIGN KEY ("lugar_creado_id") REFERENCES "public"."lugares"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_lugares_fk" FOREIGN KEY ("lugares_id") REFERENCES "public"."lugares"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_eventos_fk" FOREIGN KEY ("eventos_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_articulos_fk" FOREIGN KEY ("articulos_id") REFERENCES "public"."articulos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_zonas_fk" FOREIGN KEY ("zonas_id") REFERENCES "public"."zonas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lugares_fk" FOREIGN KEY ("lugares_id") REFERENCES "public"."lugares"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_eventos_fk" FOREIGN KEY ("eventos_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articulos_fk" FOREIGN KEY ("articulos_id") REFERENCES "public"."articulos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_solicitudes_fk" FOREIGN KEY ("solicitudes_id") REFERENCES "public"."solicitudes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ajustes_guia_correos_aviso" ADD CONSTRAINT "ajustes_guia_correos_aviso_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ajustes_guia"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ajustes_guia_locales" ADD CONSTRAINT "ajustes_guia_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ajustes_guia"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_s480_sizes_s480_filename_idx" ON "media" USING btree ("sizes_s480_filename");
  CREATE INDEX "media_sizes_s960_sizes_s960_filename_idx" ON "media" USING btree ("sizes_s960_filename");
  CREATE INDEX "media_sizes_s1600_sizes_s1600_filename_idx" ON "media" USING btree ("sizes_s1600_filename");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "media" USING btree ("sizes_og_filename");
  CREATE UNIQUE INDEX "zonas_slug_idx" ON "zonas" USING btree ("slug");
  CREATE INDEX "zonas_foto_idx" ON "zonas" USING btree ("foto_id");
  CREATE UNIQUE INDEX "zonas_sede_slug_idx" ON "zonas" USING btree ("sede_slug");
  CREATE INDEX "zonas_updated_at_idx" ON "zonas" USING btree ("updated_at");
  CREATE INDEX "zonas_created_at_idx" ON "zonas" USING btree ("created_at");
  CREATE UNIQUE INDEX "zonas_locales_locale_parent_id_unique" ON "zonas_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "zonas_locales_parent_id_idx" ON "zonas_locales" USING btree ("_parent_id");
  CREATE INDEX "categorias_updated_at_idx" ON "categorias" USING btree ("updated_at");
  CREATE INDEX "categorias_created_at_idx" ON "categorias" USING btree ("created_at");
  CREATE UNIQUE INDEX "categorias_slug_idx" ON "categorias_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "categorias_locales_locale_parent_id_unique" ON "categorias_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categorias_locales_parent_id_idx" ON "categorias_locales" USING btree ("_parent_id");
  CREATE INDEX "lugares_horario_order_idx" ON "lugares_horario" USING btree ("_order");
  CREATE INDEX "lugares_horario_parent_id_idx" ON "lugares_horario" USING btree ("_parent_id");
  CREATE INDEX "lugares_caracteristicas_order_idx" ON "lugares_caracteristicas" USING btree ("order");
  CREATE INDEX "lugares_caracteristicas_parent_idx" ON "lugares_caracteristicas" USING btree ("parent_id");
  CREATE INDEX "lugares_zona_idx" ON "lugares" USING btree ("zona_id");
  CREATE INDEX "lugares_destacado_en_portada_idx" ON "lugares" USING btree ("destacado_en_portada");
  CREATE INDEX "lugares_updated_at_idx" ON "lugares" USING btree ("updated_at");
  CREATE INDEX "lugares_created_at_idx" ON "lugares" USING btree ("created_at");
  CREATE INDEX "lugares__status_idx" ON "lugares" USING btree ("_status");
  CREATE UNIQUE INDEX "lugares_slug_idx" ON "lugares_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "lugares_locales_locale_parent_id_unique" ON "lugares_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lugares_locales_parent_id_idx" ON "lugares_locales" USING btree ("_parent_id");
  CREATE INDEX "lugares_rels_order_idx" ON "lugares_rels" USING btree ("order");
  CREATE INDEX "lugares_rels_parent_idx" ON "lugares_rels" USING btree ("parent_id");
  CREATE INDEX "lugares_rels_path_idx" ON "lugares_rels" USING btree ("path");
  CREATE INDEX "lugares_rels_categorias_id_idx" ON "lugares_rels" USING btree ("categorias_id");
  CREATE INDEX "lugares_rels_media_id_idx" ON "lugares_rels" USING btree ("media_id");
  CREATE INDEX "_lugares_v_version_horario_order_idx" ON "_lugares_v_version_horario" USING btree ("_order");
  CREATE INDEX "_lugares_v_version_horario_parent_id_idx" ON "_lugares_v_version_horario" USING btree ("_parent_id");
  CREATE INDEX "_lugares_v_version_caracteristicas_order_idx" ON "_lugares_v_version_caracteristicas" USING btree ("order");
  CREATE INDEX "_lugares_v_version_caracteristicas_parent_idx" ON "_lugares_v_version_caracteristicas" USING btree ("parent_id");
  CREATE INDEX "_lugares_v_parent_idx" ON "_lugares_v" USING btree ("parent_id");
  CREATE INDEX "_lugares_v_version_version_zona_idx" ON "_lugares_v" USING btree ("version_zona_id");
  CREATE INDEX "_lugares_v_version_version_destacado_en_portada_idx" ON "_lugares_v" USING btree ("version_destacado_en_portada");
  CREATE INDEX "_lugares_v_version_version_updated_at_idx" ON "_lugares_v" USING btree ("version_updated_at");
  CREATE INDEX "_lugares_v_version_version_created_at_idx" ON "_lugares_v" USING btree ("version_created_at");
  CREATE INDEX "_lugares_v_version_version__status_idx" ON "_lugares_v" USING btree ("version__status");
  CREATE INDEX "_lugares_v_created_at_idx" ON "_lugares_v" USING btree ("created_at");
  CREATE INDEX "_lugares_v_updated_at_idx" ON "_lugares_v" USING btree ("updated_at");
  CREATE INDEX "_lugares_v_snapshot_idx" ON "_lugares_v" USING btree ("snapshot");
  CREATE INDEX "_lugares_v_published_locale_idx" ON "_lugares_v" USING btree ("published_locale");
  CREATE INDEX "_lugares_v_latest_idx" ON "_lugares_v" USING btree ("latest");
  CREATE INDEX "_lugares_v_version_version_slug_idx" ON "_lugares_v_locales" USING btree ("version_slug","_locale");
  CREATE UNIQUE INDEX "_lugares_v_locales_locale_parent_id_unique" ON "_lugares_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_lugares_v_locales_parent_id_idx" ON "_lugares_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_lugares_v_rels_order_idx" ON "_lugares_v_rels" USING btree ("order");
  CREATE INDEX "_lugares_v_rels_parent_idx" ON "_lugares_v_rels" USING btree ("parent_id");
  CREATE INDEX "_lugares_v_rels_path_idx" ON "_lugares_v_rels" USING btree ("path");
  CREATE INDEX "_lugares_v_rels_categorias_id_idx" ON "_lugares_v_rels" USING btree ("categorias_id");
  CREATE INDEX "_lugares_v_rels_media_id_idx" ON "_lugares_v_rels" USING btree ("media_id");
  CREATE INDEX "eventos_zona_idx" ON "eventos" USING btree ("zona_id");
  CREATE INDEX "eventos_lugar_idx" ON "eventos" USING btree ("lugar_id");
  CREATE INDEX "eventos_inicio_idx" ON "eventos" USING btree ("inicio");
  CREATE INDEX "eventos_destacado_en_portada_idx" ON "eventos" USING btree ("destacado_en_portada");
  CREATE INDEX "eventos_updated_at_idx" ON "eventos" USING btree ("updated_at");
  CREATE INDEX "eventos_created_at_idx" ON "eventos" USING btree ("created_at");
  CREATE INDEX "eventos__status_idx" ON "eventos" USING btree ("_status");
  CREATE UNIQUE INDEX "eventos_slug_idx" ON "eventos_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "eventos_locales_locale_parent_id_unique" ON "eventos_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "eventos_locales_parent_id_idx" ON "eventos_locales" USING btree ("_parent_id");
  CREATE INDEX "eventos_rels_order_idx" ON "eventos_rels" USING btree ("order");
  CREATE INDEX "eventos_rels_parent_idx" ON "eventos_rels" USING btree ("parent_id");
  CREATE INDEX "eventos_rels_path_idx" ON "eventos_rels" USING btree ("path");
  CREATE INDEX "eventos_rels_categorias_id_idx" ON "eventos_rels" USING btree ("categorias_id");
  CREATE INDEX "eventos_rels_media_id_idx" ON "eventos_rels" USING btree ("media_id");
  CREATE INDEX "_eventos_v_parent_idx" ON "_eventos_v" USING btree ("parent_id");
  CREATE INDEX "_eventos_v_version_version_zona_idx" ON "_eventos_v" USING btree ("version_zona_id");
  CREATE INDEX "_eventos_v_version_version_lugar_idx" ON "_eventos_v" USING btree ("version_lugar_id");
  CREATE INDEX "_eventos_v_version_version_inicio_idx" ON "_eventos_v" USING btree ("version_inicio");
  CREATE INDEX "_eventos_v_version_version_destacado_en_portada_idx" ON "_eventos_v" USING btree ("version_destacado_en_portada");
  CREATE INDEX "_eventos_v_version_version_updated_at_idx" ON "_eventos_v" USING btree ("version_updated_at");
  CREATE INDEX "_eventos_v_version_version_created_at_idx" ON "_eventos_v" USING btree ("version_created_at");
  CREATE INDEX "_eventos_v_version_version__status_idx" ON "_eventos_v" USING btree ("version__status");
  CREATE INDEX "_eventos_v_created_at_idx" ON "_eventos_v" USING btree ("created_at");
  CREATE INDEX "_eventos_v_updated_at_idx" ON "_eventos_v" USING btree ("updated_at");
  CREATE INDEX "_eventos_v_snapshot_idx" ON "_eventos_v" USING btree ("snapshot");
  CREATE INDEX "_eventos_v_published_locale_idx" ON "_eventos_v" USING btree ("published_locale");
  CREATE INDEX "_eventos_v_latest_idx" ON "_eventos_v" USING btree ("latest");
  CREATE INDEX "_eventos_v_version_version_slug_idx" ON "_eventos_v_locales" USING btree ("version_slug","_locale");
  CREATE UNIQUE INDEX "_eventos_v_locales_locale_parent_id_unique" ON "_eventos_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_eventos_v_locales_parent_id_idx" ON "_eventos_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_eventos_v_rels_order_idx" ON "_eventos_v_rels" USING btree ("order");
  CREATE INDEX "_eventos_v_rels_parent_idx" ON "_eventos_v_rels" USING btree ("parent_id");
  CREATE INDEX "_eventos_v_rels_path_idx" ON "_eventos_v_rels" USING btree ("path");
  CREATE INDEX "_eventos_v_rels_categorias_id_idx" ON "_eventos_v_rels" USING btree ("categorias_id");
  CREATE INDEX "_eventos_v_rels_media_id_idx" ON "_eventos_v_rels" USING btree ("media_id");
  CREATE INDEX "articulos_portada_idx" ON "articulos" USING btree ("portada_id");
  CREATE INDEX "articulos_autor_idx" ON "articulos" USING btree ("autor_id");
  CREATE INDEX "articulos_destacado_en_portada_idx" ON "articulos" USING btree ("destacado_en_portada");
  CREATE INDEX "articulos_updated_at_idx" ON "articulos" USING btree ("updated_at");
  CREATE INDEX "articulos_created_at_idx" ON "articulos" USING btree ("created_at");
  CREATE INDEX "articulos__status_idx" ON "articulos" USING btree ("_status");
  CREATE UNIQUE INDEX "articulos_slug_idx" ON "articulos_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "articulos_locales_locale_parent_id_unique" ON "articulos_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "articulos_locales_parent_id_idx" ON "articulos_locales" USING btree ("_parent_id");
  CREATE INDEX "articulos_rels_order_idx" ON "articulos_rels" USING btree ("order");
  CREATE INDEX "articulos_rels_parent_idx" ON "articulos_rels" USING btree ("parent_id");
  CREATE INDEX "articulos_rels_path_idx" ON "articulos_rels" USING btree ("path");
  CREATE INDEX "articulos_rels_zonas_id_idx" ON "articulos_rels" USING btree ("zonas_id");
  CREATE INDEX "articulos_rels_categorias_id_idx" ON "articulos_rels" USING btree ("categorias_id");
  CREATE INDEX "_articulos_v_parent_idx" ON "_articulos_v" USING btree ("parent_id");
  CREATE INDEX "_articulos_v_version_version_portada_idx" ON "_articulos_v" USING btree ("version_portada_id");
  CREATE INDEX "_articulos_v_version_version_autor_idx" ON "_articulos_v" USING btree ("version_autor_id");
  CREATE INDEX "_articulos_v_version_version_destacado_en_portada_idx" ON "_articulos_v" USING btree ("version_destacado_en_portada");
  CREATE INDEX "_articulos_v_version_version_updated_at_idx" ON "_articulos_v" USING btree ("version_updated_at");
  CREATE INDEX "_articulos_v_version_version_created_at_idx" ON "_articulos_v" USING btree ("version_created_at");
  CREATE INDEX "_articulos_v_version_version__status_idx" ON "_articulos_v" USING btree ("version__status");
  CREATE INDEX "_articulos_v_created_at_idx" ON "_articulos_v" USING btree ("created_at");
  CREATE INDEX "_articulos_v_updated_at_idx" ON "_articulos_v" USING btree ("updated_at");
  CREATE INDEX "_articulos_v_snapshot_idx" ON "_articulos_v" USING btree ("snapshot");
  CREATE INDEX "_articulos_v_published_locale_idx" ON "_articulos_v" USING btree ("published_locale");
  CREATE INDEX "_articulos_v_latest_idx" ON "_articulos_v" USING btree ("latest");
  CREATE INDEX "_articulos_v_version_version_slug_idx" ON "_articulos_v_locales" USING btree ("version_slug","_locale");
  CREATE UNIQUE INDEX "_articulos_v_locales_locale_parent_id_unique" ON "_articulos_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_articulos_v_locales_parent_id_idx" ON "_articulos_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_articulos_v_rels_order_idx" ON "_articulos_v_rels" USING btree ("order");
  CREATE INDEX "_articulos_v_rels_parent_idx" ON "_articulos_v_rels" USING btree ("parent_id");
  CREATE INDEX "_articulos_v_rels_path_idx" ON "_articulos_v_rels" USING btree ("path");
  CREATE INDEX "_articulos_v_rels_zonas_id_idx" ON "_articulos_v_rels" USING btree ("zonas_id");
  CREATE INDEX "_articulos_v_rels_categorias_id_idx" ON "_articulos_v_rels" USING btree ("categorias_id");
  CREATE INDEX "solicitudes_zona_idx" ON "solicitudes" USING btree ("zona_id");
  CREATE INDEX "solicitudes_lugar_creado_idx" ON "solicitudes" USING btree ("lugar_creado_id");
  CREATE INDEX "solicitudes_updated_at_idx" ON "solicitudes" USING btree ("updated_at");
  CREATE INDEX "solicitudes_created_at_idx" ON "solicitudes" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "redirects_rels_order_idx" ON "redirects_rels" USING btree ("order");
  CREATE INDEX "redirects_rels_parent_idx" ON "redirects_rels" USING btree ("parent_id");
  CREATE INDEX "redirects_rels_path_idx" ON "redirects_rels" USING btree ("path");
  CREATE INDEX "redirects_rels_lugares_id_idx" ON "redirects_rels" USING btree ("lugares_id");
  CREATE INDEX "redirects_rels_eventos_id_idx" ON "redirects_rels" USING btree ("eventos_id");
  CREATE INDEX "redirects_rels_articulos_id_idx" ON "redirects_rels" USING btree ("articulos_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_zonas_id_idx" ON "payload_locked_documents_rels" USING btree ("zonas_id");
  CREATE INDEX "payload_locked_documents_rels_categorias_id_idx" ON "payload_locked_documents_rels" USING btree ("categorias_id");
  CREATE INDEX "payload_locked_documents_rels_lugares_id_idx" ON "payload_locked_documents_rels" USING btree ("lugares_id");
  CREATE INDEX "payload_locked_documents_rels_eventos_id_idx" ON "payload_locked_documents_rels" USING btree ("eventos_id");
  CREATE INDEX "payload_locked_documents_rels_articulos_id_idx" ON "payload_locked_documents_rels" USING btree ("articulos_id");
  CREATE INDEX "payload_locked_documents_rels_solicitudes_id_idx" ON "payload_locked_documents_rels" USING btree ("solicitudes_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "ajustes_guia_correos_aviso_order_idx" ON "ajustes_guia_correos_aviso" USING btree ("_order");
  CREATE INDEX "ajustes_guia_correos_aviso_parent_id_idx" ON "ajustes_guia_correos_aviso" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "ajustes_guia_locales_locale_parent_id_unique" ON "ajustes_guia_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "ajustes_guia_locales_parent_id_idx" ON "ajustes_guia_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "zonas" CASCADE;
  DROP TABLE "zonas_locales" CASCADE;
  DROP TABLE "categorias" CASCADE;
  DROP TABLE "categorias_locales" CASCADE;
  DROP TABLE "lugares_horario" CASCADE;
  DROP TABLE "lugares_caracteristicas" CASCADE;
  DROP TABLE "lugares" CASCADE;
  DROP TABLE "lugares_locales" CASCADE;
  DROP TABLE "lugares_rels" CASCADE;
  DROP TABLE "_lugares_v_version_horario" CASCADE;
  DROP TABLE "_lugares_v_version_caracteristicas" CASCADE;
  DROP TABLE "_lugares_v" CASCADE;
  DROP TABLE "_lugares_v_locales" CASCADE;
  DROP TABLE "_lugares_v_rels" CASCADE;
  DROP TABLE "eventos" CASCADE;
  DROP TABLE "eventos_locales" CASCADE;
  DROP TABLE "eventos_rels" CASCADE;
  DROP TABLE "_eventos_v" CASCADE;
  DROP TABLE "_eventos_v_locales" CASCADE;
  DROP TABLE "_eventos_v_rels" CASCADE;
  DROP TABLE "articulos" CASCADE;
  DROP TABLE "articulos_locales" CASCADE;
  DROP TABLE "articulos_rels" CASCADE;
  DROP TABLE "_articulos_v" CASCADE;
  DROP TABLE "_articulos_v_locales" CASCADE;
  DROP TABLE "_articulos_v_rels" CASCADE;
  DROP TABLE "solicitudes" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "redirects_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "ajustes_guia_correos_aviso" CASCADE;
  DROP TABLE "ajustes_guia" CASCADE;
  DROP TABLE "ajustes_guia_locales" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_rol";
  DROP TYPE "public"."enum_categorias_aplica_a";
  DROP TYPE "public"."enum_categorias_tipo_schema";
  DROP TYPE "public"."enum_categorias_grupo";
  DROP TYPE "public"."enum_lugares_horario_dia";
  DROP TYPE "public"."enum_lugares_caracteristicas";
  DROP TYPE "public"."enum_lugares_rango_precio";
  DROP TYPE "public"."enum_lugares_status";
  DROP TYPE "public"."enum__lugares_v_version_horario_dia";
  DROP TYPE "public"."enum__lugares_v_version_caracteristicas";
  DROP TYPE "public"."enum__lugares_v_version_rango_precio";
  DROP TYPE "public"."enum__lugares_v_version_status";
  DROP TYPE "public"."enum__lugares_v_published_locale";
  DROP TYPE "public"."enum_eventos_inicio_tz";
  DROP TYPE "public"."enum_eventos_fin_tz";
  DROP TYPE "public"."enum_eventos_status";
  DROP TYPE "public"."enum__eventos_v_version_inicio_tz";
  DROP TYPE "public"."enum__eventos_v_version_fin_tz";
  DROP TYPE "public"."enum__eventos_v_version_status";
  DROP TYPE "public"."enum__eventos_v_published_locale";
  DROP TYPE "public"."enum_articulos_status";
  DROP TYPE "public"."enum__articulos_v_version_status";
  DROP TYPE "public"."enum__articulos_v_published_locale";
  DROP TYPE "public"."enum_solicitudes_estado";
  DROP TYPE "public"."enum_redirects_to_type";
  DROP TYPE "public"."enum_redirects_type";`)
}
