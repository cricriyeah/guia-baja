import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { esLocale } from '../../../../dominio/idioma'
import { zonasActivasCacheadas } from '../../../../sitio/datos/cacheadas'
import { Cabecera } from '../../../../sitio/ui/Cabecera'
import { Pie } from '../../../../sitio/ui/Pie'

// Marco de toda página de la guía: así el 404 y el error también salen con cabecera y pie, en su idioma.
// `idioma` es el slot @idioma (cambio de idioma resuelto por página), que pinta el enlace en la cabecera.
export default async function LayoutGuia(props: { children: ReactNode; idioma: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await props.params
  if (!esLocale(lang)) notFound()
  const zonas = await zonasActivasCacheadas(lang)
  return (
    <>
      <Cabecera lang={lang} zonas={zonas} idioma={props.idioma} />
      <main id="contenido">{props.children}</main>
      <Pie lang={lang} />
    </>
  )
}
