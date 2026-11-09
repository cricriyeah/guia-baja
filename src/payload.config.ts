import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { pluginsAlmacenamiento } from './almacenamiento'
import { Articulos } from './collections/Articulos'
import { Itinerarios } from './collections/Itinerarios'
import { Temas } from './collections/Temas'
import { Categorias } from './collections/Categorias'
import { Eventos } from './collections/Eventos'
import { FotosTours } from './collections/FotosTours'
import { IndiceBusqueda } from './collections/IndiceBusqueda'
import { Lugares } from './collections/Lugares'
import { Media } from './collections/Media'
import { Solicitudes } from './collections/Solicitudes'
import { TextosZonaCategoria } from './collections/TextosZonaCategoria'
import { Users } from './collections/Users'
import { Zonas } from './collections/Zonas'
import { correoSilencioso } from './correo/silencioso'
import { AjustesGuia } from './globals/AjustesGuia'
import { pluginRedirecciones } from './redirecciones/plugin'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      graphics: { Logo: '/admin/Marca#Logo', Icon: '/admin/Marca#Icono' },
    },
    meta: {
      titleSuffix: ' · SBE Guide',
      description: 'Sitio de administración editorial para SBE Guide',
      icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/guia-assets/logos/logosm.svg' }],
    },
    timezones: {
      supportedTimezones: [{ label: 'Baja California Sur', value: 'America/Mazatlan' }],
      defaultTimezone: 'America/Mazatlan',
    },
  },
  collections: [Users, Media, Zonas, Categorias, Lugares, Eventos, Articulos, Itinerarios, Temas, Solicitudes, TextosZonaCategoria, FotosTours, IndiceBusqueda],
  globals: [AjustesGuia],
  localization: {
    locales: [
      { label: 'Español', code: 'es' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'es',
    fallback: false,
  },
  editor: lexicalEditor(),
  // Spec §5.2: Resend con la llave de esta app. Sin llave (local, CI), el adaptador silencioso de F2.
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.CORREO_REMITENTE || 'guia@salysoltours.com',
        defaultFromName: 'Guía de la Baja',
      })
    : correoSilencioso,
  secret: process.env.PAYLOAD_SECRET || '',
  graphQL: { disable: true },
  upload: { limits: { fileSize: 20 * 1024 * 1024 } },
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: [pluginRedirecciones, ...pluginsAlmacenamiento(process.env)],
})
