import { LOCALES, tieneValor } from '../../../dominio/idioma'
import {
  ajustesCacheados, articulosCacheados, categoriasCacheadas, eventosCacheados, lugaresCacheados, zonasActivasCacheadas,
} from '../../../sitio/datos/cacheadas'
import { guiaIndexable, sitioUrl } from '../../../sitio/entorno'
import { entradasSitemap, xmlSitemap, type DatosIdioma } from '../../../sitio/seo/sitemap'

export const revalidate = 3600

// Spec §9: 404 hasta que GUIA_INDEXABLE sea true.
export async function GET() {
  if (!guiaIndexable()) return new Response('No encontrado', { status: 404 })
  const datos = Object.fromEntries(
    await Promise.all(
      LOCALES.map(async (l) => {
        const [zonas, categorias, lugares, eventos, articulos, ajustes] = await Promise.all([
          zonasActivasCacheadas(l), categoriasCacheadas(l), lugaresCacheados(l), eventosCacheados(l), articulosCacheados(l), ajustesCacheados(l),
        ])
        return [l, { zonas, categorias, lugares, eventos, articulos, avisoExiste: tieneValor(ajustes.avisoPrivacidad) } satisfies DatosIdioma] as const
      }),
    ),
  ) as Record<(typeof LOCALES)[number], DatosIdioma>
  return new Response(xmlSitemap(entradasSitemap(datos, true), sitioUrl()), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
