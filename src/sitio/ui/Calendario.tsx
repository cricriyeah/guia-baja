'use client'

import { icsDeEvento } from '../../dominio/ics'
import type { Locale } from '../../dominio/idioma'
import { textos } from '../textos'

export function Calendario(props: { lang: Locale; uid: string; nombre: string; inicio: string; fin: string | null; lugar: string; slug: string }) {
  const { lang, ...e } = props
  const descargar = () => {
    const ics = icsDeEvento({ ...e, url: window.location.href })
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${e.slug}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button className="boton presionable" type="button" onClick={descargar}>{textos(lang).evento.calendario}</button>
  )
}
