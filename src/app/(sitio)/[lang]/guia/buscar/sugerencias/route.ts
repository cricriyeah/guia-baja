import { NextResponse } from 'next/server'

import { sugerencias } from '../../../../../../busqueda/consulta'
import { limpiarTermino } from '../../../../../../dominio/busqueda'
import { esLocale } from '../../../../../../dominio/idioma'
import { rutas } from '../../../../../../dominio/rutas'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, itinerariosCacheados, lugaresCacheados, temasCacheados, zonasActivasCacheadas,
} from '../../../../../../sitio/datos/cacheadas'
import { categoriasConLugares } from '../../../../../../sitio/datos/consultas'
import { obtenerPayload } from '../../../../../../sitio/datos/payload'

// Ruta interna de la Guía para la cabecera; no es parte del contrato v1 (spec §7).
export async function GET(request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!esLocale(lang)) return NextResponse.json([], { status: 404 })
  const q = limpiarTermino(new URL(request.url).searchParams.get('q'))
  if (q.length < 2) return NextResponse.json([])
  const [filas, lugares, eventos, articulos, zonas, cats, itinerarios, temas] = await Promise.all([
    obtenerPayload().then((payload) => sugerencias(payload, { q, lang })),
    lugaresCacheados(lang), eventosCacheados(lang), articulosCacheados(lang), zonasActivasCacheadas(lang), categoriasCacheadas(lang), itinerariosCacheados(lang), temasCacheados(lang),
  ])
  // Solo lo que el público puede abrir (mismas listas que la página de resultados).
  const visibles: Record<string, Set<number>> = {
    lugar: new Set(lugares.map((x) => x.id)),
    evento: new Set(eventos.map((x) => x.id)),
    articulo: new Set(articulos.map((x) => x.id)),
    itinerario: new Set(itinerarios.map((x) => x.id)),
    tema: new Set(temas.map((x) => x.id)),
    zona: new Set(zonas.map((x) => x.id)),
    categoria: new Set(categoriasConLugares(lugares, cats).map((x) => x.id)),
  }
  const ruta = (t: string, slug: string) =>
    t === 'lugar' ? rutas.lugar(lang, slug)
      : t === 'evento' ? rutas.evento(lang, slug)
        : t === 'articulo' ? rutas.articulo(lang, slug)
          : t === 'itinerario' ? rutas.itinerario(lang, slug)
            : t === 'tema' ? rutas.tema(lang, slug)
              : t === 'zona' ? rutas.zona(lang, slug)
                : rutas.categoria(lang, slug)
  return NextResponse.json(
    filas.filter((f) => visibles[f.tipo].has(f.docId)).map((f) => ({ tipo: f.tipo, titulo: f.titulo, ruta: ruta(f.tipo, f.slug) })),
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  )
}
