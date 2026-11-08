// Uso: node scripts/medir/leer.mjs {sha}. Lee las anotaciones de la API pública y arma la tabla con el ruido A/A.
const REPO = 'cricriyeah/guia-baja'
const sha = process.argv[2]
const api = async (ruta) => {
  const r = await fetch(`https://api.github.com/repos/${REPO}/${ruta}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'medir-lcp' } })
  if (!r.ok) throw new Error(`GitHub respondió ${r.status} en ${ruta}`)
  return r.json()
}

const { check_runs: corridas } = await api(`commits/${sha}/check-runs?per_page=100`)
const datos = {}
for (const c of corridas) {
  const anotaciones = await api(`check-runs/${c.id}/annotations?per_page=100`)
  for (const a of anotaciones) {
    const m = /^lcp (\S+) (\S+)$/.exec(a.title ?? '')
    if (!m) continue
    ;(datos[m[2]] ??= {})[m[1]] = JSON.parse(a.message)
  }
}

console.log('| URL | control | LCP sim | Δ vs base | TBT sim | LCP real | TBT real | LCP obs | scripts antes | fase mayor | elemento LCP | JS framework / app (KiB) | fuentes (KiB) |')
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for (const [url, porControl] of Object.entries(datos)) {
  const base = porControl.base?.simulado
  for (const [control, modos] of Object.entries(porControl)) {
    const s = modos.simulado
    const real = modos.devtools
    const fase = Object.entries(s.fases).sort((a, b) => b[1] - a[1])[0]?.join('=') ?? ''
    const selector = s.selector.replaceAll('|', '\\|')
    console.log(`| ${url} | ${control} | ${s.lcp} | ${base ? s.lcp - base.lcp : ''} | ${s.tbt} | ${real.lcp} | ${real.tbt} | ${s.lcpObservado} | ${s.scriptsAntes}/${s.scriptsTotal} | ${fase} | \`${selector}\` | ${s.kibFramework} / ${s.kibApp} | ${s.kibFuentes} |`)
  }
}
const ruido = Math.max(0, ...Object.values(datos).map((p) => (p.base && p.base2 ? Math.abs(p.base.simulado.lcp - p.base2.simulado.lcp) : 0)))
console.log(`\nRuido A/A (máxima diferencia base/base2 entre URLs): ${ruido} ms. Un control solo «baja el LCP» si su diferencia pasa de eso.`)
