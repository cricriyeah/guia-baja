import { s3Storage } from '@payloadcms/storage-s3'
import type { PayloadRequest, Plugin } from 'payload'

import { esPersonal } from './acceso/roles'

// El índice de cadenas deja pasar process.env directamente (un tipo solo con opcionales lo rechaza TS).
export type EntornoR2 = Partial<
  Record<
    'R2_ACCOUNT_ID' | 'R2_ACCESS_KEY_ID' | 'R2_SECRET_ACCESS_KEY' | 'R2_BUCKET' | 'R2_PUBLIC_URL',
    string
  >
> &
  Record<string, string | undefined>

type OpcionesS3 = Parameters<typeof s3Storage>[0]

// Por defecto el adaptador firma URLs de subida a cualquier usuario autenticado, incluso con `rol: null`.
// Solo el personal (admin o editor) puede pedirlas, igual que `create` en la colección Media.
export const accesoSubidaDirecta = ({ req }: { req: Pick<PayloadRequest, 'user'> }): boolean =>
  esPersonal(req.user)

// Siempre el mismo plugin (activado o no) para que esquema, migraciones e importMap sean iguales
// en local, CI y producción (spec §4.2; ver revisión de arquitectura del plan).
export function opcionesAlmacenamiento(env: EntornoR2): OpcionesS3 {
  const activo = Boolean(env.R2_BUCKET)
  const urlPublica = (env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '')
  if (activo && !urlPublica)
    throw new Error('Falta R2_PUBLIC_URL: las imágenes se sirven desde el dominio del bucket.')

  return {
    enabled: activo,
    alwaysInsertFields: true,
    clientUploads: { access: accesoSubidaDirecta },
    bucket: env.R2_BUCKET || 'sin-bucket',
    collections: {
      media: {
        disablePayloadAccessControl: true,
        generateFileURL: ({ filename, prefix }) =>
          `${urlPublica}/${prefix ? `${prefix}/` : ''}${filename}`,
      },
    },
    config: {
      endpoint: env.R2_ACCOUNT_ID
        ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined,
      region: 'auto',
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
      },
    },
  }
}

export function pluginsAlmacenamiento(env: EntornoR2): Plugin[] {
  return [s3Storage(opcionesAlmacenamiento(env))]
}
