import { esLocale } from '../../../../../dominio/idioma'
import { PresenciaTours } from '../../../../../sitio/ui/presencia/PresenciaTours'

// Slot de la barra y la tarjeta de tours (spec de presencia §2.2): fuera de la cabecera, porque el backdrop-filter de
// .barra volvería a la cabecera el bloque contenedor de los elementos fixed. Misma estructura que @idioma.
export default async function ToursPortada({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!esLocale(lang)) return null
  return <PresenciaTours key="portada" lang={lang} segmentos={[]} filtroZona={null} />
}
