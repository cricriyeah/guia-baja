import { timingSafeEqual } from 'node:crypto'

// Vercel Cron manda Authorization: Bearer ${CRON_SECRET}. Sin secreto configurado, nadie pasa.
export function autorizado(request: Request, secreto: string | undefined = process.env.CRON_SECRET): boolean {
  if (!secreto) return false
  const esperado = Buffer.from(`Bearer ${secreto}`)
  const recibido = Buffer.from(request.headers.get('authorization') ?? '')
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
}
