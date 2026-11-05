import { esLocale } from '../../../../../../dominio/idioma'
import { contextoDe } from '../../../../../../sitio/contexto'
import { Puente } from '../../../../../../sitio/ui/Puente'
import { SelectorIdioma } from '../../../../../../sitio/ui/SelectorIdioma'

// Mismo nombre de parámetro que el catch-all de children (validateAppPaths de Next 16). Next lo usa para toda ruta
// de children sin página propia en el slot y le pasa `resto` con los segmentos internos (tras el rewrite del proxy).
export default async function IdiomaResto({ params }: { params: Promise<{ lang: string; resto: string[] }> }) {
  const { lang, resto } = await params
  if (!esLocale(lang)) return null
  const c = await contextoDe(lang, resto)
  return (
    <>
      <SelectorIdioma lang={lang} alterno={c.alterno} />
      <Puente lang={lang} zona={c.zona} />
    </>
  )
}
