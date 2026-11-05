// src/sitio/ui/Aparece.tsx
import Link from 'next/link'

import type { Locale } from '../../dominio/idioma'
import { rutas } from '../../dominio/rutas'
import { textos } from '../textos'

export function Aparece({ lang }: { lang: Locale }) {
  const t = textos(lang).aparece
  return (
    <section className="aparece" aria-labelledby="t-aparece">
      <div><h2 id="t-aparece">{t.titulo}</h2><p>{t.texto}</p></div>
      <Link className="boton boton--secundario presionable" href={rutas.negocios(lang)}>{t.boton}</Link>
    </section>
  )
}
