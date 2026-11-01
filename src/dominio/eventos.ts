export function esEventoProximo(
  e: { inicio: string | Date; fin?: string | Date | null },
  ahora: Date = new Date(),
): boolean {
  return new Date(e.fin ?? e.inicio) >= ahora
}
