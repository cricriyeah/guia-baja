'use client'

import { FieldDescription, FieldError, FieldLabel, useField, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useEffect, useState } from 'react'

import { MAX_TOURS_RELACIONADOS } from '../dominio/presencia'
import type { OpcionTour } from '../sitio/datos/tours-de-zona'

// Campo «Tours relacionados» de Lugares (spec de presencia §2.1): selector con los tours del catálogo de la sede de la
// zona elegida. Las claves guardadas que el catálogo ya no tiene se muestran marcadas para que el editor las quite.
type Carga =
  | { estado: 'sin-zona' }
  | { estado: 'cargando' }
  | { estado: 'listo'; sinSede: boolean; tours: OpcionTour[] }
  | { estado: 'caido' }

const idDeZona = (v: unknown): number | null => {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
  if (v && typeof v === 'object' && 'id' in v) return idDeZona((v as { id: unknown }).id)
  return null
}

export const ToursRelacionados: TextFieldClientComponent = ({ path, field }) => {
  const { value, setValue, showError, errorMessage } = useField<string[] | null>({ path })
  const zonaId = idDeZona(useFormFields(([campos]) => campos.zona?.value))
  // La respuesta se guarda con la zona que la pidió: si la zona cambió, se deriva «cargando» sin setState en el efecto.
  const [respuesta, setRespuesta] = useState<{ zonaId: number; carga: Carga } | null>(null)
  const carga: Carga =
    zonaId === null ? { estado: 'sin-zona' } : respuesta?.zonaId === zonaId ? respuesta.carga : { estado: 'cargando' }
  const guardadas = Array.isArray(value) ? value : []

  useEffect(() => {
    if (zonaId === null) return
    const control = new AbortController()
    fetch(`/api/guia/tours-de-zona?zona=${zonaId}`, { credentials: 'include', signal: control.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        const json = (await r.json()) as { sinSede: boolean; tours: OpcionTour[] }
        setRespuesta({ zonaId, carga: { estado: 'listo', sinSede: json.sinSede, tours: json.tours } })
      })
      .catch(() => {
        if (!control.signal.aborted) setRespuesta({ zonaId, carga: { estado: 'caido' } })
      })
    return () => control.abort()
  }, [zonaId])

  const quitar = (clave: string) => setValue(guardadas.filter((c) => c !== clave))
  const alternar = (clave: string) => (guardadas.includes(clave) ? quitar(clave) : setValue([...guardadas, clave]))
  const lleno = guardadas.length >= MAX_TOURS_RELACIONADOS
  const tours = carga.estado === 'listo' ? carga.tours : []
  const enCatalogo = new Set(tours.map((t) => t.clave))
  const sueltas = guardadas.filter((c) => carga.estado !== 'listo' || !enCatalogo.has(c))

  return (
    <div className="field-type tours-relacionados">
      <FieldLabel label={field.label ?? 'Tours relacionados'} path={path} />
      <FieldError path={path} showError={showError} message={errorMessage} />

      {carga.estado === 'sin-zona' && <p className="tours-relacionados__aviso">Elige primero la zona del lugar.</p>}
      {carga.estado === 'cargando' && <p className="tours-relacionados__aviso">Leyendo el catálogo…</p>}
      {carga.estado === 'caido' && (
        <p className="tours-relacionados__aviso">No se pudo leer el catálogo; los tours ya marcados se conservan.</p>
      )}
      {carga.estado === 'listo' && carga.sinSede && (
        <p className="tours-relacionados__aviso">Esta zona no tiene sede en el sitio de reservas.</p>
      )}
      {carga.estado === 'listo' && !carga.sinSede && tours.length === 0 && (
        <p className="tours-relacionados__aviso">El catálogo de esta sede no tiene tours activos.</p>
      )}

      {tours.length > 0 && (
        <ul className="tours-relacionados__lista">
          {tours.map((t) => {
            const marcado = guardadas.includes(t.clave)
            return (
              <li key={t.clave}>
                <label>
                  <input type="checkbox" checked={marcado} disabled={!marcado && lleno} onChange={() => alternar(t.clave)} />{' '}
                  {t.nombre}
                  {t.precio && <span className="tours-relacionados__precio"> · {t.precio}</span>}
                </label>
              </li>
            )
          })}
        </ul>
      )}

      {sueltas.length > 0 && (
        <ul className="tours-relacionados__lista">
          {sueltas.map((c) => (
            <li key={c}>
              <code>{c}</code>
              {carga.estado === 'listo' && <span className="tours-relacionados__vieja"> No está en el catálogo de esta zona.</span>}{' '}
              <button type="button" className="btn btn--style-secondary btn--size-small" onClick={() => quitar(c)}>Quitar</button>
            </li>
          ))}
        </ul>
      )}

      {lleno && <p className="tours-relacionados__aviso">Máximo {MAX_TOURS_RELACIONADOS} tours.</p>}
      <FieldDescription description={field.admin?.description} path={path} />
    </div>
  )
}
