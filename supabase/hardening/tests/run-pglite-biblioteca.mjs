// Runner local de la prueba de la migración de la biblioteca de ejercicios, sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-biblioteca.mjs
//
// Carga el baseline, aplica 20261025000003_biblioteca_ejercicios.sql y ejecuta bloque_biblioteca.sql:
// todo debe salir OK. Sale con código 1 si algo no es lo esperado.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
const antes = (await db.query(`select count(*)::int as n from information_schema.columns where table_schema='public' and table_name='exercise_library' and column_name in ('material','archived_at','alternativas')`)).rows[0].n
console.log(`ANTES: ${antes} de las 3 columnas nuevas existen (se espera 0)\n`)

await db.exec(read('migrations/20261025000003_biblioteca_ejercicios.sql'))
// Idempotente: aplicarla dos veces no falla
await db.exec(read('migrations/20261025000003_biblioteca_ejercicios.sql'))
console.log('migración aplicada (dos veces, sin error)\n')

const res = await db.exec(read('hardening/tests/bloque_biblioteca.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 70) })))
const ok = antes === 0 && r.rows.every(x => x.resultado === 'OK')
console.log(ok ? 'después: todo OK' : 'después: HAY FALLOS')
await db.close()
process.exitCode = ok ? 0 : 1
