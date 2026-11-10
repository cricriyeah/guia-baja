import { puntuarTours, razonTour, type Etiquetas, type Respuestas } from '../../../dominio/perfil-tour'
import { mesEnBCS } from '../../../dominio/temporada'
import { track } from '../../analitica/track'

export type Quiz = { ver(): void; limpiar(): void }

const lista = (v: string | undefined) => (v ? v.split(' ') : [])

// Módulo diferido del quiz (spec del paquete 3 §2.2). Solo lee lo que el servidor dejó en la página: no pide nada.
export function activarQuiz(raiz: HTMLElement): Quiz {
  const uno = <T extends HTMLElement>(selector: string) => raiz.querySelector<T>(selector) as T
  const preguntas = uno('[data-quiz-preguntas]')
  const resultado = uno('[data-quiz-resultado]')
  const contenedor = uno('[data-quiz-lista]')
  const titulo = uno('[data-quiz-titulo]')
  const vivo = uno('[data-quiz-vivo]')
  const boton = uno('[data-quiz-ver]')
  const reiniciar = uno('[data-quiz-reiniciar]')
  const etiquetas = JSON.parse(raiz.dataset.etiquetas ?? '{}') as Etiquetas
  const radios = [...raiz.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
  const marcado = (nombre: string) => radios.find((r) => r.name === nombre && r.checked)?.value ?? null

  const tours = [...raiz.querySelectorAll<HTMLElement>('[data-quiz-tour]')].map((el) => ({
    el,
    clave: el.dataset.clave ?? '',
    gustos: lista(el.dataset.gustos),
    paraQuien: lista(el.dataset.paraQuien),
    jornada: el.dataset.jornada || null,
    meses: lista(el.dataset.meses).map(Number),
  }))

  const ver = () => {
    const gusto = marcado('gusto')
    if (!gusto) return
    const r: Respuestas = { gusto, paraQuien: marcado('para-quien'), jornada: marcado('jornada') }
    const mes = mesEnBCS(new Date())
    const ganadores = puntuarTours(tours, r, mes)
    tours.forEach((t) => { t.el.hidden = true })
    for (const t of ganadores ?? tours.filter((x) => x.el.hasAttribute('data-respaldo'))) {
      const razon = t.el.querySelector<HTMLElement>('[data-quiz-razon]') as HTMLElement
      razon.textContent = ganadores ? razonTour(t, r, mes, etiquetas) : ''
      razon.hidden = !ganadores
      contenedor.append(t.el) // El orden en pantalla es el de los puntos.
      t.el.hidden = false
    }
    titulo.textContent = (ganadores ? raiz.dataset.tituloResultado : raiz.dataset.sinCoincidencias) ?? ''
    preguntas.hidden = true
    resultado.hidden = false
    vivo.textContent = titulo.textContent
    titulo.focus()
    track('quiz_resultado', { zona: raiz.dataset.zona, gusto })
  }

  const alReiniciar = () => {
    radios.forEach((r) => { r.checked = false })
    boton.setAttribute('aria-disabled', 'true')
    resultado.hidden = true
    preguntas.hidden = false
    vivo.textContent = ''
    radios[0]?.focus()
  }

  reiniciar.addEventListener('click', alReiniciar)
  return { ver, limpiar: () => reiniciar.removeEventListener('click', alReiniciar) }
}
