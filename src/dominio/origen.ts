import { createHmac, timingSafeEqual } from 'node:crypto'

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

// Sello que solo src/proxy.ts puede poner: sale del secreto sin revelarlo. Prueba que las cabeceras
// x-guia-origen y x-guia-ip las escribió el proxy. Hay peticiones que llegan a la Server Action sin pasar por él
// (un [lang] fuera del matcher, o Next reenviando la acción desde otra página con las cabeceras originales).
export function selloDelProxy(secreto: string): string {
  return createHmac('sha256', secreto).update('sunbaja-guia:x-guia-sello:v1').digest('hex')
}

// Lo que el proxy deja en la petición; solo se cree si trae el sello correcto. Sin sello (o sin secreto
// configurado) vale lo mismo que el proxy decide para una petición directa: x-real-ip, que en Vercel pone la
// plataforma y el cliente no controla.
export function origenReenviado(headers: Headers, secreto: string | undefined): Origen {
  const sello = headers.get('x-guia-sello')
  if (secreto && sello && iguales(sello, selloDelProxy(secreto))) {
    return {
      tipo: headers.get('x-guia-origen') === 'publico' ? 'publico' : 'directo',
      ip: primeraIp(headers.get('x-guia-ip')),
    }
  }
  return { tipo: 'directo', ip: primeraIp(headers.get('x-real-ip')) }
}
