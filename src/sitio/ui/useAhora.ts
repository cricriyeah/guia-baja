// src/sitio/ui/useAhora.ts
'use client'

import { useEffect, useState } from 'react'

// La hora del navegador, actualizada cada `intervaloMs`. Es null en el servidor y en el primer render, así que no
// hay desajuste de hidratación. La primera actualización va en un callback: react-hooks/set-state-in-effect
// (eslint-config-next 16) no admite un setState directo dentro del efecto.
export function useAhora(intervaloMs = 30_000): Date | null {
  const [ahora, setAhora] = useState<Date | null>(null)
  useEffect(() => {
    const tic = () => setAhora(new Date())
    const primero = window.setTimeout(tic, 0)
    const cada = window.setInterval(tic, intervaloMs)
    return () => {
      window.clearTimeout(primero)
      window.clearInterval(cada)
    }
  }, [intervaloMs])
  return ahora
}
