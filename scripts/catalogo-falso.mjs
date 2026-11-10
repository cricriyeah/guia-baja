// Catálogo falso para el E2E (plan F4): el CI nunca llama a la API real. Datos inventados con la forma real.
// La Paz responde; cualquier otra sede da 500, para probar que la página carga sin el bloque.
import { createServer } from 'node:http'

import { PUERTO_CATALOGO } from './entorno-e2e.mjs'

const SERVICIOS = [
  {
    id: 1, empresa_slug: 'empresa-prueba', nombre: 'Pesca de prueba', nombre_en: 'Test fishing', slug: 'pesca-prueba',
    estrategia_precio: 'por_grupo', precio_base: '11290.00', tipo_cambio_usd: '17.5000', activo: true, duracion: '6 h', duracion_en: '6 hrs',
  },
  {
    // Servicio por persona activo: precio de la barra de tours (spec de presencia §2.2).
    id: 3, empresa_slug: 'empresa-prueba', nombre: 'Ballenas de prueba', nombre_en: 'Test whales', slug: 'ballenas-prueba',
    estrategia_precio: 'por_persona', precio_base: '1500.00', tipo_cambio_usd: '17.5000', activo: true, duracion: '4 h', duracion_en: '4 hrs',
  },
  {
    // Tercer tour con perfil del quiz (spec del paquete 3 §3).
    id: 4, empresa_slug: 'empresa-prueba', nombre: 'Kayak de prueba', nombre_en: 'Test kayak', slug: 'kayak-prueba',
    estrategia_precio: 'por_persona', precio_base: '2000.00', tipo_cambio_usd: '17.5000', activo: true, duracion: '3 h', duracion_en: '3 hrs',
  },
  {
    id: 2, empresa_slug: 'empresa-prueba', nombre: 'Tour apagado', nombre_en: 'Inactive tour', slug: 'tour-apagado',
    estrategia_precio: 'por_persona', precio_base: '100.00', tipo_cambio_usd: '17.5000', activo: false, duracion: '', duracion_en: '',
  },
]
const PAQUETES = [
  {
    id: 1, sede_slug: 'la-paz', nombre: 'Paquete de prueba', nombre_en: 'Test package', slug: 'paquete-prueba',
    estrategia_precio: 'por_persona', precio_ancla: '47100.00', tipo_cambio_usd: '17.5000', activo: true, noches: 5,
  },
]

const responder = (res, status, cuerpo) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(cuerpo))
}

createServer((req, res) => {
  if (req.url === '/api/sedes/la-paz/servicios/') return responder(res, 200, SERVICIOS)
  if (req.url === '/api/sedes/la-paz/paquetes/') return responder(res, 200, PAQUETES)
  return responder(res, 500, { detail: 'caído a propósito' })
}).listen(PUERTO_CATALOGO)
