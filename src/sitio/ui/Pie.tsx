import Link from 'next/link'

import type { Locale } from '../../dominio/idioma'
import { rutas } from '../../dominio/rutas'
import { sitioUrl, whatsappNumero } from '../entorno'
import { textos } from '../textos'
import { DIRECCION_PIE, RUTAS_PIE } from './pie-datos'

const ICONO_WHATSAPP =
  'M187.58,144.84l-32-16a8,8,0,0,0-8,.5l-14.69,9.8a40.55,40.55,0,0,1-16-16l9.8-14.69a8,8,0,0,0,.5-8l-16-32A8,8,0,0,0,104,64a40,40,0,0,0-40,40,88.1,88.1,0,0,0,88,88,40,40,0,0,0,40-40A8,8,0,0,0,187.58,144.84ZM128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Z'

// Pie del sitio de reservas (spec §7) más el aviso de privacidad de la Guía. Links al sitio: <a>.
export function Pie({ lang }: { lang: Locale }) {
  const t = textos(lang).pie
  const sitio = (ruta: string) => `${sitioUrl()}/${lang}${ruta}`
  const whatsapp = whatsappNumero()
  const explora = [
    [t.mapa, RUTAS_PIE.mapa],
    [t.sedes, RUTAS_PIE.sedes],
    [t.comoFunciona, RUTAS_PIE.comoFunciona],
    [t.empresas, RUTAS_PIE.empresas],
    [t.nosotros, RUTAS_PIE.nosotros],
  ] as const
  return (
    <footer className="pie-sb" id="contacto">
      <div className="pie-sb__dentro">
        <div className="pie-sb__rejilla">
          <div className="pie-sb__grupo">
            <h2>{t.titulo}</h2>
            <a className="pie-sb__boton" href={sitio(RUTAS_PIE.reservar)}>{t.reservar}</a>
            <nav aria-label={t.explora}>
              <ul className="pie-sb__enlaces">
                {explora.map(([texto, ruta]) => (
                  <li key={ruta}>
                    <a className="enlace" href={sitio(ruta)}>{texto}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="pie-sb__grupo">
            <h3>{t.atencion}</h3>
            {whatsapp && (
              <a className="pie-sb__boton" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener">
                <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d={ICONO_WHATSAPP} /></svg>
                {t.whatsapp}
              </a>
            )}
            <p style={{ marginTop: 8 }}>{DIRECCION_PIE}</p>
          </div>
          <div className="pie-sb__grupo">
            <h3>{t.pagos}</h3>
            <ul className="pie-sb__pagos">
              <li><img src="/guia-assets/pagos/visa.svg" alt="Visa" /></li>
              <li><img src="/guia-assets/pagos/mastercard.svg" alt="Mastercard" /></li>
              <li><img src="/guia-assets/pagos/amex.svg" alt="American Express" /></li>
              <li className="pie-sb__efectivo">{t.efectivo}</li>
            </ul>
            <p style={{ maxWidth: '28ch' }}>{t.notaPagos}</p>
          </div>
          <nav className="pie-sb__legal" aria-label={t.legal}>
            <h3>{t.legal}</h3>
            <a className="enlace" href={sitio(RUTAS_PIE.deslinde)}>{t.deslinde}</a>
            <a className="enlace" href={sitio(RUTAS_PIE.privacidad)}>{t.privacidad}</a>
            <Link className="enlace" href={rutas.privacidad(lang)}>{t.privacidadGuia}</Link>
          </nav>
        </div>
        <div className="pie-sb__logo" role="img" aria-label="Sun Baja Experience">
          <img className="logo-isotipo" src="/guia-assets/logos/logolg-isotipo.svg" alt="" />
          <img className="logo-letras" src="/guia-assets/logos/logolg-letras.svg" alt="" />
        </div>
        <div className="pie-sb__final">
          <span>{t.derechos}</span>
          <span>{t.hecho} <strong>crwncode studios</strong></span>
        </div>
      </div>
    </footer>
  )
}
