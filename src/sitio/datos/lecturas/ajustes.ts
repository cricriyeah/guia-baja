import type { Payload } from 'payload'

import type { Locale } from '../../../dominio/idioma'
import type { Ajustes } from '../tipos'
import { opcionesPublicas } from './publico'

export async function ajustesPublicos(payload: Payload, lang: Locale): Promise<Ajustes> {
  const g = await payload.findGlobal({ slug: 'ajustes-guia', ...opcionesPublicas(lang), depth: 0 })
  return {
    correoPrivacidad: g.correoPrivacidad ?? null,
    formularioActivo: Boolean(g.formularioActivo),
    whatsappToursActivo: Boolean(g.whatsappToursActivo),
    versionAviso: g.versionAviso ?? null,
    avisoVigenteDesde: g.avisoVigenteDesde ?? null,
    avisoPrivacidad: g.avisoPrivacidad ?? null,
    portadaTitulo: g.portadaTitulo ?? null,
    portadaIntro: g.portadaIntro ?? null,
  }
}
