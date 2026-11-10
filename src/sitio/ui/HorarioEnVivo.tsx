// src/sitio/ui/HorarioEnVivo.tsx
'use client'

import { cuandoAbre, estadoHorario, type FilaHorario } from '../../dominio/horario'
import type { Locale } from '../../dominio/idioma'
import { textos } from '../textos'
import { useAhora } from './useAhora'

// «Abierto ahora» se calcula en el navegador: la página se cachea hasta una hora (decisiones, ajustes del frontend).
// Sin horario no se muestra nada; con horario, un esqueleto reserva su lugar hasta tener la hora.
export function HorarioEnVivo({ lang, horario, corto = false }: { lang: Locale; horario: FilaHorario[]; corto?: boolean }) {
  const ahora = useAhora()
  if (!horario?.length) return null
  if (!ahora) return <span className="esq esq--pastilla esq--vivo" aria-hidden="true" />
  const e = estadoHorario(horario, ahora)
  if (!e) return null
  const t = textos(lang)
  const abre = corto ? null : cuandoAbre(e)
  const texto = e.abierto
    ? e.cambiaEnMin !== null && e.cambiaEnMin <= 60
      ? t.ficha.cierraEn(t.duracion(e.cambiaEnMin))
      : t.ficha.abiertoAhora
    : !abre
      ? t.ficha.cerrado
      : abre.en === 'minutos'
        ? t.ficha.abreEn(t.duracion(abre.min))
        : abre.en === 'hoy'
          ? t.ficha.abreHoy(abre.hora)
          : abre.en === 'manana'
            ? t.ficha.abreManana(abre.hora)
            : t.ficha.abreDia(t.ficha.dias[abre.dia], abre.hora)
  return <span className={`abierto ${e.abierto ? 'si' : 'no'}`}>{texto}</span>
}
