// Lectura única de las variables de entorno del sitio público (spec §5.5).
export const sitioUrl = (): string => process.env.SITIO_URL || 'https://www.salysoltours.com'
export const guiaIndexable = (): boolean => process.env.GUIA_INDEXABLE === 'true'
export const whatsappNumero = (): string => (process.env.WHATSAPP_NUMERO ?? '').replace(/\D/g, '')

// Versión del despliegue para las llaves de la caché de datos (unstable_cache). En Vercel esa caché persiste entre
// deploys: sin esta versión, un deploy que cambie la forma de los tipos leería JSON viejo con código nuevo. En local
// y en CI no hay variables de Vercel y la versión es fija.
export const versionCache = (): string => process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'local'
