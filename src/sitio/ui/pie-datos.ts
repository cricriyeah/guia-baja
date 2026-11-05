// Datos del pie del sitio de reservas, copiados aquí (spec §7, «Navegación»). Si el sitio cambia su pie, se cambia
// aquí a mano. Las rutas de «Explora» salen de la propuesta C; el dueño las confirma contra el pie en producción.
export const RUTAS_PIE = {
  reservar: '/reservar',
  mapa: '/mapa',
  sedes: '/sedes',
  comoFunciona: '#como-funciona',
  empresas: '/empresas',
  nosotros: '#nosotros',
  deslinde: '/deslinde',
  privacidad: '/privacidad',
} as const

export const DIRECCION_PIE = 'La Paz, BCS: C. Toronja 561, Indeco, Donceles 28, 23070'
