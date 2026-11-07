import { describe, expect, it } from 'vitest'

import type { TarjetaLugar } from '../../src/sitio/datos/tipos'

// Plan F3b, «Presupuesto de las listas por idioma»: una entrada de unstable_cache admite 2 MB.
describe('presupuesto de las listas cacheadas', () => {
  // Medido: 1000 tarjetas ≈ 1.9 MB. A este volumen («cientos») 600 caben con margen; antes de ~800 lugares por
  // idioma se activa el plan B (listas por idioma y zona).
  it('600 tarjetas típicas de lugar pesan menos de 1.5 MB serializadas', () => {
    const url = 'https://img-guia.salysoltours.com/media/una-foto-con-nombre-largo-de-ejemplo'
    const tarjeta: TarjetaLugar = {
      id: 1234, slug: 'mariscos-la-bahia-del-malecon', nombre: 'Mariscos La Bahía del Malecón', resumen: 'x'.repeat(160),
      zonaId: 12, zonaSlug: 'la-paz', categoriaIds: [3, 7],
      foto: { src: `${url}-960.webp`, srcset: `${url}-480.webp 480w, ${url}-960.webp 960w, ${url}-1600.webp 1600w`, ancho: 4000, alto: 3000, alt: 'y'.repeat(80), credito: 'Equipo de la Guía', og: `${url}-og.jpg` },
      rangoPrecio: '$$', horario: Array.from({ length: 9 }, () => ({ dia: 'miercoles', abre: '12:00', cierra: '23:00' })),
      caracteristicas: ['para-ninos', 'con-comida'], coordenadas: [-110.312345, 24.142678],
      patrocinio: { activo: true, desde: '2026-11-01T12:00:00.000Z', hasta: '2026-12-01T12:00:00.000Z' },
      orden: 100, destacado: { activo: false, orden: 100 }, noIndexar: false, toursRelacionados: [],
    }
    // unstable_cache vuelve a serializar la cadena JSON (comillas escapadas): se mide igual.
    const bytes = Buffer.byteLength(JSON.stringify(JSON.stringify(Array.from({ length: 600 }, () => tarjeta))))
    expect(bytes).toBeLessThan(1.5 * 1024 * 1024)
  })
})
