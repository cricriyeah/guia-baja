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

// Contrato de datos (plan F3b): todo lo que pasa por unstable_cache es JSON puro. Fechas como ISO; nada de
// Date, Map ni Set (con la caché caliente llegaría como cadena u objeto vacío).
export type PatrocinioPublico = { activo: boolean; desde: string | null; hasta: string | null }
export type Destacado = { activo: boolean; orden: number }
export type FilaHorarioPublica = { dia: string; abre: string; cierra: string }
export type TarjetaLugar = {
  id: number; slug: string; nombre: string; resumen: string; zonaId: number; zonaSlug: string
  categoriaIds: number[]; foto: Imagen | null; rangoPrecio: string | null; horario: FilaHorarioPublica[]
  caracteristicas: string[]; coordenadas: [number, number] | null; patrocinio: PatrocinioPublico
  orden: number; destacado: Destacado; noIndexar: boolean
  // Claves del catálogo (spec de presencia §2.1). Viajan en la tarjeta para que el slot de tours las tenga en la ficha.
  toursRelacionados: string[]
}
export type FichaLugar = TarjetaLugar & {
  cuerpo: unknown; fotos: Imagen[]; direccion: string | null; telefono: string | null; whatsapp: string | null
  web: string | null; instagram: string | null; notaHorario: string | null
  metaTitulo: string | null; metaDescripcion: string | null; media: Record<string, Imagen>
}
export type TarjetaEvento = {
  id: number; slug: string; nombre: string; resumen: string; zonaId: number; zonaSlug: string
  categoriaIds: number[]; foto: Imagen | null; inicio: string; fin: string | null; gratis: boolean
  precio: string | null; lugarId: number | null; direccionLibre: string | null
  patrocinio: PatrocinioPublico; orden: number; destacado: Destacado; noIndexar: boolean
}
export type FichaEvento = TarjetaEvento & {
  cuerpo: unknown; fotos: Imagen[]; urlBoletos: string | null
  metaTitulo: string | null; metaDescripcion: string | null; media: Record<string, Imagen>
}
export type TarjetaArticulo = {
  id: number; slug: string; titulo: string; resumen: string; zonaIds: number[]; categoriaIds: number[]
  portada: Imagen | null; autorNombre: string; publicadoEl: string | null; actualizadoEl: string | null
  lugaresCitados: number[]; minutosLectura: number; destacado: Destacado; noIndexar: boolean
}
export type FichaArticulo = TarjetaArticulo & {
  cuerpo: unknown; metaTitulo: string | null; metaDescripcion: string | null; media: Record<string, Imagen>
}
export type TextoZonaCategoria = { introduccion: string }
