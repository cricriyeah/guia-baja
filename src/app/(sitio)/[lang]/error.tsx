'use client'

import { ErrorGuia } from '../../../sitio/ui/ErrorGuia'

// Atrapa los errores del layout de guia (p. ej. la base caída con la caché vacía): se pinta sin cabecera.
export default function ErrorDelMarco({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorGuia reintentar={reset} />
}
