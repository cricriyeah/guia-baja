'use client'

import 'maplibre-gl/dist/maplibre-gl.css'

import { useEffect, useRef, useState } from 'react'

import type { Locale } from '../../dominio/idioma'
import { textos } from '../textos'

type Punto = { lng: number; lat: number; nombre: string; ruta?: string }
const ESTILO = 'https://tiles.openfreemap.org/styles/liberty' // OpenFreeMap: sin llave (índice de F3)

// Decisión 20: MapLibre + OpenFreeMap. La librería solo se descarga cuando el mapa entra en pantalla; antes se ve
// la dirección; mientras bajan la librería y el estilo, un esqueleto. Los popups se arman con nodos de texto, nunca con
// HTML del admin.
export function Mapa({ lang, titulo, puntos, direccion }: { lang: Locale; titulo: string; puntos: Punto[]; direccion?: string | null }) {
  const caja = useRef<HTMLDivElement>(null)
  const [activo, setActivo] = useState(false)
  const [listo, setListo] = useState(false)

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
    import('maplibre-gl').then(({ default: maplibregl }) => {
      // Si el .d.ts de la versión instalada no exporta `default`, usa los exports con nombre (m.Map, m.Marker…).
      if (!vivo || !caja.current) return
      const m = new maplibregl.Map({ container: caja.current, style: ESTILO, center: [puntos[0].lng, puntos[0].lat], zoom: 13, attributionControl: { compact: true } })
      mapa = m
      // También con error: sin red para el estilo, el esqueleto no se queda brillando para siempre.
      m.once('load', () => setListo(true))
      m.once('error', () => setListo(true))
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }))
      for (const p of puntos) {
        const contenido = document.createElement(p.ruta ? 'a' : 'span')
        contenido.textContent = p.nombre
        if (p.ruta && contenido instanceof HTMLAnchorElement) contenido.href = p.ruta
        new maplibregl.Marker({ color: '#1B607F' }).setLngLat([p.lng, p.lat]).setPopup(new maplibregl.Popup({ offset: 24 }).setDOMContent(contenido)).addTo(m)
      }
      if (puntos.length > 1) {
        const limites = new maplibregl.LngLatBounds()
        puntos.forEach((p) => limites.extend([p.lng, p.lat]))
        m.fitBounds(limites, { padding: 48, maxZoom: 14 })
      }
    }).catch(() => setListo(true))
    return () => {
      vivo = false
      mapa?.remove()
    }
  }, [activo, puntos])

  return (
    <div className="mapa" role="region" aria-label={titulo}>
      <div ref={caja} style={{ width: '100%', height: '100%', minHeight: 280 }}>
        {!activo && <p className="meta" style={{ padding: 16 }}>{direccion ?? textos(lang).ficha.verMapa}</p>}
      </div>
      {activo && puntos.length > 0 && <div className={`mapa__carga esq${listo ? ' lista' : ''}`} aria-hidden="true" />}
    </div>
  )
}
