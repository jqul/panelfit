// Runner local de la prueba de las revisiones del cuestionario de salud (checkins tipo 'parq_revisado' solo del entrenador del cliente), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-parq-revisado.mjs
//
// Aplica la migración nueva sobre el esquema base. Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
const m = '20261122000020_checkins_parq_revisado_solo_entrenador.sql'
await db.exec(read(`migrations/${m}`))
console.log(`migración aplicada: ${m}`)

const res = await db.exec(read('hardening/tests/bloque46_parq_revisado.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? `todo OK (${r.rows.length} casos)` : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
