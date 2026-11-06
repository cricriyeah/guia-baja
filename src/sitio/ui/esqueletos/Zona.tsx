import '../../estilos/zona.css'
import { CabezaSeccion, Chips, Linea, Marco, Migas, Parrafo, Pastilla, Tarjeta, veces } from './Primitivas'

function TarjetaEvento() {
  return (
    <div className="evento">
      <div className="media esq" />
      <div className="evento__cuerpo">
        <Pastilla />
        <Linea w="85%" clase="titular" />
        <Linea w="55%" clase="meta" />
      </div>
    </div>
  )
}

export function EsqueletoZona() {
  return (
    <Marco clase="pagina-zona">
      <Migas />
      <div className="zona-intro">
        <Linea clase="t-pagina" w="min(70vw, 480px)" />
        <Parrafo lineas={1} />
      </div>
      <div className="mosaico">
        <div className="principal esq" />
        <div className="mosaico__lado">{veces(2, (i) => <div key={i} className="lateral esq" />)}</div>
      </div>
      <div className="filtros"><Chips clase="filtros__fila" anchos={[120, 110, 96, 88, 130]} /></div>
      <div className="seccion">
        <CabezaSeccion />
        <div className="riel"><div className="riel__pista hoy">{veces(5, (i) => <TarjetaEvento key={i} />)}</div></div>
      </div>
      <div className="seccion">
        <CabezaSeccion />
        <div className="feed-grupo">
          <Linea clase="feed-grupo__titulo" w={160} />
          <div className="feed">{veces(4, (i) => <Tarjeta key={i} />)}</div>
        </div>
      </div>
    </Marco>
  )
}
