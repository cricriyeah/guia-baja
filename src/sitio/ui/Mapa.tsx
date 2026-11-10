'use client'

import 'maplibre-gl/dist/maplibre-gl.css'

import { useEffect, useRef, useState } from 'react'

import { esEnlaceSeguro } from '../../dominio/enlaces'
import type { Locale } from '../../dominio/idioma'
import { clasificarErrorMapa, type PuntoMapa } from '../../dominio/mapa'
import { textos } from '../textos'

type Respaldo = 'ninguno' | 'debajo' | 'solo'

const ESTILO = 'https://tiles.openfreemap.org/styles/liberty' // OpenFreeMap: sin llave (índice de F3)
const ESPERA_MS = 10_000

const COLOR = '#1B607F'
const SVG = 'http://www.w3.org/2000/svg'

type TextosMapa = ReturnType<typeof textos>

// Pin propio con la insignia en texto: la diferencia no depende solo del color (spec del paquete 3 §2.3).
function marcadorConTour(nombre: string, t: TextosMapa): HTMLElement {
  const el = document.createElement('div')
  el.className = 'mapa-marcador'
  // MapLibre solo les pone rol a sus marcadores por defecto.
  el.setAttribute('role', 'button')
  el.setAttribute('aria-label', t.mapa.conTourDe(nombre))
  const insignia = document.createElement('span')
  insignia.className = 'mapa-insignia mapa-insignia--flotante'
  insignia.textContent = t.mapa.insignia
  const svg = document.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', '0 0 27 41')
  svg.setAttribute('width', '27')
  svg.setAttribute('height', '41')
  const pin = document.createElementNS(SVG, 'path')
  pin.setAttribute('d', 'M13.5 0C6 0 0 6 0 13.5 0 23.6 13.5 41 13.5 41S27 23.6 27 13.5C27 6 21 0 13.5 0z')
  pin.setAttribute('fill', COLOR)
  const punto = document.createElementNS(SVG, 'circle')
  punto.setAttribute('cx', '13.5')
  punto.setAttribute('cy', '13.5')
  punto.setAttribute('r', '5.5')
  punto.setAttribute('fill', '#fff')
  svg.append(pin, punto)
  el.append(insignia, svg)
  return el
}

// Solo nodos y `href` validado: el texto viene del admin y del catálogo.
function contenidoPopup(p: PuntoMapa, t: TextosMapa): HTMLElement {
  const caja = document.createElement('div')
  const lugar = document.createElement(p.ruta ? 'a' : 'span')
  lugar.textContent = p.nombre
  if (p.ruta && lugar instanceof HTMLAnchorElement) lugar.href = p.ruta
  caja.append(lugar)
  const tours = (p.tours ?? []).filter((x) => esEnlaceSeguro(x.href))
  if (!tours.length) return caja
  const titulo = document.createElement('p')
  titulo.className = 'mapa-popup__tours'
  titulo.textContent = t.mapa.tours
  caja.append(titulo)
  for (const x of tours) {
    const a = document.createElement('a')
    a.href = x.href
    a.textContent = x.precio ? `${x.nombre}, ${t.tours.desde} ${x.precio}` : x.nombre
    a.dataset.evento = 'tour_clic'
    a.dataset.zona = x.zona
    a.dataset.origen = 'mapa'
    a.style.display = 'block'
    caja.append(a)
  }
  return caja
}

