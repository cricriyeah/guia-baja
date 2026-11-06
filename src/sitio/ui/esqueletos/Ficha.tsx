import { Linea, Marco, Migas, Parrafo, Pastilla, veces } from './Primitivas'

export function EsqueletoFicha() {
  return (
    <Marco clase="pagina-ficha">
      <Migas />
      <div className="galeria-envoltura">
        <div className="galeria">{veces(5, (i) => <div key={i} className="esq" />)}</div>
      </div>
      <div className="cabeza">
        <div className="cabeza__chips"><Pastilla /> <Pastilla /></div>
        <Linea clase="t-pagina" w="min(80vw, 640px)" />
        <Parrafo lineas={2} clase="cabeza__resumen" />
        <div className="datos">{[88, 120, 72].map((w) => <span key={w} className="esq esq--texto" style={{ width: w }} />)}</div>
        <div className="acciones">
          <span className="accion esq" style={{ width: 132 }} />
          <span className="accion esq" style={{ width: 112 }} />
        </div>
      </div>
      <div className="cuerpo">
        <div>
          <div className="bloque">
            <Linea clase="t-seccion" w="min(60vw, 320px)" />
            <Parrafo lineas={5} clase="texto" />
          </div>
          <div className="bloque">
            <Linea clase="t-seccion" w="min(50vw, 240px)" />
            <div className="mapa esq" />
          </div>
        </div>
        <div className="lateral">
          <div className="ficha-datos">{veces(4, (i) => <div key={i} className="ficha-datos__fila"><Linea w={i % 2 ? '50%' : '75%'} /></div>)}</div>
        </div>
      </div>
    </Marco>
  )
}
