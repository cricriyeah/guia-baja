const URL_VERIFICAR = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// Spec §11: verificado en el servidor con remoteip (la IP según la regla de §4.1). Nunca lanza: si falla, false.
export async function verificarTurnstile(token: string | undefined, ip: string | null, secreto: string | undefined, f: typeof fetch = fetch): Promise<boolean> {
  if (!token || !secreto) return false
  const body = new URLSearchParams({ secret: secreto, response: token })
  if (ip) body.set('remoteip', ip)
  try {
    const r = await f(URL_VERIFICAR, { method: 'POST', body, signal: AbortSignal.timeout(3000) })
    const j = (await r.json()) as { success?: boolean }
    return j.success === true
  } catch {
    return false
  }
}
