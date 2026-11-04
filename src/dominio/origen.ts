import { timingSafeEqual } from 'node:crypto'

export type Origen = { tipo: 'publico' | 'directo'; ip: string | null }

function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

function primeraIp(valor: string | null): string | null {
  const ip = valor?.split(',')[0]?.trim()
  return ip ? ip : null
}

// Spec §4.1. Solo lo llama src/proxy.ts; lo demás lee lo que el proxy reenvía (origenReenviado).
export function origenDePeticion(headers: Headers, secreto: string | undefined): Origen {
  const recibido = headers.get('x-guia-proxy')
  if (secreto && recibido && iguales(recibido, secreto)) {
    return { tipo: 'publico', ip: primeraIp(headers.get('x-guia-ip')) }
  }
  return { tipo: 'directo', ip: primeraIp(headers.get('x-real-ip')) }
}

// Lo que el proxy deja en la petición. El proxy siempre sobrescribe estas cabeceras: el cliente no puede falsificarlas.
export function origenReenviado(headers: Headers): Origen {
  return {
    tipo: headers.get('x-guia-origen') === 'publico' ? 'publico' : 'directo',
    ip: primeraIp(headers.get('x-guia-ip')),
  }
}
