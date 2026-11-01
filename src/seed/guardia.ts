// Guardia del seed: función pura, sin importar nada del proyecto.
// Los motivos nunca incluyen la contraseña ni la URL (puede traer credenciales).

export const LARGO_MINIMO_CONTRASENA_SEED = 12

type EntornoSeed = Record<string, string | undefined> & {
  SEED_PERMITIDO?: string
  SEED_CONTRASENA_ADMIN?: string
  DATABASE_URL?: string
}

export type ResultadoGuardia = { permitido: true } | { permitido: false; motivo: string }

function baseDeDatosPermitida(url: string | undefined): boolean {
  if (!url) return false
  let analizada: URL
  try {
    analizada = new URL(url)
  } catch {
    return false
  }
  const host = analizada.hostname
  const base = decodeURIComponent(analizada.pathname.replace(/^\//, ''))
  return host === 'localhost' || host === '127.0.0.1' || base === 'preview'
}

export function verificarSeed(env: EntornoSeed): ResultadoGuardia {
  if (env.SEED_PERMITIDO !== 'true') {
    return { permitido: false, motivo: 'El seed borra todo. Solo corre con SEED_PERMITIDO=true (local o base de previews).' }
  }
  if (!baseDeDatosPermitida(env.DATABASE_URL)) {
    return {
      permitido: false,
      motivo: 'DATABASE_URL no es local (localhost o 127.0.0.1) ni la base «preview». El seed no corre contra otra base.',
    }
  }
  if ((env.SEED_CONTRASENA_ADMIN ?? '').length < LARGO_MINIMO_CONTRASENA_SEED) {
    return {
      permitido: false,
      motivo: `Define SEED_CONTRASENA_ADMIN con al menos ${LARGO_MINIMO_CONTRASENA_SEED} caracteres.`,
    }
  }
  return { permitido: true }
}
