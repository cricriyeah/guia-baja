// Fade in para lo que llega después del primer pintado. Lo que ya viene en el HTML usa @keyframes aparecer (base.css).
// Con Web Animations y sin dejar estilos: al terminar, el elemento queda como estaba y sin contexto de apilamiento.
export const DURACION_APARECER_MS = 180

export function aparecer(el: Element | null): void {
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DURACION_APARECER_MS, easing: 'ease-out' })
}
