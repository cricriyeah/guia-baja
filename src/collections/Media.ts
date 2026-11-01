import { APIError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { lecturaPublica, soloPersonal } from '../acceso/reglas'

export const TAMANO_MAXIMO_SUBIDA = 20 * 1024 * 1024

// Cubre subidas por el servidor (req.file) y directas a R2 (clientUploads manda filesize).
export const limitarTamano: CollectionBeforeValidateHook = ({ data, req }) => {
  const tamano = req.file?.size ?? (data as { filesize?: number } | undefined)?.filesize
  if (typeof tamano === 'number' && tamano > TAMANO_MAXIMO_SUBIDA) {
    throw new APIError('La imagen pesa más de 20 MB.', 400, undefined, true)
  }
  return data
}

const webp = { format: 'webp' as const, options: { quality: 80 } }

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: lecturaPublica,
    create: soloPersonal,
    update: soloPersonal,
    delete: soloPersonal,
  },
  hooks: { beforeValidate: [limitarTamano] },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    adminThumbnail: 's480',
    imageSizes: [
      { name: 's480', width: 480, formatOptions: webp },
      { name: 's960', width: 960, formatOptions: webp },
      { name: 's1600', width: 1600, formatOptions: webp },
      // Fondo para la imagen Open Graph (spec §9); JPEG porque next/og no lee WebP.
      {
        name: 'og',
        width: 1200,
        height: 630,
        position: 'centre',
        formatOptions: { format: 'jpeg', options: { quality: 82 } },
      },
    ],
  },
  fields: [
    // Obligatorio en los dos idiomas (spec §6). Payload edita un idioma a la vez, así que un campo
    // localizado y requerido solo se exigiría en el idioma activo: son dos campos no localizados.
    {
      name: 'alt',
      type: 'group',
      label: { es: 'Texto alternativo', en: 'Alt text' },
      fields: [
        { name: 'es', type: 'text', required: true, label: 'Español' },
        { name: 'en', type: 'text', required: true, label: 'English' },
      ],
    },
    { name: 'credito', type: 'text' },
  ],
}
