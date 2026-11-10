import { RichText, type JSXConverterArgs, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'

import { esEnlaceSeguro, ESQUEMAS_SEGUROS } from '../../dominio/enlaces'
import type { Locale } from '../../dominio/idioma'
import { encabezadosDe, idDe } from '../../dominio/lexical'
import { patrocinioDeclarado } from '../../dominio/patrocinio'
import { rutas } from '../../dominio/rutas'
import type { Resolutor } from '../datos/consultas'
import type { CategoriaPublica, Imagen as ImagenT } from '../datos/tipos'
import { textos } from '../textos'
import { BloqueTour } from './BloqueTour'
import { Patrocinado } from './Etiquetas'
import { Imagen } from './Imagen'
import { PreguntasFrecuentes } from './PreguntasFrecuentes'
import { MiniEvento } from './tarjetas/MiniEvento'
import { BloqueTours, type Origen } from './ToursEnZona'

type Props = {
  lang: Locale
  cuerpo: unknown
  resolutor: Resolutor
  media: Record<string, ImagenT>
  categorias: CategoriaPublica[]
  className?: string
  // Con patrocinio declarado del lugar o evento dueño del cuerpo, sus links externos llevan rel="sponsored" (spec §6/§7).
  patrocinado?: boolean
  // Atribución de los links del bloque de tours (spec §13). Sin ella, el bloque no se pinta.
  piezaTours?: string
  // Origen de tour_clic del bloque «Tour».
  origenTours?: Origen
}

// Los nodos y bloques llegan de Payload sin tipo estático (cada bloque tiene sus campos); por eso `any` en los argumentos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Args = JSXConverterArgs<any>

// Único que pinta cuerpos Lexical (lugar, evento y artículo; plan F3b, «Cuerpos Lexical»). Los ids del cuerpo se
// resuelven contra las listas del idioma: lo que no existe para el público no se pinta (un link queda como texto).
export function CuerpoRico({ lang, cuerpo, resolutor, media, categorias, className = 'texto', patrocinado = false, piezaTours, origenTours = 'articulo' }: Props) {
  if (!cuerpo || typeof cuerpo !== 'object') return null
  const ids = encabezadosDe(cuerpo).map((e) => e.id)
  let h2 = 0
  const categoria = (catIds: number[]) => categorias.find((c) => c.id === catIds[0])
  const t = textos(lang)

  const conversores: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    heading: ({ node, nodesToJSX }: Args) => {
      const hijos = nodesToJSX({ nodes: node.children })
      const Tag = node.tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      return Tag === 'h2' ? <h2 id={ids[h2++]}>{hijos}</h2> : <Tag>{hijos}</Tag>
    },
    link: ({ node, nodesToJSX }: Args) => {
      const hijos = nodesToJSX({ nodes: node.children })
      const f = node.fields as { linkType?: string; doc?: { relationTo?: string; value?: unknown }; url?: string; newTab?: boolean }
      if (f.linkType === 'internal') {
        const id = idDe(f.doc?.value)
        const href = f.doc?.relationTo && id !== null ? resolutor.href(f.doc.relationTo, id) : null
        return href ? <Link href={href}>{hijos}</Link> : <>{hijos}</>
      }
      // validateUrl de Payload acepta `javascript:`: solo estos esquemas y rutas propias se pintan como link; el resto queda como texto.
      if (!f.url || !esEnlaceSeguro(f.url)) return <>{hijos}</>
      // sponsored solo tiene sentido hacia afuera: una ruta propia o un ancla no es un link patrocinado.
      const rel = patrocinado && ESQUEMAS_SEGUROS.test(f.url) ? 'noopener sponsored' : 'noopener'
      return <a href={f.url} rel={rel} target={f.newTab ? '_blank' : undefined}>{hijos}</a>
    },
    upload: ({ node }: Args) => {
      const img = media[String(idDe(node.value))]
      if (!img) return null
      return (
        <figure className="figura">
          <Imagen imagen={img} sizes="(min-width: 900px) 720px, 100vw" />
          {img.credito && <figcaption className="meta">{img.credito}</figcaption>}
        </figure>
      )
    },
    relationship: () => null,
    unknown: () => null,
    blocks: {
      tarjetaLugar: ({ node }: Args) => {
        const l = resolutor.lugar(idDe(node.fields.lugar) ?? -1)
        if (!l) return null
        const declarado = patrocinioDeclarado(l.patrocinio)
        const cat = categoria(l.categoriaIds)
        return (
          <Link className={`b-lugar tarjeta presionable ${cat?.claseGrupo ?? ''}`} href={rutas.lugar(lang, l.slug)} rel={declarado ? 'sponsored' : undefined}>
            <div className="media"><Imagen imagen={l.foto} sizes="160px" alt="" /></div>
            <div>
              {declarado && <><Patrocinado lang={lang} /> </>}
              {cat && <span className="etiqueta">{cat.nombre}</span>}
              <p className="titular">{l.nombre}</p>
              <p>{l.resumen}</p>
            </div>
          </Link>
        )
      },
      tarjetaEvento: ({ node }: Args) => {
        const e = resolutor.evento(idDe(node.fields.evento) ?? -1)
        if (!e) return null
        return <MiniEvento lang={lang} evento={e} categoria={categoria(e.categoriaIds)} lugarNombre={e.lugarId ? resolutor.lugar(e.lugarId)?.nombre : null} clase="b-evento tarjeta" />
      },
      // Solo el artículo pasa piezaTours: el evento no lleva tours (`tour_clic` no tiene ese origen).
      toursZona: ({ node }: Args) => {
        const zonaId = idDe(node.fields.zona)
        return piezaTours && typeof zonaId === 'number' ? <BloqueTours lang={lang} zonaId={zonaId} pieza={piezaTours} /> : null
      },
      tour: ({ node }: Args) => {
        const zonaId = idDe(node.fields.zona)
        const clave = node.fields.tour
        return piezaTours && typeof zonaId === 'number' && typeof clave === 'string'
          ? <BloqueTour lang={lang} zonaId={zonaId} clave={clave} pieza={`tour-${piezaTours}`} origen={origenTours} />
          : null
      },
      preguntasFrecuentes: ({ node }: Args) => (
        <PreguntasFrecuentes preguntas={(node.fields.preguntas as { pregunta: string; respuesta: string }[] | undefined) ?? []} etiqueta={t.articulo.preguntas} />
      ),
    },
  })

  return <RichText className={className} data={cuerpo as never} converters={conversores} />
}
