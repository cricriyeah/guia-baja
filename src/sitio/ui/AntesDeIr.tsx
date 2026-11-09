import type { Locale } from '../../dominio/idioma'
import { filasVisita, type VisitaPublica } from '../../dominio/visita'
import { textos } from '../textos'

// «Antes de ir» (spec del paquete 1 §2.3): texto real en una tabla, sin iconos que reemplacen palabras.
export function AntesDeIr({ lang, visita, zonaNombre }: { lang: Locale; visita: VisitaPublica | null; zonaNombre: string }) {
  const filas = visita ? filasVisita(visita, lang, zonaNombre) : []
  if (!filas.length) return null
  return (
    <section className="bloque antes-de-ir" aria-labelledby="t-antes">
      <h2 id="t-antes" className="t-seccion">{textos(lang).ficha.antesDeIr}</h2>
      <table className="horario">
        <tbody>
          {filas.map((f) => (
            <tr key={f.dato}><th scope="row">{f.dato}</th><td>{f.valor}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
