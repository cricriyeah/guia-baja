// src/sitio/ui/Etiquetas.tsx
import type { Locale } from '../../dominio/idioma'
import type { CategoriaPublica } from '../datos/tipos'
import { textos } from '../textos'

export const EtiquetaCategoria = ({ categoria }: { categoria: CategoriaPublica | undefined }) =>
  categoria ? <span className={`etiqueta ${categoria.claseGrupo}`}>{categoria.nombre}</span> : null

// Spec §7: «Patrocinado» no lleva color de grupo (texto tinta).
export const Patrocinado = ({ lang }: { lang: Locale }) => <span className="patrocinado">{textos(lang).tarjetas.patrocinado}</span>
