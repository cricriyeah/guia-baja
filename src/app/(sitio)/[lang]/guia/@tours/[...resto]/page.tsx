import { esLocale } from '../../../../../../dominio/idioma'
import { tipoDePagina } from '../../../../../../dominio/presencia'
import { PresenciaTours } from '../../../../../../sitio/ui/presencia/PresenciaTours'

// Igual que @idioma/[...resto]: sin generateStaticParams vacío, toda ruta de children con segmento dinámico propio
// quedaría dinámica (ƒ) en vez de ISR.
export const generateStaticParams = () => []

type Props = { params: Promise<{ lang: string; resto: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ToursResto({ params, searchParams }: Props) {
  const { lang, resto } = await params
  if (!esLocale(lang)) return null
  const tipo = tipoDePagina(resto)
  // Solo las variantes --filtros y la búsqueda (ya force-dynamic) leen la consulta; leerla en otra ruta la volvería dinámica.
  let filtroZona: string | null = null
  if (tipo === 'filtrada' || tipo === 'busqueda') {
    const z = (await searchParams).zona
    filtroZona = typeof z === 'string' ? z : null
  }
  // La key por ruta remonta el activador en cada navegación con <Link>.
  return <PresenciaTours key={resto.join('/')} lang={lang} segmentos={resto} filtroZona={filtroZona} />
}
