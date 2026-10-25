// Runner local de la prueba del bloque 6 (anon sin privilegios sobre las tablas), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-anon.mjs
//
// Antes de aplicar: anon SÍ puede tocar las tablas (la RLS devuelve vacío pero no hay "permission denied");
// se esperan FALLO en Z1 y Z3 (Z2 ya pasa por RLS: un insert denegado da el mismo error). Después de aplicar la migración: todo OK.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()

async function correr(titulo) {
  const res = await db.exec(read('hardening/tests/bloque6_anon.sql'))
  const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
  console.log(`── ${titulo} ──`)
  console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
  return r.rows
}

const antes = await correr('ANTES (se esperan FALLO en Z1 y Z3)')
const antesOk = antes.every(x => /^Z[13]\b/.test(x.caso) ? x.resultado === 'FALLO' : x.resultado === 'OK')
console.log(antesOk ? 'antes: anon tiene privilegios sobre las tablas, como se esperaba\n' : 'antes: resultado inesperado\n')

await db.exec(read('migrations/20261025000002_anon_sin_permisos_tablas.sql'))
console.log('migración aplicada\n')
const despues = await correr('DESPUÉS (todos OK)')
const despuesOk = despues.every(x => x.resultado === 'OK')

console.log(despuesOk ? 'después: todo OK' : 'después: HAY FALLOS')
await db.close()
process.exitCode = antesOk && despuesOk ? 0 : 1
