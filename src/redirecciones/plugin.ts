import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { APIError, type CollectionBeforeValidateHook } from 'payload'

import { lecturaPublica, soloAdmin } from '../acceso/reglas'
import { hooksDeRevalidacion } from '../revalidacion/hooks'

const revalidacion = hooksDeRevalidacion('redirects')

// El destino de una redirección «reference» depende del idioma y del slug del momento; el mapa cacheado del
// sitio no lo seguiría (plan F3a). Solo rutas: es lo que escriben los hooks y lo que un Admin debe usar.
export const soloRutas: CollectionBeforeValidateHook = ({ data }) => {
  const to = (data as { to?: { type?: string } } | undefined)?.to
  if (to?.type === 'reference') {
    throw new APIError('Las redirecciones solo aceptan una ruta (URL personalizada).', 400, undefined, true)
  }
  return data
}

// Colección `redirects`: el público la lee (F3 la consulta antes de dar 404); solo Admin la edita a mano.
export const pluginRedirecciones = redirectsPlugin({
  collections: ['lugares', 'eventos', 'articulos'],
  redirectTypes: ['308'],
  overrides: {
    admin: { group: 'Configuración' },
    hooks: { beforeValidate: [soloRutas], afterChange: [revalidacion.afterChange], afterDelete: [revalidacion.afterDelete] },
    access: { read: lecturaPublica, create: soloAdmin, update: soloAdmin, delete: soloAdmin },
  },
})
