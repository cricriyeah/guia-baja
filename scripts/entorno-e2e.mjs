// Un solo entorno por modo: el mismo en build, start (webServer) y Lighthouse (plan F3d). Valores de prueba.
export const PUERTOS = { 'no-indexable': 3101, indexable: 3102 }
export const SECRETO_PROXY = 'secreto-e2e'
export const PUERTO_CATALOGO = 3103

export function envModo(modo) {
  return {
    GUIA_INDEXABLE: modo === 'indexable' ? 'true' : 'false',
    GUIA_PROXY_SECRET: SECRETO_PROXY,
    TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
    TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
    IP_HASH_SALT: 'sal-e2e',
    CRON_SECRET: 'cron-e2e',
    SITIO_URL: 'https://www.salysoltours.com',
    CATALOGO_API_URL: `http://localhost:${PUERTO_CATALOGO}`,
    WHATSAPP_NUMERO: '5210000000000',
  }
}
