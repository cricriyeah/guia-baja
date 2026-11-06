import '../../estilos/portada.css'
import { CabezaSeccion, Chips, Linea, Marco, Migas, Parrafo, Pastilla, Tarjeta, veces } from './Primitivas'

function FilaAgenda() {
  return (
    <div className="agenda__fila">
      <span className="fecha esq" />
      <div>
        <Pastilla />
        <Linea w="75%" clase="titular" />
        <Linea w="50%" clase="meta" />
      </div>
      <div className="media esq" />
    </div>
  )
}

export function EsqueletoAgenda({ filas = 6 }: { filas?: number }) {
  return <div className="agenda">{veces(filas, (i) => <FilaAgenda key={i} />)}</div>
}

export function EsqueletoPortada() {
  return (
    <Marco>
      <div className="encabezado">
        <Linea clase="t-pagina" w="min(80vw, 720px)" />
        <Parrafo lineas={1} />
      </div>
      <div className="destacados">{veces(3, (i) => <div key={i} className="destacado esq" />)}</div>
      <div className="seccion">
        <CabezaSeccion />
        <div className="zonas-rejilla">{veces(3, (i) => <div key={i} className="zona-tarjeta esq" />)}</div>
      </div>
      <div className="seccion">
        <CabezaSeccion />
        <EsqueletoAgenda filas={4} />
      </div>
      <div className="seccion">
        <CabezaSeccion />
        <div className="articulos">{veces(3, (i) => <Tarjeta key={i} />)}</div>
      </div>
    </Marco>
  )
}

export function EsqueletoEventos() {
  return (
    <Marco>
      <Migas />
      <div className="encabezado">
        <Linea clase="t-pagina" w="min(70vw, 560px)" />
        <Parrafo lineas={1} />
      </div>
      <Chips anchos={[120, 96, 110, 84]} />
      <EsqueletoAgenda />
    </Marco>
  )
}
