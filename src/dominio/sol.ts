import { ZONA_HORARIA } from './fechas'

// Puesta del sol (algoritmo del Almanaque Náutico, como en c-portal.html) para el día de `fecha` en BCS.
export function puestaDelSol(fecha: Date, lat: number, lng: number): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(fecha)
      .map((x) => [x.type, x.value]),
  )
  const y = Number(p.year)
  const mo = Number(p.month)
  const d = Number(p.day)
  const N = Math.floor((Date.UTC(y, mo - 1, d) - Date.UTC(y, 0, 0)) / 864e5)
  const rad = Math.PI / 180
  const lngH = lng / 15
  const t = N + (18 - lngH) / 24
  const M = 0.9856 * t - 3.289
  const L = (M + 1.916 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 282.634 + 360) % 360
  let RA = (Math.atan(0.91764 * Math.tan(L * rad)) / rad + 360) % 360
  RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15
  const sinD = 0.39782 * Math.sin(L * rad)
  const cosD = Math.cos(Math.asin(sinD))
  const cosH = (Math.cos(90.833 * rad) - sinD * Math.sin(lat * rad)) / (cosD * Math.cos(lat * rad))
  const H = Math.acos(cosH) / rad / 15
  const T = H + RA - 0.06571 * t - 6.622
  const UT = (T - lngH + 48) % 24
  let ms = Date.UTC(y, mo - 1, d) + UT * 36e5
  if (UT < 12) ms += 864e5 // en BCS la puesta cae en el día UTC siguiente
  return new Date(ms).toISOString()
}
