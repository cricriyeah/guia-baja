// Copia el worker de MapLibre a public/ (spec del paquete 3 §2.4). Turbopack no lo emite. La ruta lleva la versión para
// que el CDN nunca junte un worker viejo con un paquete principal nuevo. Lo llaman prebuild, predev y build-vercel.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// El worker importa el segundo archivo: sin él al lado no arranca y el error es asíncrono.
const ARCHIVOS = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']

export function copiarWorker(raiz = process.cwd()) {
  const paquete = path.join(raiz, 'node_modules/maplibre-gl')
  const { version } = JSON.parse(readFileSync(path.join(paquete, 'package.json'), 'utf8'))
  const destino = path.join(raiz, 'public/guia-assets/maplibre', version)
  mkdirSync(destino, { recursive: true })
  for (const archivo of ARCHIVOS) {
    const origen = path.join(paquete, 'dist', archivo)
    if (!existsSync(origen)) throw new Error(`Falta ${origen}`)
    copyFileSync(origen, path.join(destino, archivo))
  }
  return destino
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(`Worker de MapLibre en ${copiarWorker()}`)
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  }
}
