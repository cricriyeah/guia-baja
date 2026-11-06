'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { EsqueletoArticulo } from '../esqueletos/Articulo'
import { EsqueletoCategoria } from '../esqueletos/Categoria'
import { EsqueletoEvento } from '../esqueletos/Evento'
import { EsqueletoFicha } from '../esqueletos/Ficha'
import { EsqueletoEventos, EsqueletoPortada } from '../esqueletos/Portada'
import { EsqueletoPrivacidad } from '../esqueletos/Privacidad'
import { EsqueletoZona } from '../esqueletos/Zona'
import { aparecer } from './aparecer'
import { destinoDe, linkDeClic, type Destino } from './destino'
import { useNavegacion } from './useNavegacion'

const ESQUELETOS: Record<Destino, ReactNode> = {
  portada: <EsqueletoPortada />,
  zona: <EsqueletoZona />,
  categoriaEnZona: <EsqueletoCategoria conMapa />,
  categoria: <EsqueletoCategoria conMapa={false} />,
  eventos: <EsqueletoEventos />,
  evento: <EsqueletoEvento />,
  lugar: <EsqueletoFicha />,
  articulo: <EsqueletoArticulo />,
  privacidad: <EsqueletoPrivacidad />,
}

// Esqueleto de la página destino al navegar dentro de la Guía, por transición. No puede ser un loading.tsx: es un
// Suspense, y cambiaría lo que sale del servidor (lo vigila tests/unit/esqueletos.test.ts).
//  - React aparta los Suspense de más de 12.8 KB: el HTML de una página ISR grande llevaría el esqueleto a la vista y
//    el contenido en un <div hidden> que revela un script. Destello en cada carga, y sin JS nunca se vería el contenido.
//  - Un redirect() bajo un Suspense en una ruta --filtros saldría con estado 200 en vez de 307.
// El listener va en window y en captura porque hay links en la cabecera y el pie, fuera de <main>.
export function NavegacionConEsqueleto({ children }: { children: ReactNode }) {
  const { cargando, navegando, ir } = useNavegacion()
  const [destino, setDestino] = useState<Destino | null>(null)
  const navegabaAntes = useRef(false)

  // La página nueva entra con un fade, haya salido o no el esqueleto. En layout effect: antes del pintado, para que
  // el contenido nuevo no se vea un cuadro completo antes de empezar.
  useLayoutEffect(() => {
    if (navegabaAntes.current && !navegando) aparecer(document.getElementById('contenido'))
    navegabaAntes.current = navegando
  }, [navegando])

  useEffect(() => {
    const alHacerClic = (e: MouseEvent) => {
      const link = linkDeClic(e)
      if (!link) return
      const siguiente = destinoDe(link.href, window.location.href)
      if (!siguiente) return
      e.preventDefault()
      setDestino(siguiente)
      ir(link.getAttribute('href') ?? link.href)
    }
    window.addEventListener('click', alHacerClic, true)
    return () => window.removeEventListener('click', alHacerClic, true)
  }, [ir])

  // El esqueleto es la página destino desde arriba, igual que cuando llegue.
  useEffect(() => {
    if (cargando) window.scrollTo(0, 0)
  }, [cargando])

  const mostrar = cargando && destino !== null
  return (
    <>
      {mostrar && ESQUELETOS[destino]}
      <div className="contenidos" hidden={mostrar}>{children}</div>
    </>
  )
}
