'use client'

import { useEffect } from 'react'

// Spec de presencia §2.3 y §5: el JavaScript de la tarjeta y de la barra no va en el inicial de la página. Este
// componente solo espera a que el navegador quede libre e importa el módulo que hace el trabajo.
export function ActivadorTours() {
  useEffect(() => {
    const inicio = performance.now()
    let limpiar: (() => void) | undefined
    let cancelado = false
    const cargar = () => {
      void import('./activarTours').then((m) => {
        if (!cancelado) limpiar = m.activarTours(inicio)
      })
    }
    const idle = typeof window.requestIdleCallback === 'function'
    const id = idle ? window.requestIdleCallback(cargar, { timeout: 4000 }) : window.setTimeout(cargar, 2000)
    return () => {
      cancelado = true
      if (idle) window.cancelIdleCallback(id)
      else window.clearTimeout(id)
      limpiar?.()
    }
  }, [])
  return null
}
