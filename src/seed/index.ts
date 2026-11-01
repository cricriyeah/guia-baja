import { getPayload } from 'payload'

import config from '../payload.config'
import { sembrar } from './datos'
import { verificarSeed } from './guardia'

// La guardia corre antes de abrir Payload: nada se escribe si falla.
const guardia = verificarSeed(process.env)
if (!guardia.permitido) {
  console.error(guardia.motivo)
  process.exit(1)
}

const payload = await getPayload({ config })
await sembrar(payload, { contrasenaAdmin: process.env.SEED_CONTRASENA_ADMIN })
console.log('Seed listo.')
process.exit(0)
