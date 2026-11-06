import '../../estilos/aparece.css'
import { Linea, Marco, Migas, Parrafo, veces } from './Primitivas'

const Campo = ({ alto = false }: { alto?: boolean }) => <span className={`esq esq-campo${alto ? ' esq-campo--alto' : ''}`} />

export function EsqueletoAparece() {
  return (
    <Marco clase="pagina-aparece">
      <Migas />
      <div className="negocios">
        <div className="explica">
          <Linea clase="t-pagina" w="min(80vw, 480px)" />
          <Parrafo lineas={3} />
          <div className="pasos">{veces(3, (i) => <span key={i} className="esq esq-campo" style={{ height: 70 }} />)}</div>
        </div>
        <div className="forma">
          <Linea w="60%" />
          <Campo />
          <div className="fila2"><Campo /><Campo /></div>
          <div className="fila2"><Campo /><Campo /></div>
          <Campo alto />
          <Campo />
        </div>
      </div>
    </Marco>
  )
}
