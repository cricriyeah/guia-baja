import { getPayload, type Payload } from 'payload'

import config from '../../payload.config'

// getPayload guarda la instancia: llamarla en cada lectura no reconecta.
export const obtenerPayload = (): Promise<Payload> => getPayload({ config })
