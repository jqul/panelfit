// Runner local de la prueba de las revisiones del cuestionario de salud (checkins tipo 'parq_revisado' solo del entrenador del cliente, con la huella SHA-256 calculada
// en el servidor), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-parq-revisado.mjs
//   node supabase/hardening/tests/run-pglite-parq-revisado.mjs --fijar   (rellena en huella_vectores.json las huellas de `fijos` que aún estén a null; revisarlas a mano)
//
// Aplica la migración nueva sobre el esquema base (con una ficha de admisión YA existente, para comprobar que se rellena su huella), ejecuta bloque46 y comprueba los
// vectores de huella_vectores.json contra la función SQL. Sale con código 1 si algo falla.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { crearBase, read } from './pglite-base.mjs'

const rutaVectores = fileURLToPath(new URL('./huella_vectores.json', import.meta.url))
const vectores = JSON.parse(readFileSync(rutaVectores, 'utf8'))

const db = await crearBase()

// Una ficha de admisión que ya existía ANTES de aplicar la migración (sin columna de huella): la migración debe rellenársela
await db.exec(`
  alter table public.entrenadores disable trigger welcome_email_trigger;
  insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values ('dddddddd-0000-0000-0000-000000000001', 'previo@test.local', 'Previo', true, 'trainer', 'trainer');
  insert into public.clientes (id, "trainerId", name, token) values ('d1000000-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'Previo', 'tok-previo');
  insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values
    ('d1000000-0000-0000-0000-0000000000a1', 'd1000000-0000-0000-0000-000000000001', 'intake', '[{"pregunta":"¿Problema cardíaco?","respuesta":"Sí"}]', 1),
    ('d1000000-0000-0000-0000-0000000000a2', 'd1000000-0000-0000-0000-000000000001', 'intake', null, 2),
    ('d1000000-0000-0000-0000-0000000000a3', 'd1000000-0000-0000-0000-000000000001', 'checkin', '[{"pregunta":"x","respuesta":"y"}]', 3);
`)
const m = '20261122000020_checkins_parq_revisado_solo_entrenador.sql'
await db.exec(read(`migrations/${m}`))
console.log(`migración aplicada: ${m}`)

const fallos = []
const comprobar = (caso, ok, detalle = '') => { if (!ok) fallos.push(`${caso} ${detalle}`) ; return { caso, resultado: ok ? 'OK' : 'FALLO', detalle: String(detalle).slice(0, 70) } }
const huella = async r => (await db.query('select public.huella_admision($1::jsonb) as h', [JSON.stringify(r)])).rows[0].h

// ── Lo que ya existía al aplicar la migración ──
const previo = (await db.query(`select id, tipo, huella, public.huella_admision(respuestas) as calculada from public.checkins where "clientId" = 'd1000000-0000-0000-0000-000000000001' order by id`)).rows
const filas = [
  comprobar('p1 una ficha previa recibe su huella al aplicar la migración', previo[0].huella === previo[0].calculada && /^[0-9a-f]{64}$/.test(previo[0].huella)),
  comprobar('p2 una ficha previa sin respuestas (null) recibe la huella de «sin respuestas»', previo[1].huella === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
  comprobar('p3 lo que no es una ficha de admisión no recibe huella', previo[2].huella === null),
]

// ── bloque46 ──
const res = await db.exec(read('hardening/tests/bloque46_parq_revisado.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
for (const x of r.rows) filas.push(comprobar(x.caso, x.resultado === 'OK', x.detalle))

// ── Vectores de la huella ──
const porFijar = []
for (const f of vectores.fijos) {
  const h = await huella(f.respuestas)
  if (f.huella === null && process.argv.includes('--fijar')) { f.huella = h; porFijar.push(h) }
  filas.push(comprobar(`v-fijo ${f.nombre}`, f.huella !== null && h === f.huella, f.huella === null ? `sin fijar: ${h}` : h))
}
for (const g of vectores.equivalentes) {
  const hs = []
  for (const c of g.casos) hs.push(await huella(c))
  filas.push(comprobar(`v-equivalentes ${g.nombre}`, hs.every(h => h === hs[0]) && /^[0-9a-f]{64}$/.test(hs[0]), `${g.casos.length} casos → ${hs[0].slice(0, 12)}…`))
}
for (const g of vectores.distintos) {
  const base = await huella(g.base)
  const otros = []
  for (const c of g.otros) otros.push(await huella(c))
  const todas = [base, ...otros]
  filas.push(comprobar(`v-distintos ${g.nombre}`, new Set(todas).size === todas.length, `${todas.length} huellas, ${new Set(todas).size} distintas`))
}
// Solo se toca el texto de las huellas por fijar (en orden), sin reformatear el resto del fichero
if (porFijar.length) {
  let i = 0
  writeFileSync(rutaVectores, readFileSync(rutaVectores, 'utf8').replace(/"huella": null/g, () => `"huella": "${porFijar[i++]}"`))
}

console.table(filas)
const ok = filas.every(x => x.resultado === 'OK')
console.log(ok ? `todo OK (${filas.length} casos)` : `HAY FALLOS: ${fallos.length}`)

await db.close()
process.exitCode = ok ? 0 : 1
