import type { Locale } from '../../dominio/idioma'
import type { ZonaPublica } from '../datos/tipos'
import { sitioUrl } from '../entorno'
import { textos } from '../textos'

// Único link a reservas de la cabecera (spec §7): nombra su destino y conoce la zona. Atribución y evento: spec §13.
export function Puente({ lang, zona }: { lang: Locale; zona: ZonaPublica | null }) {
  const t = textos(lang).cabecera
  const conSede = zona?.sedeSlug ? zona : null
  const href = conSede
    ? `${sitioUrl()}/${lang}/sede/${conSede.sedeSlug}?desde=guia&pieza=cabecera`
    : `${sitioUrl()}/${lang}?desde=guia&pieza=cabecera`
  return (
    <a className="puente presionable" href={href} data-evento="tour_clic" data-zona={zona?.slug ?? ''} data-origen="cabecera">
      <span className="puente__largo">{conSede ? t.toursEn(conSede.nombre) : t.toursEnLaBaja}</span>
      <span className="puente__corto">{t.tours}</span>
      <span aria-hidden="true">→</span>
    </a>
  )
}
