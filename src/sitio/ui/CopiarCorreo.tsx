'use client'

import { useEffect, useRef, useState } from 'react'

// Sin API de portapapeles (contexto no seguro) o con permiso negado, copiar falla sin lanzar: el correo sigue a la
// vista como link, así que no hay nada que avisar.
export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

export function CopiarCorreo({ correo, copiar, copiado }: { correo: string; copiar: string; copiado: string }) {
  const [hecho, setHecho] = useState(false)
  const temporizador = useRef<number | undefined>(undefined)

  const montado = useRef(false)

  // En el cuerpo del efecto (y no solo en la limpieza) para que también valga con el doble montaje de StrictMode.
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
      window.clearTimeout(temporizador.current)
    }
  }, [])

  async function alCopiar() {
    const logrado = await copiarAlPortapapeles(correo)
    // Si se desmontó mientras esperaba el permiso, ni estado ni temporizador nuevos.
    if (!logrado || !montado.current) return
    setHecho(true)
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setHecho(false), 1400)
  }

  return (
    <span className="correo-arco">
      <a href={`mailto:${correo}`}>{correo}</a>
      <button className={`copiar presionable${hecho ? ' confirmado' : ''}`} type="button" aria-live="polite" onClick={alCopiar}>
        {hecho ? copiado : copiar}
      </button>
    </span>
  )
}
