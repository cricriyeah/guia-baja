// src/sitio/ui/Efectos.tsx
'use client'

import { useEffect } from 'react'

import { aparecer } from './navegacion/aparecer'

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
    // Lo que esta ejecución marcó: el cleanup lo desmarca para que un segundo montaje (StrictMode en dev) lo vuelva a tomar.
    const marcados: HTMLElement[] = []
    const tomar = () => {
      document.querySelectorAll<HTMLElement>('.entra:not([data-visto])').forEach((el) => {
        el.dataset.visto = '1'
        marcados.push(el)
        entradas.observe(el)
      })
      document.querySelectorAll<HTMLVideoElement>('video[data-auto]:not([data-visto])').forEach((v) => {
        v.dataset.visto = '1'
        marcados.push(v)
        videos.observe(v)
      })
      // La foto que ya estaba lista antes de este efecto (o salió de la caché) no va a disparar `load`.
      document.querySelectorAll<HTMLImageElement>('img[data-img]:not([data-lista])').forEach((img) => {
        if (img.complete) img.dataset.lista = '1'
      })
    }
    // Esqueleto de las fotos (base.css): se quita al cargar o al fallar. `load` y `error` no burbujean: va en captura.
    const fotoLista = (e: Event) => {
      if (!(e.target instanceof HTMLImageElement) || !('img' in e.target.dataset)) return
      e.target.dataset.lista = '1'
      if (e.type === 'load') aparecer(e.target)
    }
    document.addEventListener('load', fotoLista, true)
    document.addEventListener('error', fotoLista, true)
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
      marcados.forEach((el) => delete el.dataset.visto)
      document.removeEventListener('load', fotoLista, true)
      document.removeEventListener('error', fotoLista, true)
      document.removeEventListener('pointerdown', presionar)
    }
  }, [])
  return null
}
