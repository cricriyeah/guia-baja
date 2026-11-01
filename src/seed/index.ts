import { getPayload } from 'payload'

import config from '../payload.config'
import { sembrar } from './datos'

if (process.env.SEED_PERMITIDO !== 'true') {
  console.error('El seed borra todo. Solo corre con SEED_PERMITIDO=true (local o base de previews).')
  process.exit(1)
}

const payload = await getPayload({ config })
await sembrar(payload, { contrasenaAdmin: process.env.SEED_CONTRASENA_ADMIN })
console.log('Seed listo.')
process.exit(0)
