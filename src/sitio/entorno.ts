// Lectura única de las variables de entorno del sitio público (spec §5.5).
export const sitioUrl = (): string => process.env.SITIO_URL || 'https://www.salysoltours.com'
export const guiaIndexable = (): boolean => process.env.GUIA_INDEXABLE === 'true'
export const whatsappNumero = (): string => (process.env.WHATSAPP_NUMERO ?? '').replace(/\D/g, '')
