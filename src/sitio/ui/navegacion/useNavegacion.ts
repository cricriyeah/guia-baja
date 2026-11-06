'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useLayoutEffect, useRef, useState, useTransition } from 'react'
import { flushSync } from 'react-dom'

// Una página ya precargada llega en un instante y no necesita esqueleto: solo aparece si la espera pasa de DEMORA_MS.
// Una vez a la vista se queda MINIMO_MS: portada y zonas tardan unos 150 ms y, sin mínimo, el esqueleto sería un parpadeo.
// La navegación no se retrasa: la página nueva ya está montada debajo, oculta, mientras el esqueleto termina.
const DEMORA_MS = 40
const MINIMO_MS = 400

// Navega dentro de una transición: la página actual sigue montada hasta que la nueva está lista, y `cargando` avisa
// mientras tanto. Next deja pasar el clic porque quien llama ya hizo preventDefault (next/link respeta defaultPrevented).
export function useNavegacion() {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [cargando, setCargando] = useState(false)
  const relojMostrar = useRef<number | undefined>(undefined)
  const mostradoEn = useRef(0)

  const ir = useCallback((href: string) => {
    window.clearTimeout(relojMostrar.current)
    relojMostrar.current = window.setTimeout(() => {
      mostradoEn.current = performance.now()
      // flushSync: el esqueleto se pinta ya. Encolado con prioridad normal, React podía aplicar antes el commit de la
      // página nueva y el esqueleto salía encima de ella: página, esqueleto y otra vez página.
      flushSync(() => setCargando(true))
    }, DEMORA_MS)
    iniciar(() => router.push(href))
  }, [router])

  // Al terminar la transición: si el esqueleto no llegó a salir ya no sale, y si salió se queda hasta cumplir el mínimo.
  // En layout effect, dentro del mismo commit: renderizar la página ocupa el hilo principal y el reloj de DEMORA_MS se
  // atrasa. Con un efecto normal podía dispararse justo después de llegar la página y taparla con el esqueleto.
  useLayoutEffect(() => {
    if (pendiente) return
    window.clearTimeout(relojMostrar.current)
    const resto = mostradoEn.current + MINIMO_MS - performance.now()
    const reloj = window.setTimeout(() => setCargando(false), Math.max(0, resto))
    return () => window.clearTimeout(reloj)
  }, [pendiente])

  return { cargando, navegando: pendiente || cargando, ir }
}
