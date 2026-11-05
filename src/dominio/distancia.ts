const R = 6371
const rad = (g: number) => (g * Math.PI) / 180

// Decisión 2: km en línea recta. Coordenadas como las guarda Payload: [lng, lat].
export function kmEnLineaRecta([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]): number {
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
