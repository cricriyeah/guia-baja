import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { pluginsAlmacenamiento } from './almacenamiento'
import { Categorias } from './collections/Categorias'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { Zonas } from './collections/Zonas'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    timezones: {
      supportedTimezones: [{ label: 'Baja California Sur', value: 'America/Mazatlan' }],
      defaultTimezone: 'America/Mazatlan',
    },
  },
  collections: [Users, Media, Zonas, Categorias],
  localization: {
    locales: [
      { label: 'Español', code: 'es' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'es',
    fallback: false,
  },
  editor: lexicalEditor(),
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
  plugins: [...pluginsAlmacenamiento(process.env)],
})
