import type { Locale } from '../../dominio/idioma'
import type { Plan } from '../datos/consultas'
import { TarjetaPlan } from './tarjetas/TarjetaPlan'

export function SeccionPlanes({ lang, titulo, planes, id }: { lang: Locale; titulo: string; planes: Plan[]; id: string }) {
  if (!planes.length) return null
  return (
    <section className="seccion" aria-labelledby={id}>
      <div className="seccion__cabeza"><h2 id={id} className="t-seccion">{titulo}</h2></div>
      <div className="mas-art">{planes.map((p) => <TarjetaPlan key={`${p.tipo}-${p.item.id}`} lang={lang} plan={p} />)}</div>
    </section>
  )
}
