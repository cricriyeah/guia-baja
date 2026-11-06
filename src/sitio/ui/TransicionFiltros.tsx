'use client'

import type { MouseEvent, ReactNode } from 'react'

import { esCambioDeConsulta, linkDeClic } from './navegacion/destino'
import { useNavegacion } from './navegacion/useNavegacion'

// Al cambiar un filtro o de página solo se renuevan los resultados: los controles siguen a la vista y un esqueleto
// ocupa el lugar de la lista. Los links a otras páginas los atiende NavegacionConEsqueleto.
export function TransicionFiltros({ controles, esqueleto, children }: { controles: ReactNode; esqueleto: ReactNode; children: ReactNode }) {
  const { cargando, ir } = useNavegacion()

  const alHacerClic = (e: MouseEvent<HTMLDivElement>) => {
    const link = linkDeClic(e)
    if (!link || !esCambioDeConsulta(link.href, window.location.href)) return
    e.preventDefault()
    ir(link.getAttribute('href') ?? link.href)
  }

  return (
    <div className="contenidos" onClickCapture={alHacerClic} aria-busy={cargando}>
      {controles}
      {cargando && <div className="contenidos" aria-hidden="true">{esqueleto}</div>}
      <div className="contenidos resultados-entran" hidden={cargando}>{children}</div>
    </div>
  )
}
