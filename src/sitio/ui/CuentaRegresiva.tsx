// src/sitio/ui/CuentaRegresiva.tsx
'use client'

import type { Locale } from '../../dominio/idioma'
import { textos } from '../textos'
import { useAhora } from './useAhora'

// Decisión 10: sin fin solo «Empieza en…»; «En curso · termina en…» solo si hay fin. Se calcula en el navegador.
export function CuentaRegresiva({ lang, inicio, fin }: { lang: Locale; inicio: string; fin: string | null }) {
  const fecha = useAhora()
  if (!fecha) return null
  const ahora = fecha.getTime()
  const t = textos(lang)
  const a = new Date(inicio).getTime()
  const b = fin ? new Date(fin).getTime() : null
  if (ahora < a) return <span className="cuenta">{t.evento.empiezaEn(t.duracion((a - ahora) / 60000))}</span>
  if (b && ahora < b) return <span className="cuenta en-curso">{t.evento.enCurso(t.duracion((b - ahora) / 60000))}</span>
  return null
}
