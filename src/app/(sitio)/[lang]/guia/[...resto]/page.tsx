import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Provisional (Task 9): hace que el catch-all del slot @idioma tenga una ruta completa de children. La Task 10 lo reemplaza.
export default function Resto() {
  notFound()
}
