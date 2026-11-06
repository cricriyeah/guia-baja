import { Linea, Marco, Migas, Parrafo, veces } from './Primitivas'

export function EsqueletoPrivacidad() {
  return (
    <Marco clase="pagina-privacidad">
      <Migas />
      <div className="aviso-cabeza">
        <Linea clase="t-pagina" w="min(80vw, 560px)" />
        <div className="version">{[110, 190].map((w) => <span key={w} className="esq esq--pastilla" style={{ width: w, height: 30 }} />)}</div>
      </div>
      <div className="cuerpo-aviso">
        <div className="indice">{veces(5, (i) => <Linea key={i} w={i % 2 ? '60%' : '85%'} />)}</div>
        <div className="legal">{veces(4, (i) => <Parrafo key={i} lineas={4} />)}</div>
      </div>
    </Marco>
  )
}
