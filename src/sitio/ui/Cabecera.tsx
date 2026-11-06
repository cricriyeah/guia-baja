import type { ReactNode } from 'react'

import type { Locale } from '../../dominio/idioma'
import { rutas } from '../../dominio/rutas'
import type { ZonaPublica } from '../datos/tipos'
import { CabeceraCliente } from './CabeceraCliente'

// Cabecera de la Guía (spec §7, «Navegación»). `idioma` es el slot @idioma: selector ES/EN y puente a reservas
// ya resueltos en el servidor para esta página.
export function Cabecera({ lang, zonas, idioma }: { lang: Locale; zonas: ZonaPublica[]; idioma?: ReactNode }) {
  return (
    <CabeceraCliente
      lang={lang}
      portada={rutas.portada(lang)}
      buscar={rutas.buscar(lang)}
      sugerencias={rutas.sugerencias(lang)}
      zonas={zonas.map((z) => ({ slug: z.slug, nombre: z.nombre, ruta: rutas.zona(lang, z.slug) }))}
    >
      {idioma}
    </CabeceraCliente>
  )
}
