import { getPayload, type Payload } from 'payload'

import config from '../../src/payload.config'
import { vaciarColecciones } from '../../src/seed/vaciar'

export function obtenerPayload(): Promise<Payload> {
  return getPayload({ config })
}

export function limpiar(payload: Payload): Promise<void> {
  return vaciarColecciones(payload)
}
