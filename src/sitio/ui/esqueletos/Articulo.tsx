import { Linea, Marco, Migas, Parrafo, Pastilla, veces } from './Primitivas'

export function EsqueletoArticulo() {
  return (
    <Marco clase="pagina-articulo">
      <Migas />
      <div className="art-cabeza">
        <Pastilla />
        <Linea clase="t-pagina" w="90%" />
        <Parrafo lineas={2} clase="resumen" />
        <div className="firma">{[110, 150, 72].map((w) => <span key={w} className="esq esq--texto" style={{ width: w }} />)}</div>
      </div>
      <div className="art-portada esq" />
      <div className="art-cuerpo">
        <div className="indice">{veces(4, (i) => <Linea key={i} w={i % 2 ? '60%' : '85%'} />)}</div>
        <div className="prosa">{veces(3, (i) => <Parrafo key={i} lineas={4} />)}</div>
      </div>
    </Marco>
  )
}
