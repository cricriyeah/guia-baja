// src/sitio/ui/HorarioEnVivo.tsx
'use client'

import { estadoHorario, type FilaHorario } from '../../dominio/horario'
import type { Locale } from '../../dominio/idioma'
import { textos } from '../textos'
import { useAhora } from './useAhora'

// «Abierto ahora» se calcula en el navegador: la página se cachea hasta una hora (decisiones, ajustes del frontend).
// Sin horario no se muestra nada.
export function HorarioEnVivo({ lang, horario, corto = false }: { lang: Locale; horario: FilaHorario[]; corto?: boolean }) {
  const ahora = useAhora()
  if (!ahora) return null
  const e = estadoHorario(horario, ahora)
  if (!e) return null
  const t = textos(lang)
  const texto = e.abierto
    ? e.cambiaEnMin !== null && e.cambiaEnMin <= 60
      ? t.ficha.cierraEn(t.duracion(e.cambiaEnMin))
      : t.ficha.abiertoAhora
    : corto || e.cambiaEnMin === null
      ? t.ficha.cerrado
      : t.ficha.abreEn(t.duracion(e.cambiaEnMin))
  return <span className={`abierto ${e.abierto ? 'si' : 'no'}`}>{texto}</span>
}
