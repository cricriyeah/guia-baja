'use client'

import { icsDeEvento } from '../../dominio/ics'
import type { Locale } from '../../dominio/idioma'
import { textos } from '../textos'

// Tiempo para que el navegador tome el blob antes de liberarlo.
const REVOCAR_TRAS_MS = 30_000

export function Calendario(props: { lang: Locale; uid: string; nombre: string; inicio: string; fin: string | null; lugar: string; slug: string }) {
  const { lang, ...e } = props
  const descargar = () => {
    const ics = icsDeEvento({ ...e, url: window.location.href })
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${e.slug}.ics`
    a.click()
    // Revocar en el mismo ciclo puede cancelar la descarga en algunos navegadores (Safari): se deja pasar un rato.
    window.setTimeout(() => URL.revokeObjectURL(url), REVOCAR_TRAS_MS)
  }
  return (
    <button className="boton presionable" type="button" onClick={descargar}>{textos(lang).evento.calendario}</button>
  )
}
