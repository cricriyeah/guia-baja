import type { CandidatoMencion } from '../../dominio/menciones'
import { patrocinioDeclarado } from '../../dominio/patrocinio'
import type { TarjetaLugar } from './tipos'

// Todos los lugares del idioma: un no enlazable que comparte nombre sigue haciendo ambiguo ese nombre.
export function candidatosMencion(lugares: TarjetaLugar[]): CandidatoMencion[] {
  return lugares.map((l) => ({
    id: l.id,
    nombres: [l.nombre, ...l.otrosNombres],
    enlazable: l.enlazarMenciones && !patrocinioDeclarado(l.patrocinio),
  }))
}
