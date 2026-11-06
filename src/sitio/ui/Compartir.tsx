'use client'

import { useState } from 'react'

import type { Locale } from '../../dominio/idioma'
import { textos } from '../textos'
import { copiarAlPortapapeles } from './CopiarCorreo'

// Compartir: Web Share si existe; si no, copia el link (decisiones, notas de F1). Si copiar falla (sin API o permiso
// negado), el botón no cambia: no promete algo que no pasó.
export function Compartir({ lang, titulo, clase = 'accion presionable' }: { lang: Locale; titulo: string; clase?: string }) {
  const [copiado, setCopiado] = useState(false)
  const t = textos(lang).ficha
  const compartir = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: titulo, url }).catch(() => undefined)
      return
    }
    if (!(await copiarAlPortapapeles(url))) return
    setCopiado(true)
    window.setTimeout(() => setCopiado(false), 1400)
  }
  return (
    <button className={`${clase}${copiado ? ' confirmado' : ''}`} type="button" onClick={compartir}>
      {copiado ? t.copiado : t.compartir}
    </button>
  )
}
