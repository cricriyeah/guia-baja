import { getPayload } from 'payload'

import config from '../payload.config'
import { reindexarTodo } from './indexar'

// npm run busqueda:reindexar — tras cambiar filasDe o restaurar un respaldo (docs/operacion.md).
const payload = await getPayload({ config })
const n = await reindexarTodo(payload)
payload.logger.info(`Índice de búsqueda: ${n} documentos revisados.`)
process.exit(0)
