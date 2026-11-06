import type { CollectionConfig } from 'payload'

import { nadie, soloAdmin } from '../acceso/reglas'
import { TIPOS_BUSQUEDA } from '../dominio/busqueda'

// Índice de la búsqueda por idioma (decisión 13). Lo escriben solo los hooks (src/busqueda/indexar.ts) y lo lee
// la consulta SQL del servidor. El público nunca lo lee por la API.
export const IndiceBusqueda: CollectionConfig = {
  slug: 'indice-busqueda',
  admin: { hidden: true },
  access: { read: soloAdmin, create: nadie, update: nadie, delete: nadie },
  indexes: [{ fields: ['tipo', 'docId', 'idioma'], unique: true }],
  fields: [
    { name: 'tipo', type: 'select', required: true, options: TIPOS_BUSQUEDA.map((t) => ({ label: t, value: t })) },
    { name: 'docId', type: 'number', required: true },
    // «idioma» y no «locale»: evita chocar con nombres que Payload usa en la localización.
    { name: 'idioma', type: 'select', required: true, options: ['es', 'en'].map((l) => ({ label: l, value: l })) },
    { name: 'slug', type: 'text', required: true },
    { name: 'titulo', type: 'text', required: true },
    { name: 'texto', type: 'textarea' },
    { name: 'zonaIds', type: 'json' },
    { name: 'categoriaIds', type: 'json' },
    { name: 'inicio', type: 'date' },
    { name: 'fin', type: 'date' },
    { name: 'patrocinioActivo', type: 'checkbox', defaultValue: false },
    { name: 'patrocinioDesde', type: 'date' },
    { name: 'patrocinioHasta', type: 'date' },
  ],
}
