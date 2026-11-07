import { debeAparecer, ESPERA_MS, marcarMostrada, yaSeMostro } from './disparo'

// Módulo diferido (lo importa ActivadorTours en tiempo libre). Spec de presencia §2.2 y §2.3:
// - esconde la barra de tours al llegar al pie;
// - muestra la fila extra (móvil) o la tarjeta (escritorio) una vez por sesión, con los disparadores de disparo.ts;
// - nunca encima del visor de fotos ni de la hoja de búsqueda; Esc la cierra solo si no hay otra capa abierta.

const CAPAS = '.visor.mostrado, .busqueda.abierta'
const ESCRITORIO = '(min-width: 1024px) and (pointer: fine)'

const sesion = (): Storage | null => {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function activarTours(inicio: number): () => void {
  const quitar: (() => void)[] = []
  const escuchar = <K extends keyof WindowEventMap>(tipo: K, fn: (e: WindowEventMap[K]) => void, opciones?: AddEventListenerOptions) => {
    window.addEventListener(tipo, fn, opciones)
    quitar.push(() => window.removeEventListener(tipo, fn, opciones))
  }

  const barra = document.getElementById('tours-barra')
  const pie = document.querySelector('footer')
  if (barra && pie) {
    const io = new IntersectionObserver(([e]) => barra.classList.toggle('oculta', e.isIntersecting))
    io.observe(pie)
    quitar.push(() => io.disconnect())
  }

  const escritorio = window.matchMedia(ESCRITORIO).matches
  const objetivo = document.getElementById(escritorio ? 'tours-tarjeta' : 'tours-fila')
  if (!objetivo || yaSeMostro(sesion())) return () => quitar.forEach((f) => f())

  let visible = false
  let mostradaEnEstaCarga = false
  let salidaArriba = false
  let cerrada = false
  let vigilancia: number | undefined

  const capaAbierta = () => document.querySelector(CAPAS) !== null

  const cerrar = () => {
    cerrada = true
    visible = false
    objetivo.hidden = true
    objetivo.classList.remove('tapada')
    window.clearInterval(vigilancia)
  }

  const mostrar = () => {
    objetivo.hidden = false
    // Móvil: la barra con su fila extra nunca pasa del 20 % de la pantalla (regla de intersticiales, §1). Si no cabe, no sale.
    if (!escritorio && barra && barra.getBoundingClientRect().height > 0.2 * window.innerHeight) {
      objetivo.hidden = true
      cerrada = true
      return
    }
    visible = true
    mostradaEnEstaCarga = true
    marcarMostrada(sesion())
    // Mientras se ve: si se abre otra capa se esconde (sin contarlo como cierre) y vuelve al cerrarse.
    vigilancia = window.setInterval(() => objetivo.classList.toggle('tapada', capaAbierta()), 400)
  }

  const revisar = () => {
    if (visible || cerrada || mostradaEnEstaCarga) return
    const raiz = document.documentElement
    const ok = debeAparecer({
      msEnPagina: performance.now() - inicio,
      scrollY: window.scrollY,
      scrollHeight: raiz.scrollHeight,
      innerHeight: window.innerHeight,
      salidaArriba,
      escritorio,
      capaAbierta: capaAbierta(),
      yaMostrada: yaSeMostro(sesion()),
    })
    if (ok) mostrar()
  }

  escuchar('scroll', revisar, { passive: true })
  if (escritorio) {
    const alSalir = (e: MouseEvent) => {
      if (e.relatedTarget === null && e.clientY <= 0) {
        salidaArriba = true
        revisar()
        salidaArriba = false
      }
    }
    document.addEventListener('mouseout', alSalir)
    quitar.push(() => document.removeEventListener('mouseout', alSalir))
  }
  escuchar('keydown', (e) => {
    if (e.key === 'Escape' && visible && !capaAbierta()) cerrar()
  })
  const alClic = (e: Event) => {
    if ((e.target as Element | null)?.closest('[data-cerrar-tours]')) cerrar()
  }
  objetivo.addEventListener('click', alClic)
  quitar.push(() => objetivo.removeEventListener('click', alClic))

  // Si ya bajó antes de los 5 s, se revisa al cumplirse.
  const espera = window.setTimeout(revisar, Math.max(0, ESPERA_MS - (performance.now() - inicio)) + 50)
  quitar.push(() => window.clearTimeout(espera))

  return () => {
    window.clearInterval(vigilancia)
    quitar.forEach((f) => f())
  }
}