// Decisión 20: MapLibre + OpenFreeMap. La librería solo se descarga cuando el mapa entra en pantalla; antes se ve
// la dirección; mientras bajan la librería y el estilo, un esqueleto. Los popups se arman con nodos de texto, nunca con
// HTML del admin.
export function Mapa({ lang, titulo, puntos, direccion }: { lang: Locale; titulo: string; puntos: PuntoMapa[]; direccion?: string | null }) {
  const t = textos(lang)
  const caja = useRef<HTMLDivElement>(null)
  const [activo, setActivo] = useState(false)
  const [listo, setListo] = useState(false)
  const [cargado, setCargado] = useState(false)
  const [respaldo, setRespaldo] = useState<Respaldo>('ninguno')

  useEffect(() => {
    const el = caja.current
    if (!el) return
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setActivo(true)
        o.disconnect()
      }
    }, { rootMargin: '200px' })
    o.observe(el)
    return () => o.disconnect()
  }, [])

  useEffect(() => {
    if (!activo || !caja.current || !puntos.length) return
    let vivo = true
    let mapa: { remove(): void } | null = null
    let espera: number | undefined
    // Spec del paquete 3 §2.4: sin esqueleto ni lienzo, y vuelve el texto de antes de activar el mapa.
    const falloDuro = (motivo: string) => {
      if (!vivo) return
      window.clearTimeout(espera)
      console.error(`Mapa: ${motivo}`)
      mapa?.remove()
      mapa = null
      setListo(true)
      setRespaldo('solo')
    }
    import('maplibre-gl').then((m) => {
      if (!vivo || !caja.current) return
      setListo(false)
      setCargado(false)
      setRespaldo('ninguno')
      // getVersion() viene en la librería: la ruta siempre coincide con el paquete cargado.
      m.setWorkerUrl(`/guia-assets/maplibre/${m.getVersion()}/maplibre-gl-worker.mjs`)
      let nuevo: InstanceType<typeof m.Map>
      try {
        nuevo = new m.Map({ container: caja.current, style: ESTILO, center: [puntos[0].lng, puntos[0].lat], zoom: 13, attributionControl: { compact: true } })
      } catch {
        falloDuro('no se pudo crear')
        return
      }
      // Sin WebGL, la 6.4.1 no lanza: dispara `error` dentro del constructor y deja `painter` sin crear, y remove() fallaría.
      if (!nuevo.painter) {
        falloDuro('sin WebGL')
        return
      }
      mapa = nuevo
      let estiloCargado = false
      nuevo.once('style.load', () => { estiloCargado = true })
      nuevo.on('error', (e) => {
        if (clasificarErrorMapa(e as { sourceId?: unknown; tile?: unknown }, estiloCargado) === 'duro') falloDuro('no se pudo cargar el estilo')
        else console.warn('Mapa: un recurso no cargó')
      })
      // A los 10 s no se sabe si el worker está roto o la red es lenta: el mapa se queda y el texto va debajo.
      espera = window.setTimeout(() => {
        console.warn('mapa sin cargar a los 10 s')
        setListo(true)
        setRespaldo('debajo')
      }, ESPERA_MS)
      nuevo.once('load', () => {
        window.clearTimeout(espera)
        setListo(true)
        setCargado(true)
        setRespaldo('ninguno')
      })
      nuevo.addControl(new m.NavigationControl({ showCompass: false }))
      for (const p of puntos) {
        const conTours = (p.tours?.length ?? 0) > 0
        const marcador = conTours ? new m.Marker({ element: marcadorConTour(p.nombre, t), anchor: 'bottom' }) : new m.Marker({ color: COLOR })
        // Con tours el popup sube más: el pin mide 41 px y la insignia va encima.
        marcador.setLngLat([p.lng, p.lat]).setPopup(new m.Popup({ offset: conTours ? 60 : 24 }).setDOMContent(contenidoPopup(p, t))).addTo(nuevo)
      }
      if (puntos.length > 1) {
        const limites = new m.LngLatBounds()
        puntos.forEach((p) => limites.extend([p.lng, p.lat]))
        nuevo.fitBounds(limites, { padding: 48, maxZoom: 14 })
      }
    }).catch(() => falloDuro('no se pudo descargar la librería'))
    return () => {
      vivo = false
      window.clearTimeout(espera)
      mapa?.remove()
    }
  }, [activo, lang, puntos, t])

  const texto = direccion ?? t.ficha.verMapa
  return (
    <div className="mapa" role="region" aria-label={titulo} data-mapa-listo={cargado ? '1' : undefined}>
      <div ref={caja} className="mapa__caja" hidden={respaldo === 'solo'}>
        {!activo && <p className="meta" style={{ padding: 16 }}>{texto}</p>}
      </div>
      {respaldo !== 'ninguno' && <p className="meta mapa__respaldo">{texto}</p>}
      {activo && puntos.length > 0 && <div className={`mapa__carga esq${listo ? ' lista' : ''}`} aria-hidden="true" />}
      {puntos.some((p) => p.tours?.length) && (
        <p className="meta mapa-leyenda"><span className="mapa-insignia" aria-hidden="true">{t.mapa.insignia}</span> {t.mapa.conTour}</p>
      )}
    </div>
  )
}
