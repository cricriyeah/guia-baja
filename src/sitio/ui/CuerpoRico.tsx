import { RichText, type JSXConverterArgs, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'

import type { Locale } from '../../dominio/idioma'
import { encabezadosDe, idDe } from '../../dominio/lexical'
import { patrocinioDeclarado } from '../../dominio/patrocinio'
import { rutas } from '../../dominio/rutas'
import type { Resolutor } from '../datos/consultas'
import type { CategoriaPublica, Imagen as ImagenT } from '../datos/tipos'
import { textos } from '../textos'
import { Patrocinado } from './Etiquetas'
import { Imagen } from './Imagen'
import { MiniEvento } from './tarjetas/MiniEvento'

type Props = {
  lang: Locale
  cuerpo: unknown
  resolutor: Resolutor
  media: Record<string, ImagenT>
  categorias: CategoriaPublica[]
  className?: string
}

// Los nodos y bloques llegan de Payload sin tipo estático (cada bloque tiene sus campos); por eso `any` en los argumentos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Args = JSXConverterArgs<any>

// Único que pinta cuerpos Lexical (lugar, evento y artículo; plan F3b, «Cuerpos Lexical»). Los ids del cuerpo se
// resuelven contra las listas del idioma: lo que no existe para el público no se pinta (un link queda como texto).
export function CuerpoRico({ lang, cuerpo, resolutor, media, categorias, className = 'texto' }: Props) {
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
      return f.url ? <a href={f.url} rel="noopener" target={f.newTab ? '_blank' : undefined}>{hijos}</a> : <>{hijos}</>
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
      // «Tours en esta zona» llega en F4.
      toursZona: () => null,
      preguntasFrecuentes: ({ node }: Args) => {
        const preguntas = (node.fields.preguntas as { pregunta: string; respuesta: string }[] | undefined) ?? []
        if (!preguntas.length) return null
        return (
          <div className="faq" aria-label={t.articulo.preguntas}>
            {preguntas.map((p, i) => (
              <details key={i}>
                <summary>{p.pregunta}</summary>
                <div className="faq__resp"><p>{p.respuesta}</p></div>
              </details>
            ))}
          </div>
        )
      },
    },
  })

  return <RichText className={className} data={cuerpo as never} converters={conversores} />
}
