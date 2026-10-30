// Runner local de la prueba del profesional asignado a cada cliente, sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-profesional-cliente.mjs
//
// Aplica las migraciones que añaden columnas a clientes (hay que rehacer get_client_by_token con todas) y la nueva, y
// ejecuta la prueba: todo debe salir OK. Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
for (const m of ['20261024000001_enlace_caducidad.sql', '20261026000002_archivar_clientes.sql', '20261029000002_recordatorio_diario.sql', '20261030000005_profesional_cliente.sql']) {
  let sql = read(`migrations/${m}`)
  sql = sql.slice(0, sql.includes('-- Tarea programada') ? sql.indexOf('-- Tarea programada') : sql.length) // PGlite no tiene cron
  await db.exec(sql)
  console.log(`migración aplicada: ${m}`)
}

const res = await db.exec(read('hardening/tests/bloque29_profesional_cliente.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? 'todo OK' : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
