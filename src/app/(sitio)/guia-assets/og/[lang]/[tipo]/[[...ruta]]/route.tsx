import { ImageResponse } from 'next/og'

import { esLocale, type Locale } from '../../../../../../../dominio/idioma'
import {
  articulosCacheados, categoriasCacheadas, eventosCacheados, lugaresCacheados, zonasActivasCacheadas,
} from '../../../../../../../sitio/datos/cacheadas'
import { porSlug } from '../../../../../../../sitio/datos/consultas'
import type { Imagen } from '../../../../../../../sitio/datos/tipos'
import { sitioUrl } from '../../../../../../../sitio/entorno'
import { fotoDeFondo, recortarTituloOg, segmentosOgValidos, tamanoTituloOg } from '../../../../../../../sitio/seo/og'
import { textos } from '../../../../../../../sitio/textos'

// ISR como las páginas: con generateStaticParams vacío cada imagen se genera al primer pedido y se revalida cada hora,
// en vez de renderizarse (satori + foto) en cada petición.
export const revalidate = 3600
export const generateStaticParams = () => []

type Params = { lang: string; tipo: string; ruta?: string[] }

async function datosOg(lang: Locale, tipo: string, ruta: string[]): Promise<{ titulo: string; imagen: Imagen | null } | null> {
  const t = textos(lang)
  const [a, b] = ruta
  if (tipo === 'portada') return { titulo: t.portada.titulo, imagen: null }
  if (tipo === 'pagina') {
    const titulos: Record<string, string> = { eventos: t.listado.eventosTitulo, negocios: t.formulario.titulo, privacidad: t.privacidad.titulo }
    return a && Object.hasOwn(titulos, a) ? { titulo: titulos[a], imagen: null } : null
  }
  if (tipo === 'zona') {
    const z = porSlug(await zonasActivasCacheadas(lang), a ?? '')
    return z ? { titulo: z.nombre, imagen: z.foto } : null
  }
  if (tipo === 'categoria-zona' || tipo === 'categoria') {
    const cats = await categoriasCacheadas(lang)
    const c = porSlug(cats, tipo === 'categoria' ? (a ?? '') : (b ?? ''))
    const z = tipo === 'categoria-zona' ? porSlug(await zonasActivasCacheadas(lang), a ?? '') : null
    if (!c || (tipo === 'categoria-zona' && !z)) return null
    return { titulo: z ? t.listado.titulo(c.nombre, z.nombre) : t.listado.enTodas(c.nombre), imagen: z?.foto ?? null }
  }
  if (tipo === 'lugar') {
    const x = porSlug(await lugaresCacheados(lang), a ?? '')
    return x ? { titulo: x.nombre, imagen: x.foto } : null
  }
  if (tipo === 'evento') {
    const x = porSlug(await eventosCacheados(lang), a ?? '')
    return x ? { titulo: x.nombre, imagen: x.foto } : null
  }
  if (tipo === 'articulo') {
    const x = porSlug(await articulosCacheados(lang), a ?? '')
    return x ? { titulo: x.titulo, imagen: x.portada } : null
  }
  return null
}

// Spec §9: marca + título sobre el tamaño 1200×630 de la foto principal; sin foto, fondo de marca. Satori no lee
// WOFF2: el título usa la fuente que trae next/og.
export async function GET(_request: Request, { params }: { params: Promise<Params> }) {
  const { lang, tipo, ruta = [] } = await params
  if (!esLocale(lang) || !segmentosOgValidos(tipo, ruta)) return new Response('No encontrado', { status: 404 })
  const d = await datosOg(lang, tipo, ruta)
  if (!d) return new Response('No encontrado', { status: 404 })
  const fondo = await fotoDeFondo(d.imagen?.og ?? null, sitioUrl())
  const titulo = recortarTituloOg(d.titulo)
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#1B607F' }}>
        {fondo ? <img src={fondo} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }} alt="" /> : null}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 64, background: 'linear-gradient(to top, rgba(31,26,20,.85), rgba(31,26,20,.2))' }}>
          {/* Satori no soporta filter ni inset: marca en texto blanco en lugar del logo negro. */}
          <div style={{ color: '#fff', fontSize: 28, letterSpacing: 4, marginBottom: 20 }}>SUN BAJA · GUÍA DE LA BAJA</div>
          <div style={{ color: '#fff', fontSize: tamanoTituloOg(titulo), fontWeight: 700, lineHeight: 1.05, textTransform: 'uppercase', maxWidth: 1000 }}>{titulo}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600' } },
  )
}
