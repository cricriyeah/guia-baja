import '../../estilos/busqueda.css'
import { Linea, Parrafo, veces } from './Primitivas'

function Resultado() {
  return (
    <div className="res">
      <Linea w="70%" clase="titular" />
      <Parrafo lineas={2} clase="bajada" />
    </div>
  )
}

// Solo los resultados: lo usa TransicionFiltros mientras llega la variante con otro tipo, zona o página. Va dentro de la
// raíz .pagina-busqueda de la página, que es de donde salen los estilos de .grupo, .resultados y .res.
export function EsqueletoBusqueda({ grupos = 2, resultados = 3 }: { grupos?: number; resultados?: number }) {
  return (
    <>
      {veces(grupos, (g) => (
        <div key={g} className="grupo">
          <Linea clase="t-seccion" w={120} />
          <div className="resultados">{veces(resultados, (i) => <Resultado key={i} />)}</div>
        </div>
      ))}
    </>
  )
}
