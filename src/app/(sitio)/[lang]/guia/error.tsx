'use client'

import { ErrorGuia } from '../../../../sitio/ui/ErrorGuia'

export default function ErrorDeLaGuia({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorGuia reintentar={reset} />
}
