// Informe del peso de lo que descarga cada recorrido de usuario, a partir de dist/.
//   npm run build && node scripts/bundle-report.mjs           → tabla
//   npm run build && node scripts/bundle-report.mjs --check   → además sale con 1 si algo pasa su presupuesto
//
// Un "recorrido" es lo que se descarga ANTES de poder usar la pantalla: el HTML, el JS de entrada, el CSS
// y, si la ruta se carga bajo demanda, su trozo y los que Vite precarga con él. Lo que se pide después
// (pestañas, gráficas, Excel) no cuenta. Se mide gzip, que es lo que viaja por la red (Vercel sirve brotli,
// algo menor). El tiempo es una ESTIMACIÓN con la red "4G lento" de Lighthouse (1,6 Mb/s): solo transferencia,
// sin contar la latencia ni el tiempo de ejecución; para medir de verdad hay que usar un móvil (ver docs/rendimiento.md).
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const DIST = path.resolve(process.argv.find(a => a.startsWith('--dist='))?.slice(7) ?? 'dist')
const CHECK = process.argv.includes('--check')
const MBIT = 1.6

// Presupuestos en kB gzip. Se ajustan hacia abajo cuando se mejora; subirlos tiene que ser una decisión consciente.
const BUDGET = { 'Landing y blog': 135, 'Cliente (/?c=token)': 165, 'Entrenador (panel)': 295 }

const read = f => fs.readFileSync(path.join(DIST, f))
const gz = f => zlib.gzipSync(read(f), { level: 9 }).length
const kb = n => (n / 1024).toFixed(1).padStart(6)

const html = read('index.html').toString()
const entry = html.match(/src="\/(assets\/index-[^"]+\.js)"/)?.[1]
const css = [...html.matchAll(/href="\/(assets\/[^"]+\.css)"/g)].map(m => m[1])
if (!entry) { console.error('No encuentro el JS de entrada en dist/index.html: ¿se ha hecho el build?'); process.exit(2) }

// Vite precarga con cada import() dinámico los trozos que ese import necesita (__vite__mapDeps).
const entryText = read(entry).toString()
const deps = JSON.parse(entryText.match(/m\.f\|\|\(m\.f=(\[[^\]]*\])/)?.[1] ?? 'null')
if (!deps) { console.error('No encuentro __vite__mapDeps en el JS de entrada: ¿ha cambiado Vite?'); process.exit(2) }
const lazyDeps = {}
// El import puede llevar un `.then(t=>t.x)` antes de la lista de precarga (Vite lo añade cuando el trozo reexporta algo).
for (const m of entryText.matchAll(/import\("\.\/([^"]+)"\)(?:\.then\([^)]*\))?,__vite__mapDeps\(\[([\d,]+)\]\)/g)) {
  lazyDeps[m[1].replace(/-[\w-]{6,}\.js$/, '')] = m[2].split(',').map(i => deps[Number(i)])
}

const journeys = {
  'Landing y blog': [entry, ...css, ...(lazyDeps.LandingAppEntrenadores ?? [])],
  'Cliente (/?c=token)': [entry, ...css, ...(lazyDeps.ClientView ?? [])],
  'Entrenador (panel)': [entry, ...css, ...(lazyDeps.TrainerDashboard ?? [])],
}
for (const [name, files] of Object.entries(journeys)) {
  if (name !== 'Landing y blog' && files.length <= 1 + css.length) { console.error(`No encuentro los trozos de «${name}»`); process.exit(2) }
}

let fail = false
console.log(`\nPeso por recorrido (gzip) — ${DIST}\n`)
for (const [name, files] of Object.entries(journeys)) {
  const uniq = [...new Set(files)]
  const total = uniq.reduce((a, f) => a + gz(f), 0)
  const budget = BUDGET[name]
  const over = total / 1024 > budget
  if (over) fail = true
  console.log(`${name.padEnd(22)} ${kb(total)} kB   ~${(total * 8 / (MBIT * 1e6)).toFixed(1)} s a ${MBIT} Mb/s   presupuesto ${budget} kB ${over ? '  ⚠ SUPERADO' : '  ok'}`)
  for (const f of uniq.sort((a, b) => gz(b) - gz(a))) console.log(`    ${kb(gz(f))} kB  ${f.replace('assets/', '')}`)
  console.log()
}

// Lo que NO está en ningún recorrido y se carga bajo demanda, para ver que sigue así.
const all = fs.readdirSync(path.join(DIST, 'assets')).filter(f => f.endsWith('.js'))
const inJourneys = new Set(Object.values(journeys).flat().map(f => f.replace('assets/', '')))
const bajoDemanda = all.filter(f => !inJourneys.has(f)).map(f => [f, gz('assets/' + f)]).sort((a, b) => b[1] - a[1]).slice(0, 6)
console.log('Mayores trozos bajo demanda:')
for (const [f, n] of bajoDemanda) console.log(`    ${kb(n)} kB  ${f}`)
console.log()

if (CHECK && fail) { console.error('Presupuesto superado.'); process.exit(1) }
