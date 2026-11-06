import { Linea, Marco, Migas, Parrafo, Pastilla, veces } from './Primitivas'

export function EsqueletoEvento() {
  return (
    <Marco clase="pagina-evento">
      <Migas />
      <div className="evento-cabeza">
        <div className="evento-foto esq" />
        <div className="boleto">
          <Pastilla />
          <Linea clase="t-seccion" w="85%" />
          <div className="boleto__fecha">
            <span className="boleto__dia esq" />
            <div><Linea w="70%" /><Linea w="40%" /></div>
          </div>
          <Linea w="45%" />
          <div className="boleto__precio"><Linea w={72} /><Linea w={64} /></div>
          <div className="boleto__acciones">{veces(2, (i) => <span key={i} className="boton esq" />)}</div>
        </div>
      </div>
      <div className="cuerpo">
        <div>
          <div className="bloque">
            <Linea clase="t-seccion" w="min(60vw, 320px)" />
            <Parrafo lineas={5} clase="texto" />
          </div>
          <div className="bloque">
            <Linea clase="t-seccion" w="min(40vw, 200px)" />
            <div className="mapa esq" />
          </div>
        </div>
        <div className="lateral">
          {veces(2, (i) => (
            <div key={i} className="lugar-ref" style={{ marginBottom: 8 }}>
              <div className="media esq" />
              <div><Pastilla /><Linea w="80%" clase="titular" /></div>
            </div>
          ))}
        </div>
      </div>
    </Marco>
  )
}
