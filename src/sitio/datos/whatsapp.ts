import type { Locale } from '../../dominio/idioma'
import { digitosWhatsapp } from '../../dominio/whatsapp'
import { whatsappNumero } from '../entorno'
import { ajustesCacheados } from './cacheadas'

// Los dígitos de WHATSAPP_NUMERO si la casilla de Ajustes está encendida; si no, null (spec del paquete 1 §2.7).
export async function whatsappTours(lang: Locale): Promise<string | null> {
  const ajustes = await ajustesCacheados(lang)
  return ajustes.whatsappToursActivo ? digitosWhatsapp(whatsappNumero()) : null
}
