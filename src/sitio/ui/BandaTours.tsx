// src/sitio/ui/BandaTours.tsx
import type { Locale } from '../../dominio/idioma'
import type { ZonaPublica } from '../datos/tipos'
import { sitioUrl } from '../entorno'
import { textos } from '../textos'

// Banda fija con el único video del sitio (lineamientos, «Video»). Link a reservas con atribución (spec §13).
export function BandaTours({ lang, zona }: { lang: Locale; zona: ZonaPublica | null }) {
  const t = textos(lang).banda
  const conSede = zona?.sedeSlug ? zona : null
  const pieza = conSede ? `zona-${conSede.slug}` : 'portada'
  const href = conSede
    ? `${sitioUrl()}/${lang}/sede/${conSede.sedeSlug}?desde=guia&pieza=${pieza}`
    : `${sitioUrl()}/${lang}?desde=guia&pieza=${pieza}`
  return (
    <section className="tours" aria-labelledby="t-tours">
      <video src="/guia-assets/video/lancha-turquesa.mp4" poster="/guia-assets/video/lancha-turquesa.jpg" muted loop playsInline preload="none" data-auto aria-hidden="true" />
      <div className="tours__panel">
        <h2 id="t-tours">{t.titulo}</h2>
        <p>{t.texto}</p>
        {/* tour_clic solo tiene los orígenes del spec §13 (zona, lugar, artículo, categoría, cabecera): en la portada no se marca. */}
        <a className="boton presionable" href={href} data-evento={conSede ? 'tour_clic' : undefined} data-zona={conSede?.slug} data-origen={conSede ? 'zona' : undefined}>
          {t.boton(conSede?.nombre ?? null)}
        </a>
      </div>
    </section>
  )
}
