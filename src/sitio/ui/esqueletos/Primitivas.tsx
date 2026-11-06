import type { ReactNode } from 'react'

import { AvisoCarga } from './AvisoCarga'

// Piezas de los esqueletos de carga. Las páginas las componen con las mismas clases de su contenido real (.lista,
// .galeria, .agenda…), así el esqueleto ocupa el mismo lugar y la página no salta al llegar los datos.

export const veces = (n: number, pieza: (i: number) => ReactNode): ReactNode[] => Array.from({ length: n }, (_, i) => pieza(i))

// Marco de un esqueleto de página: anuncia la carga una vez y esconde las piezas a los lectores de pantalla.
export function Marco({ clase = '', children }: { clase?: string; children: ReactNode }) {
  return (
    <div className={`ancho ${clase}`} aria-busy="true">
      <AvisoCarga />
      <div aria-hidden="true">{children}</div>
    </div>
  )
}

// Una línea de texto. `clase` da la tipografía (.t-pagina, .t-seccion…) y la línea toma su tamaño.
export function Linea({ w = '100%', clase }: { w?: string | number; clase?: string }) {
  return <div className={clase}><span className="esq esq--texto" style={{ width: w }} /></div>
}

export function Parrafo({ lineas = 3, clase }: { lineas?: number; clase?: string }) {
  return (
    <div className={clase}>
      {veces(lineas, (i) => <span key={i} className="esq esq--texto" style={{ width: i === lineas - 1 ? '60%' : '100%' }} />)}
    </div>
  )
}

// Tarjeta genérica (.esqueleto de la propuesta C): foto y tres líneas, como .nota.
export function Tarjeta() {
  return <div className="esqueleto"><i /><i /><i /><i /></div>
}

export function Pastilla() {
  return <span className="esq esq--pastilla" />
}

export function Migas() {
  return <div className="migas">{[44, 88, 120].map((w) => <span key={w} className="esq esq--texto" style={{ width: w }} />)}</div>
}

export function Chips({ anchos, clase = 'pildoras' }: { anchos: number[]; clase?: string }) {
  return <div className={clase}>{anchos.map((w, i) => <span key={i} className="chip esq" style={{ width: w }} />)}</div>
}

export function CabezaSeccion() {
  return <div className="seccion__cabeza"><Linea clase="t-seccion" w="min(60vw, 320px)" /></div>
}
