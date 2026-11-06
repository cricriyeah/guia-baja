import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const RAIZ = 'src'
const fuentes = (readdirSync(RAIZ, { recursive: true, encoding: 'utf8' }) as string[])
  .filter((f) => /\.tsx?$/.test(f) && !f.startsWith('migrations'))
  .map((f) => join(RAIZ, f))

const importaciones = fuentes.flatMap((f) =>
  [...readFileSync(f, 'utf8').matchAll(/^import '[^']*\/(estilos\/[^']+\.css)'/gm)].map((m) => ({ archivo: f.replaceAll('\\', '/'), css: m[1] })),
)

describe('CSS bloqueante de la guía (spec §11: LCP < 2.5 s)', () => {
  it('guia.css se importa una sola vez, en el layout de idioma', () => {
    expect(importaciones.filter((i) => i.css === 'estilos/guia.css').map((i) => i.archivo)).toEqual(['src/app/(sitio)/[lang]/layout.tsx'])
  })

  it('el CSS de cada página entra por guia.css: un import suelto vuelve a sumar una petición antes de pintar', () => {
    const permitidos = new Set(['estilos/guia.css', 'estilos/busqueda.css'])
    expect(importaciones.filter((i) => !permitidos.has(i.css))).toEqual([])
  })
})
