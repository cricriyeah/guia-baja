'use server'

import { headers } from 'next/headers'

import { origenReenviado } from '../dominio/origen'
import { obtenerPayload } from '../sitio/datos/payload'
import { avisarSolicitud } from './avisar'
import { enviarSolicitud } from './enviar'
import { verificarTurnstile } from './turnstile'

export type EstadoFormulario = { estado: 'inicial' | 'ok' | 'error'; motivo?: string; errores?: Record<string, string> }

// Server Action del formulario (spec §4, §11). La IP sale de lo que reenvió el proxy (F3a); nunca de headers crudos.
export async function enviarFormulario(_previo: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const form: Record<string, string> = {}
  for (const [k, v] of fd.entries()) if (typeof v === 'string') form[k] = v
  try {
    const r = await enviarSolicitud(await obtenerPayload(), form, origenReenviado(await headers()), {
      verificarTurnstile: (token, ip) => verificarTurnstile(token, ip, process.env.TURNSTILE_SECRET_KEY),
      avisar: avisarSolicitud,
      sal: process.env.IP_HASH_SALT ?? '',
    })
    return r.ok ? { estado: 'ok' } : { estado: 'error', motivo: r.motivo, errores: r.errores }
  } catch (e) {
    // Sin datos del formulario en el log (spec §11): solo el tipo de error.
    console.error('Server Action del formulario falló', e instanceof Error ? e.name : 'desconocido')
    return { estado: 'error', motivo: 'error' }
  }
}
