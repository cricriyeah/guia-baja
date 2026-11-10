import type { Locale } from '../../../dominio/idioma'
import { etiquetasQuiz, GUSTOS, JORNADAS, PARA_QUIEN, toursDelQuiz } from '../../../dominio/perfil-tour'
import { atribucion, rutasReservas } from '../../../dominio/rutas'
import { toursDeSede } from '../../datos/cacheadas'
import type { ZonaPublica } from '../../datos/tipos'
import { whatsappTours } from '../../datos/whatsapp'
import { sitioUrl } from '../../entorno'
import { textos } from '../../textos'
import { EnlaceWhatsapp } from '../EnlaceWhatsapp'
import { TarjetaTour } from '../TarjetaTour'
import { ActivadorQuiz } from './ActivadorQuiz'

function Pregunta({ lang, nombre, leyenda, opciones }: { lang: Locale; nombre: string; leyenda: string; opciones: readonly { valor: string; es: string; en: string }[] }) {
  return (
    <fieldset className="quiz__pregunta">
      <legend>{leyenda}</legend>
      {opciones.map((o) => (
        <label key={o.valor} className="quiz__opcion">
          <input type="radio" name={nombre} value={o.valor} />
          <span>{o[lang]}</span>
        </label>
      ))}
    </fieldset>
  )
}

// Spec del paquete 3 §2.2. Sin <form>: con radios y sin botón de envío, Enter mandaría la página a sí misma.
// El botón es un link: sin JavaScript, o si el módulo no llega, lleva a la sede. No lleva data-evento (lo explica el spec).
export async function QuizTours({ lang, zona }: { lang: Locale; zona: ZonaPublica }) {
  if (!zona.sedeSlug) return null
  const [tours, digitos] = await Promise.all([toursDeSede(zona.sedeSlug, lang), whatsappTours(lang)])
  const seleccion = toursDelQuiz(tours)
  if (!seleccion) return null
  const t = textos(lang).quiz
  const pieza = `quiz-${zona.slug}`
  return (
    <section
      className="seccion quiz" id="quiz-tours" aria-labelledby="t-quiz"
      data-zona={zona.slug} data-titulo-resultado={t.resultado} data-sin-coincidencias={t.sinCoincidencias(zona.nombre)} data-etiquetas={JSON.stringify(etiquetasQuiz(lang))}
    >
      <div className="seccion__cabeza"><h2 id="t-quiz" className="t-seccion">{t.titulo}</h2></div>
      <div className="quiz__preguntas" data-quiz-preguntas>
        <Pregunta lang={lang} nombre="para-quien" leyenda={t.conQuien} opciones={PARA_QUIEN} />
        <Pregunta lang={lang} nombre="gusto" leyenda={t.gusto} opciones={GUSTOS} />
        <Pregunta lang={lang} nombre="jornada" leyenda={t.tiempo} opciones={JORNADAS} />
        <a className="boton presionable" data-quiz-ver data-texto={t.verMisTours} href={`${sitioUrl()}${rutasReservas.sede(lang, zona.sedeSlug)}?${atribucion(`${pieza}-sin-js`)}`}>
          {t.verTodos(zona.nombre)}
        </a>
      </div>
      <div className="quiz__resultado" data-quiz-resultado hidden>
        <h3 className="titular" data-quiz-titulo tabIndex={-1} />
        <div className="quiz__lista" data-quiz-lista>
          {seleccion.tarjetas.map((tour) => (
            <div
              key={tour.clave} className="quiz__tour" hidden data-quiz-tour data-clave={tour.clave}
              data-gustos={tour.gustos.join(' ')} data-para-quien={tour.paraQuien.join(' ')} data-jornada={tour.jornada ?? ''} data-meses={tour.meses.join(' ')}
              data-respaldo={seleccion.respaldo.includes(tour.clave) ? '' : undefined}
            >
              <p className="meta" data-quiz-razon />
              <TarjetaTour lang={lang} tour={tour} enlace={{ href: `${sitioUrl()}${tour.ruta}?${atribucion(pieza)}`, 'data-evento': 'tour_clic', 'data-zona': zona.slug, 'data-origen': 'quiz' }} />
            </div>
          ))}
        </div>
        <div className="quiz__acciones">
          <button type="button" className="boton boton--secundario presionable" data-quiz-reiniciar>{t.reiniciar}</button>
          {digitos && <EnlaceWhatsapp lang={lang} digitos={digitos} nombre={zona.nombre} zona={zona.slug} origen="quiz" />}
        </div>
      </div>
      <p className="quiz__vivo" aria-live="polite" data-quiz-vivo />
      <ActivadorQuiz />
    </section>
  )
}
