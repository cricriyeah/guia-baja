import { esLocale } from '../../../../../dominio/idioma'
import { PresenciaTours } from '../../../../../sitio/ui/presencia/PresenciaTours'

// Respaldo del slot (p. ej. al recargar una ruta sin página propia en el slot): como la portada.
export default async function ToursRespaldo({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!esLocale(lang)) return null
  return <PresenciaTours key="respaldo" lang={lang} segmentos={[]} filtroZona={null} />
}
