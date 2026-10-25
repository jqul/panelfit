// Runner local de la prueba de la migración de rendimiento (políticas e índices), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-rendimiento.mjs
//
// Antes de aplicar: el comportamiento ya es el correcto (W1-W4 OK) pero las políticas llaman a auth.uid() sin envolver
// y faltan los índices (se esperan FALLO en W5 y W6). Después de aplicar: todo OK, con el MISMO comportamiento.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()

async function correr(titulo) {
  const res = await db.exec(read('hardening/tests/bloque13_rendimiento.sql'))
  const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
  console.log(`── ${titulo} ──`)
  console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
  return r.rows
}

const antes = await correr('ANTES (se esperan FALLO solo en W5 y W6)')
const antesOk = antes.every(x => /^W[56]\b/.test(x.caso) ? x.resultado === 'FALLO' : x.resultado === 'OK')
console.log(antesOk ? 'antes: el comportamiento es correcto y falta solo la optimización, como se esperaba\n' : 'antes: resultado inesperado\n')

await db.exec(read('migrations/20261025000004_rendimiento_politicas_e_indices.sql'))
console.log('migración aplicada\n')
const despues = await correr('DESPUÉS (todos OK)')
const despuesOk = despues.every(x => x.resultado === 'OK')

console.log(despuesOk ? 'después: todo OK' : 'después: HAY FALLOS')
await db.close()
process.exitCode = antesOk && despuesOk ? 0 : 1
