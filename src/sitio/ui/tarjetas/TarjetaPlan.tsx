import Link from 'next/link'

import type { Locale } from '../../../dominio/idioma'
import { rutas } from '../../../dominio/rutas'
import type { Plan } from '../../datos/consultas'
import { textos } from '../../textos'
import { Imagen } from '../Imagen'

export function TarjetaPlan({ lang, plan }: { lang: Locale; plan: Plan }) {
  const ruta = plan.tipo === 'itinerario' ? rutas.itinerario(lang, plan.item.slug) : rutas.tema(lang, plan.item.slug)
  return (
    <Link className="nota tarjeta presionable" href={ruta}>
      <div className="media"><Imagen imagen={plan.item.portada} sizes="(min-width: 720px) 33vw, 100vw" alt="" /></div>
      <div className="nota__cuerpo">
        {plan.tipo === 'itinerario' && <span><span className="etiqueta">{textos(lang).plan.dias(plan.item.numeroDias)}</span></span>}
        <p className="titular">{plan.item.titulo}</p>
        <p className="bajada">{plan.item.resumen}</p>
      </div>
    </Link>
  )
}
