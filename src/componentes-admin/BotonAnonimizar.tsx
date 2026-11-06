'use client'

import { Button, useAuth, useDocumentInfo } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Acción del admin (spec §12). El servidor revisa que sea Admin; aquí solo se oculta para los demás.
export function BotonAnonimizar() {
  const { id } = useDocumentInfo()
  const { user } = useAuth<{ rol?: string }>()
  const router = useRouter()
  const [trabajando, setTrabajando] = useState(false)
  if (!id || user?.rol !== 'admin') return null
  return (
    <Button
      buttonStyle="secondary"
      disabled={trabajando}
      onClick={async () => {
        if (!window.confirm('Se borrarán nombre, correo, teléfono, web y mensaje de esta solicitud. No se puede deshacer.')) return
        setTrabajando(true)
        // La API de Payload vive en /api (routes.api por defecto; payload.config.ts no lo cambia).
        const r = await fetch(`/api/solicitudes/${id}/anonimizar`, { method: 'POST', credentials: 'include' })
        setTrabajando(false)
        if (r.ok) router.refresh()
        else window.alert('No se pudo anonimizar.')
      }}
    >
      Anonimizar solicitud
    </Button>
  )
}
