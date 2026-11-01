import sharp from 'sharp'

// Imágenes generadas al vuelo: el repo no guarda binarios de prueba.
export async function imagenDePrueba(
  opciones: { ancho?: number; alto?: number; color?: { r: number; g: number; b: number } } = {},
): Promise<Buffer> {
  const { ancho = 1800, alto = 1200, color = { r: 0, g: 120, b: 160 } } = opciones
  return sharp({ create: { width: ancho, height: alto, channels: 3, background: color } })
    .jpeg({ quality: 80 })
    .toBuffer()
}
