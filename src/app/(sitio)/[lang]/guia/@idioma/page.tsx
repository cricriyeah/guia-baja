import { esLocale } from '../../../../../dominio/idioma'
import { contextoDe } from '../../../../../sitio/contexto'
import { Puente } from '../../../../../sitio/ui/Puente'
import { SelectorIdioma } from '../../../../../sitio/ui/SelectorIdioma'

export default async function IdiomaPortada({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!esLocale(lang)) return null
  const c = await contextoDe(lang, [])
  return (
    <>
      <SelectorIdioma lang={lang} alterno={c.alterno} />
      <Puente lang={lang} zona={c.zona} />
    </>
  )
}
