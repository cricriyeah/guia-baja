const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const escapar = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const DOS_HORAS = 2 * 60 * 60 * 1000

// «Agregar al calendario» (decisiones, notas de F1): se arma en el navegador. Sin fin, dura dos horas.
export function icsDeEvento(e: { uid: string; nombre: string; inicio: string; fin: string | null; lugar: string; url: string }): string {
  const fin = e.fin ?? new Date(new Date(e.inicio).getTime() + DOS_HORAS).toISOString()
  return [
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
    '',
  ].join('\r\n')
}
