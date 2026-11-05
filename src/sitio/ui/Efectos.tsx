// src/sitio/ui/Efectos.tsx
'use client'

import { useEffect } from 'react'

// Comportamientos generales de c-base.js: entradas escalonadas, videos que se reproducen solo al verse y presión
// inmediata. Un MutationObserver toma lo que trae cada navegación con <Link> (el layout no se vuelve a montar).
export function Efectos() {
  useEffect(() => {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const entradas = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.classList.add('visible')
        entradas.unobserve(e.target)
      }),
      { threshold: 0.12 },
    )
    const videos = new IntersectionObserver(
      (es) => es.forEach((e) => {
        const v = e.target as HTMLVideoElement
        if (e.isIntersecting && !reducido) v.play().catch(() => undefined)
        else v.pause()
      }),
      { threshold: 0.25 },
    )
    const tomar = () => {
      document.querySelectorAll<HTMLElement>('.entra:not([data-visto])').forEach((el) => {
        el.dataset.visto = '1'
        entradas.observe(el)
      })
      document.querySelectorAll<HTMLVideoElement>('video[data-auto]:not([data-visto])').forEach((v) => {
        v.dataset.visto = '1'
        videos.observe(v)
      })
    }
    tomar()
    const cambios = new MutationObserver(tomar)
    cambios.observe(document.body, { childList: true, subtree: true })

    const presionar = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest('.presionable')
      if (!el) return
      el.classList.add('presionado')
      const soltar = () => {
        el.classList.remove('presionado')
        window.removeEventListener('pointerup', soltar)
        window.removeEventListener('pointercancel', soltar)
      }
      window.addEventListener('pointerup', soltar)
      window.addEventListener('pointercancel', soltar)
    }
    document.addEventListener('pointerdown', presionar)
    return () => {
      entradas.disconnect()
      videos.disconnect()
      cambios.disconnect()
      document.removeEventListener('pointerdown', presionar)
    }
  }, [])
  return null
}
