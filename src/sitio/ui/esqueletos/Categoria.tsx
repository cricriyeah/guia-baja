import '../../estilos/categoria.css'
import { Chips, Linea, Marco, Migas, Tarjeta, veces } from './Primitivas'

// Solo los resultados: lo usa también TransicionFiltros mientras llega la variante con filtros.
export function EsqueletoResultados({ conMapa }: { conMapa: boolean }) {
  const lista = <div className="lista">{veces(6, (i) => <Tarjeta key={i} />)}</div>
  return (
    <>
      <Linea clase="contador-res" w={120} />
      {conMapa ? (
        <div className="explorar" data-vista="lista">
          {lista}
          <div className="mapa-cat esq" />
        </div>
      ) : (
        <div className="seccion">{lista}</div>
      )}
    </>
  )
}

export function EsqueletoCategoria({ conMapa }: { conMapa: boolean }) {
  return (
    <Marco clase="pagina-categoria">
      <Migas />
      <div className="portada-cat esq" />
      <Chips anchos={[120, 110, 96, 130]} />
      <Chips clase="herramientas" anchos={[72, 120, 104, 96, 56, 56]} />
      <EsqueletoResultados conMapa={conMapa} />
    </Marco>
  )
}
