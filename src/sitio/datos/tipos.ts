import type { Grupo } from '../../dominio/grupos'

// Lo que reciben las páginas. Nunca documentos crudos de Payload.
export type Imagen = {
  src: string
  srcset: string
  ancho: number | null
  alto: number | null
  alt: string
  credito: string | null
  og: string | null
}

export type ZonaPublica = {
  id: number
  slug: string
  nombre: string
  descripcion: string | null
  sedeSlug: string | null
  coordenadas: [number, number] | null
  foto: Imagen | null
  orden: number
}

export type CategoriaPublica = {
  id: number
  slug: string
  nombre: string
  grupo: Grupo
  claseGrupo: string
  aplicaA: 'lugar' | 'evento' | 'ambos'
  tipoSchema: string
  orden: number
}

export type Ajustes = {
  correoPrivacidad: string | null
  formularioActivo: boolean
  versionAviso: string | null
  avisoVigenteDesde: string | null
  avisoPrivacidad: unknown
  portadaTitulo: string | null
  portadaIntro: string | null
}

export type MapaRedirecciones = Record<string, string>

export type Miga = { nombre: string; ruta: string }
