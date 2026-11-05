import { LOCALES, type Locale } from '../../dominio/idioma'
import { textos } from '../textos'

// El link del otro idioma viene resuelto del servidor (contextoDe): el HTML cacheado no depende de JavaScript.
export function SelectorIdioma({ lang, alterno }: { lang: Locale; alterno: string }) {
  return (
    <div className="idiomas" role="group" aria-label={textos(lang).cabecera.idioma}>
      {LOCALES.map((l) =>
        l === lang ? (
          <a key={l} aria-current="true" lang={l}>{l.toUpperCase()}</a>
        ) : (
          <a key={l} href={alterno} lang={l} hrefLang={l}>{l.toUpperCase()}</a>
        ),
      )}
    </div>
  )
}
