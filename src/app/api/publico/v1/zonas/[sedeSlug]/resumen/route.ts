import { esLocale } from '../../../../../../../dominio/idioma'
import { articulosCacheados, eventosCacheados, zonasActivasCacheadas } from '../../../../../../../sitio/datos/cacheadas'
import { armarResumen } from '../../../../../../../sitio/datos/resumen'
import { sitioUrl } from '../../../../../../../sitio/entorno'

// Contrato v1 (spec §8.2): su forma no cambia nunca. Las listas salen de la caché por etiqueta; «próximos» se calcula
// en cada respuesta para no guardar un evento que ya pasó.
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ sedeSlug: string }> }) {
  const lang = new URL(request.url).searchParams.get('lang')
  if (!lang || !esLocale(lang)) return new Response(null, { status: 400 })
  const { sedeSlug } = await params
  const [zonas, articulos, eventos] = await Promise.all([zonasActivasCacheadas(lang), articulosCacheados(lang), eventosCacheados(lang)])
  const resumen = armarResumen({ zonas, articulos, eventos }, sedeSlug, lang, sitioUrl(), new Date())
  if (!resumen) return new Response(null, { status: 404 })
  return Response.json(resumen, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } })
}
