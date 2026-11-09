import type { Locale } from '../../dominio/idioma'
import { enlaceWhatsapp, mensajeWhatsapp } from '../../dominio/whatsapp'
import { textos } from '../textos'
import { ICONO_WHATSAPP } from './iconos'

type OrigenWhatsapp = 'relacionado' | 'zona' | 'tarjeta' | 'barra'

// Link de salida a WhatsApp (spec del paquete 1 §2.7). Recibe los dígitos ya validados: si no hay, no se pinta.
export function EnlaceWhatsapp({ lang, digitos, nombre, zona, origen, icono = false }: {
  lang: Locale; digitos: string; nombre: string; zona: string; origen: OrigenWhatsapp; icono?: boolean
}) {
  const t = textos(lang).tours
  const comunes = {
    href: enlaceWhatsapp(digitos, mensajeWhatsapp(lang, nombre)),
    target: '_blank',
    rel: 'noopener',
    'data-evento': 'whatsapp_clic',
    'data-zona': zona,
    'data-origen': origen,
  }
  if (icono) {
    return (
      <a className="boton-whatsapp presionable" aria-label={t.whatsappBoton} {...comunes}>
        <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d={ICONO_WHATSAPP} /></svg>
      </a>
    )
  }
  return <a className="enlace-whatsapp" {...comunes}>{t.whatsappTexto}</a>
}
