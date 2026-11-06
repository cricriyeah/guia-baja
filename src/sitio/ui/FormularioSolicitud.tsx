'use client'

import Link from 'next/link'
import Script from 'next/script'
import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from 'react'

import { enviarFormulario, type EstadoFormulario } from '../../formulario/accion'
import { CAMPOS_FORMULARIO, mensajeDeError } from '../../formulario/mensajes'
import type { Locale } from '../../dominio/idioma'
import { rutas } from '../../dominio/rutas'
import { track } from '../analitica/track'
import { textos } from '../textos'

const INICIAL: EstadoFormulario = { estado: 'inicial' }
type Turnstile = { render(el: HTMLElement, o: object): string; reset(id?: string): void; remove(id?: string): void }
const turnstile = () => (window as unknown as { turnstile?: Turnstile }).turnstile

type Zona = { id: number; nombre: string; slug: string }

// Sin siteKey (local, CI) el formulario se pinta sin el widget y el servidor responde «verificacion», como siempre.
export function FormularioSolicitud(props: { lang: Locale; zonas: Zona[]; siteKey: string; version: string | null }) {
  const { lang, zonas, siteKey, version } = props
  const t = textos(lang).formulario
  const [s, enviar, enviando] = useActionState(enviarFormulario, INICIAL)
  const [zona, setZona] = useState('')
  const caja = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const alerta = useRef<HTMLParagraphElement>(null)
  const listo = useRef<HTMLDivElement>(null)
  // La zona de este envío, leída al enviar: así el efecto de abajo solo depende de la respuesta del servidor.
  const zonaEnviada = useRef('otra')

  // Render explícito: con navegación de cliente el script ya cargado no vuelve a pintar el widget solo.
  const pintar = useCallback(() => {
    const api = turnstile()
    if (!siteKey || !caja.current || !api || widget.current !== null) return
    widget.current = api.render(caja.current, { sitekey: siteKey, language: lang })
  }, [siteKey, lang])
  useEffect(() => {
    pintar()
    return () => {
      if (widget.current !== null) turnstile()?.remove(widget.current)
      widget.current = null
    }
  }, [pintar])

  useEffect(() => {
    if (s.estado === 'ok') {
      track('solicitud_enviada', { zona: zonaEnviada.current })
      listo.current?.focus()
    } else if (s.estado === 'error') {
      // El token de Turnstile se consume en cada envío: tras un error hay que pedir otro.
      if (widget.current !== null) turnstile()?.reset(widget.current)
      // El foco va al primer campo con error, en el orden de la página; sin campo, al aviso general.
      const campo = CAMPOS_FORMULARIO.find((c) => s.errores?.[c] && document.getElementById(c))
      ;(campo ? document.getElementById(campo) : alerta.current)?.focus()
    }
  }, [s])

  // Correo y teléfono comparten el error «contacto»: un solo mensaje, no dos iguales.
  const contacto = s.errores?.correo === 'contacto' && s.errores?.telefono === 'contacto'
  const esContacto = (campo: string) => contacto && (campo === 'correo' || campo === 'telefono')
  const mensaje = (campo: string) => {
    const codigo = s.errores?.[campo]
    if (!codigo || esContacto(campo)) return null
    return (
      <span id={`${campo}-error`} className="msg">
        <span aria-hidden="true">⚠</span> {mensajeDeError(lang, campo, codigo)}
      </span>
    )
  }
  // aria-invalid y aria-describedby de cada campo; `ayuda` es el texto fijo que ya lo describe.
  const marcas = (campo: string, ayuda?: string) => {
    const conError = Boolean(s.errores?.[campo])
    const propio = conError ? (esContacto(campo) ? 'contacto-error' : `${campo}-error`) : undefined
    return { 'aria-invalid': conError || undefined, 'aria-describedby': [ayuda, propio].filter(Boolean).join(' ') || undefined }
  }

  if (s.estado === 'ok') {
    return (
      <div ref={listo} className="listo forma" role="status" tabIndex={-1}>
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <circle cx="36" cy="36" r="34" fill="#E7F5D3" />
          <path d="M22 37l9 9 19-20" fill="none" stroke="#2F5D0A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2>{t.listo}</h2>
        <p>{t.listoTexto}</p>
        <Link className="boton boton--secundario presionable" href={rutas.portada(lang)}>{t.volver}</Link>
      </div>
    )
  }
  return (
    // onSubmit + startTransition y no action={…}: con action, React 19 reinicia los campos tras cada envío y el
    // visitante perdería lo escrito al corregir un error.
    <form
      className="forma"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        zonaEnviada.current = zonas.find((z) => String(z.id) === fd.get('zona'))?.slug ?? 'otra'
        startTransition(() => enviar(fd))
      }}
    >
      {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={pintar} />}
      <h2>{t.cuentanos}</h2>
      <div className="campo">
        <label htmlFor="negocio">{t.negocio}</label>
        <input id="negocio" name="negocio" autoComplete="organization" required maxLength={120} {...marcas('negocio')} />
        {mensaje('negocio')}
      </div>
      <div className="fila2">
        <div className="campo">
          <label htmlFor="giro">{t.giro} <span className="ayuda">{t.opcional}</span></label>
          <input id="giro" name="giro" maxLength={80} placeholder={t.ejemplos.giro} {...marcas('giro')} />
          {mensaje('giro')}
        </div>
        <div className="campo">
          <label htmlFor="zona">{t.zona}</label>
          <select id="zona" name="zona" value={zona} onChange={(e) => setZona(e.target.value)} {...marcas('zona')}>
            <option value="">{t.eligeZona}</option>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            <option value="otra">{t.otraZona}</option>
          </select>
          {mensaje('zona')}
        </div>
      </div>
      {zona === 'otra' && (
        <div className="campo">
          <label htmlFor="zonaTexto">{t.dondeEsta}</label>
          <input id="zonaTexto" name="zonaTexto" maxLength={80} placeholder={t.ejemplos.zonaTexto} {...marcas('zonaTexto')} />
          {mensaje('zonaTexto')}
        </div>
      )}
      <div className="campo">
        <label htmlFor="contactoNombre">{t.tuNombre} <span className="ayuda">{t.opcional}</span></label>
        <input id="contactoNombre" name="contactoNombre" autoComplete="name" maxLength={80} {...marcas('contactoNombre')} />
        {mensaje('contactoNombre')}
      </div>
      <div className="fila2">
        <div className="campo">
          <label htmlFor="correo">{t.correo}</label>
          <input id="correo" name="correo" type="email" autoComplete="email" inputMode="email" maxLength={160} {...marcas('correo', 'ayuda-contacto')} />
          {mensaje('correo')}
        </div>
        <div className="campo">
          <label htmlFor="telefono">{t.telefono}</label>
          <input id="telefono" name="telefono" type="tel" autoComplete="tel" inputMode="tel" maxLength={30} {...marcas('telefono', 'ayuda-contacto')} />
          {mensaje('telefono')}
        </div>
      </div>
      <p className="ayuda" id="ayuda-contacto">{t.unoBasta}</p>
      {contacto && (
        <p id="contacto-error" className="msg">
          <span aria-hidden="true">⚠</span> {mensajeDeError(lang, 'correo', 'contacto')}
        </p>
      )}
      <div className="campo">
        <label htmlFor="webOInstagram">{t.web} <span className="ayuda">{t.opcional}</span></label>
        <input id="webOInstagram" name="webOInstagram" maxLength={160} placeholder={t.ejemplos.web} {...marcas('webOInstagram')} />
        {mensaje('webOInstagram')}
      </div>
      <div className="campo">
        <label htmlFor="mensaje">{t.mensaje} <span className="ayuda">{t.opcional}</span></label>
        <textarea id="mensaje" name="mensaje" maxLength={2000} placeholder={t.ejemplos.mensaje} {...marcas('mensaje')} />
        {mensaje('mensaje')}
      </div>
      <div className="campo">
        <label className="casilla">
          <input id="aceptoPrivacidad" type="checkbox" name="aceptoPrivacidad" {...marcas('aceptoPrivacidad')} />
          <span>{t.acepto} <Link href={rutas.privacidad(lang)}>{t.aviso}</Link>{version ? ` (${t.version(version)})` : ''}.</span>
        </label>
        {mensaje('aceptoPrivacidad')}
      </div>
      {siteKey && <div ref={caja} className="cf-turnstile" />}
      {s.estado === 'error' && s.motivo && s.motivo !== 'invalido' && (
        <p ref={alerta} tabIndex={-1} className="estado-error" role="alert">
          {(t.motivos as Record<string, string>)[s.motivo] ?? t.motivos.error}
        </p>
      )}
      <button className="boton presionable enviar" type="submit" disabled={enviando}>{enviando ? t.enviando : t.enviar}</button>
    </form>
  )
}
