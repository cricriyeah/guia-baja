// Spec §13: la herramienta (la misma del sitio de reservas) no está confirmada. Conectarla es cambiar solo este
// archivo; mientras tanto no se envía nada.
// El evento local no sale de la página ni lleva datos personales: las E2E lo escuchan para comprobar qué se mide.
export function enviarEvento(evento: string, props: Record<string, string>): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('guia:evento', { detail: { evento, props } }))
}
