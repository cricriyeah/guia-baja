// Controles de la etapa 1 del paquete 4. Se aplican SOLO en la copia del CI, nunca en el código del sitio.
// Las reglas CSS se agregan al final, así los controles no se pisan entre sí. Cada commit de la etapa 2 quita su control.
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const CSS = 'src/sitio/estilos/base.css'
const agregar = (selector, regla) => ({ archivo: CSS, debeContener: selector, agregar: `\n${selector} { ${regla} }\n` })

export const CONTROLES = {
  a: [{
    archivo: 'src/sitio/ui/Efectos.tsx',
    debeContener: "if (e.type === 'load') aparecer(e.target)",
    reemplazar: ["if (e.type === 'load') aparecer(e.target)", ''],
  }],
  b: [agregar('#contenido', 'animation: none !important;')],
  // Apaga .js .entra y no la clase js: quitar js también apagaría el brillo de la imagen LCP (plan del paquete 4).
  c: [agregar('.js .entra', 'opacity: 1 !important; transform: none !important; transition: none !important;')],
  d: [agregar('.resultados-entran > *', 'animation: none !important;')],
}

export function aplicarControles(letras, leer, escribir) {
  for (const letra of letras) {
    const control = CONTROLES[letra]
    if (!control) throw new Error(`Control desconocido: ${letra}`)
    for (const c of control) {
      const texto = leer(c.archivo)
      if (!texto.includes(c.debeContener)) throw new Error(`Control ${letra}: no encontró «${c.debeContener}» en ${c.archivo}`)
      escribir(c.archivo, c.reemplazar ? texto.replace(c.reemplazar[0], c.reemplazar[1]) : texto + c.agregar)
    }
  }
}

// Uso: node scripts/medir/controles.mjs a,b. «base» y «base2» no aplican nada; «abcd» aplica los que sigan definidos.
export function letrasDe(nombre) {
  if (nombre === 'base' || nombre === 'base2') return []
  if (nombre === 'abcd') return Object.keys(CONTROLES)
  return nombre.split(',')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  aplicarControles(letrasDe(process.argv[2] ?? 'base'), (r) => readFileSync(r, 'utf8'), (r, t) => writeFileSync(r, t))
}
