import { esLocale, otroIdioma } from '../../../../../dominio/idioma'
import { rutas } from '../../../../../dominio/rutas'
import { Puente } from '../../../../../sitio/ui/Puente'
import { SelectorIdioma } from '../../../../../sitio/ui/SelectorIdioma'

export default async function IdiomaRespaldo({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!esLocale(lang)) return null
  return (
    <>
      <SelectorIdioma lang={lang} alterno={rutas.portada(otroIdioma(lang))} />
      <Puente lang={lang} zona={null} />
    </>
  )
}
