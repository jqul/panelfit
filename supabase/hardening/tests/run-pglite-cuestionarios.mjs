// Runner local de la prueba de los cuestionarios del cliente (encuestas pendientes + RLS de respuestas), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-cuestionarios.mjs
//
// Aplica la migración de los cuestionarios y ejecuta la prueba: todo debe salir OK. Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()

// De la migración de archivar (20261026000002) solo hace falta la columna: el resto rehace funciones que dependen
// de migraciones posteriores al baseline que este entorno no carga.
await db.exec('alter table public.clientes add column if not exists archived_at bigint')
await db.exec(read('migrations/20261028000001_cuestionarios_cliente.sql'))
console.log('migración aplicada: 20261028000001_cuestionarios_cliente.sql (con clientes.archived_at)\n')

const res = await db.exec(read('hardening/tests/bloque18_cuestionarios.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? 'todo OK' : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
