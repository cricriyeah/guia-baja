'use client'

import { ZONA_HORARIA } from '../../dominio/fechas-evento'
import type { Locale } from '../../dominio/idioma'
import { puestaDelSol } from '../../dominio/sol'
import { textos } from '../textos'
import { useAhora } from './useAhora'

// «Hoy en {zona}»: la nota de la puesta del sol se calcula en el navegador (plan F3b, decisiones).
export function PuestaDelSol({ lang, lat, lng }: { lang: Locale; lat: number; lng: number }) {
  const ahora = useAhora(60 * 60 * 1000)
  if (!ahora) return <p className="seccion__nota esq--vivo" aria-hidden="true"><span className="esq esq--texto" style={{ width: 220 }} /></p>
  const hora = new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { timeZone: ZONA_HORARIA, hour: 'numeric', minute: '2-digit' }).format(
    new Date(puestaDelSol(ahora, lat, lng)),
  )
  return <p className="seccion__nota">{textos(lang).sol.hoy(hora)}</p>
}
