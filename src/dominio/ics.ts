const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const escapar = (s: string) => s.replace(/\r\n?/g, '\n').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const DOS_HORAS = 2 * 60 * 60 * 1000
const MAX_OCTETOS = 75
const codificador = new TextEncoder()

// RFC 5545 §3.1: ninguna línea pasa de 75 octetos (sin el CRLF); la continuación empieza con un espacio, que cuenta.
// Se cuenta en bytes UTF-8 y se corta por punto de código: un carácter multibyte nunca queda partido.
export function plegar(linea: string): string {
  const partes: string[] = []
  let actual = ''
  let bytes = 0
  for (const c of linea) {
    const n = codificador.encode(c).length
    const limite = partes.length === 0 ? MAX_OCTETOS : MAX_OCTETOS - 1
    if (bytes + n > limite) {
      partes.push(actual)
      actual = ''
      bytes = 0
    }
    actual += c
    bytes += n
  }
  partes.push(actual)
  return partes.join('\r\n ')
}

// «Agregar al calendario» (decisiones, notas de F1): se arma en el navegador. Sin fin, dura dos horas.
export function icsDeEvento(e: { uid: string; nombre: string; inicio: string; fin: string | null; lugar: string; url: string }): string {
  const fin = e.fin ?? new Date(new Date(e.inicio).getTime() + DOS_HORAS).toISOString()
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sun Baja//Guia de la Baja//ES',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${utc(new Date().toISOString())}`,
    `DTSTART:${utc(e.inicio)}`,
    `DTEND:${utc(fin)}`,
    `SUMMARY:${escapar(e.nombre)}`,
    `LOCATION:${escapar(e.lugar)}`,
    `URL:${e.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${lineas.map(plegar).join('\r\n')}\r\n`
}
