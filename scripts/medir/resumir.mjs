// Funciones puras sobre un LHR de Lighthouse 12.6.1 y su traza (--save-assets). Sin imports de src/.
const MAX_LINEA = 3800
const MAX_SELECTOR = 80

export function mediana(valores) {
  const v = [...valores].sort((a, b) => a - b)
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

const FASES = { TTFB: 'ttfb', 'Load Delay': 'loadDelay', 'Load Time': 'loadTime', 'Render Delay': 'renderDelay' }

// La segunda tabla de largest-contentful-paint-element es la de fases simuladas (LCPBreakdown sobre Lantern).
function fasesDe(auditoria) {
  const tabla = auditoria?.details?.items?.[1]?.items ?? []
  const fases = {}
  for (const fila of tabla) {
    const clave = FASES[fila.phase]
    if (clave) fases[clave] = Math.round(fila.timing)
  }
  return fases
}

// Los tres relojes a ms desde navigationStart: la traza usa µs absolutos; network-requests, ms desde el primer
// arranque de red (debugData.networkStartTimeTs, en µs); el LCP observado ya viene relativo.
function evaluaciones(traza, inicioTs) {
  const primero = new Map()
  for (const ev of traza.traceEvents) {
    if (ev.name !== 'EvaluateScript') continue
    const url = ev.args?.data?.url
    if (url && !primero.has(url)) primero.set(url, (ev.ts - inicioTs) / 1000)
  }
  return primero
}

export function resumirCorrida(lhr, traza, manifiesto) {
  const m = lhr.audits.metrics.details.items[0]
  const red = lhr.audits['network-requests']
  const inicioTs = m.observedNavigationStartTs
  const desfaseRedMs = ((red.details.debugData?.networkStartTimeTs ?? inicioTs) - inicioTs) / 1000
  const evals = evaluaciones(traza, inicioTs)
  const lcpObs = m.observedLargestContentfulPaint
  const scripts = red.details.items.filter((r) => r.resourceType === 'Script')
  const fuentes = red.details.items.filter((r) => r.resourceType === 'Font')
  const antes = scripts.filter((s) => s.networkEndTime + desfaseRedMs < lcpObs && (evals.get(s.url) ?? Infinity) < lcpObs)
  const kib = (lista) => Math.round(lista.reduce((t, r) => t + (r.transferSize ?? 0), 0) / 1024)
  const esFramework = (s) => (manifiesto.rootMainFiles ?? []).some((f) => s.url.endsWith(f))
  const lcpEl = lhr.audits['largest-contentful-paint-element']
  return {
    lcp: Math.round(m.largestContentfulPaint),
    fcp: Math.round(m.firstContentfulPaint),
    tbt: Math.round(m.totalBlockingTime),
    cls: Number((m.cumulativeLayoutShift ?? 0).toFixed(3)),
    lcpObservado: Math.round(lcpObs),
    fcpObservado: Math.round(m.observedFirstContentfulPaint),
    selector: String(lcpEl?.details?.items?.[0]?.items?.[0]?.node?.selector ?? '').slice(0, MAX_SELECTOR),
    fases: fasesDe(lcpEl),
    scriptsTotal: scripts.length,
    scriptsAntes: antes.length,
    kibTotal: kib(scripts),
    kibAntes: kib(antes),
    kibFramework: kib(scripts.filter(esFramework)),
    kibApp: kib(scripts.filter((s) => !esFramework(s))),
    kibFuentes: kib(fuentes),
  }
}

export function medianas(resumenes) {
  const primero = resumenes[0]
  const salida = { ...primero }
  for (const clave of Object.keys(primero)) {
    if (typeof primero[clave] === 'number') salida[clave] = mediana(resumenes.map((r) => r[clave]))
  }
  salida.fases = {}
  for (const clave of Object.keys(primero.fases)) salida.fases[clave] = mediana(resumenes.map((r) => r.fases[clave] ?? 0))
  return salida
}

// El runner corta las anotaciones en 4096 caracteres: mejor fallar que leer un JSON cortado.
export function lineaCompacta(porModo) {
  const linea = JSON.stringify(porModo)
  if (linea.length > MAX_LINEA) throw new Error(`Línea de medición de ${linea.length} caracteres; el máximo es ${MAX_LINEA}.`)
  return linea
}
