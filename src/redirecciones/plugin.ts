import { redirectsPlugin } from '@payloadcms/plugin-redirects'

import { lecturaPublica, soloAdmin } from '../acceso/reglas'

// Colección `redirects`: el público la lee (F3 la consulta antes de dar 404); solo Admin la edita a mano.
export const pluginRedirecciones = redirectsPlugin({
  collections: ['lugares', 'eventos', 'articulos'],
  redirectTypes: ['308'],
  overrides: {
    admin: { group: 'Configuración' },
    access: { read: lecturaPublica, create: soloAdmin, update: soloAdmin, delete: soloAdmin },
  },
})
