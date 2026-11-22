// Runner local de la prueba de los datos básicos del cliente en su registro (género, nacimiento, altura y peso), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-datos-basicos.mjs
//
// Aplica la migración nueva sobre el esquema base y añade `archived_at` (la migración de archivar rehace otras funciones que aquí no hacen falta).
// Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
await db.exec('alter table public.clientes add column if not exists archived_at bigint;')
const m = '20261122000010_cliente_datos_basicos.sql'
await db.exec(read(`migrations/${m}`))
console.log(`migración aplicada: ${m}`)

const res = await db.exec(read('hardening/tests/bloque45_datos_basicos.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? `todo OK (${r.rows.length} casos)` : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
