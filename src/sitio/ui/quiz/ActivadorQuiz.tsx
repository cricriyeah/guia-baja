'use client'

import { useEffect } from 'react'

import { track } from '../../analitica/track'
import type { Quiz } from './activarQuiz'

const ESPERA_MS = 3000
const TOQUES = ['pointerdown', 'focusin', 'keydown'] as const

// Spec del paquete 3 §2.2: lo único del quiz en el JavaScript inicial. Baja el módulo al primer toque y, si «Ver mis
// tours» llega antes que él, lo espera hasta 3 s. Si falla o tarda más, sigue el link y solo entonces cuenta el clic.
export function ActivadorQuiz() {
  useEffect(() => {
    const raiz = document.getElementById('quiz-tours')
    const boton = raiz?.querySelector<HTMLAnchorElement>('[data-quiz-ver]')
    if (!raiz || !boton) return

    let quiz: Promise<Quiz> | null = null
    let esperando = false
    const activar = () => (quiz ??= import('./activarQuiz').then((m) => m.activarQuiz(raiz)))
    const alTocar = () => {
      TOQUES.forEach((tipo) => raiz.removeEventListener(tipo, alTocar))
      activar().catch(() => undefined)
    }
    const sincronizar = () => boton.setAttribute('aria-disabled', raiz.querySelector('input[name="gusto"]:checked') ? 'false' : 'true')
    const seguir = () => {
      track('tour_clic', { zona: raiz.dataset.zona, origen: 'quiz' })
      window.location.assign(boton.href)
    }
    const alClic = (e: MouseEvent) => {
      e.preventDefault()
      if (esperando || boton.getAttribute('aria-disabled') === 'true') return
      esperando = true
      let tiempo = 0
      const limite = new Promise<null>((listo) => { tiempo = window.setTimeout(() => listo(null), ESPERA_MS) })
      Promise.race([activar(), limite]).then((q) => {
        window.clearTimeout(tiempo)
        if (!q) return seguir()
        esperando = false
        q.ver()
      }).catch(seguir)
    }

    const textoOriginal = boton.textContent
    boton.textContent = boton.dataset.texto ?? textoOriginal
    sincronizar()
    TOQUES.forEach((tipo) => raiz.addEventListener(tipo, alTocar))
    raiz.addEventListener('change', sincronizar)
    boton.addEventListener('click', alClic)
    return () => {
      TOQUES.forEach((tipo) => raiz.removeEventListener(tipo, alTocar))
      raiz.removeEventListener('change', sincronizar)
      boton.removeEventListener('click', alClic)
      boton.textContent = textoOriginal
      boton.removeAttribute('aria-disabled')
      void quiz?.then((q) => q.limpiar()).catch(() => undefined)
    }
  }, [])
  return null
}
