// Runner local de la prueba del alta de usuarios (migración 20261025000001), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-alta-usuarios.mjs
//
// Antes de aplicar: el alta de un cliente SÍ crea una fila fantasma (se espera FALLO en Y3).
// Después de aplicar la migración: todo OK. Sale con código 1 si algo no es lo esperado.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()

async function correr(titulo) {
  const res = await db.exec(read('hardening/tests/bloque12_alta_usuarios.sql'))
  const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
  console.log(`── ${titulo} ──`)
  console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
  return r.rows
}

const antes = await correr('ANTES (se espera FALLO solo en Y3)')
const antesOk = antes.every(x => /^Y3\b/.test(x.caso) ? x.resultado === 'FALLO' : x.resultado === 'OK')
console.log(antesOk ? 'antes: el cliente crea una fila fantasma, como se esperaba\n' : 'antes: resultado inesperado\n')

await db.exec(read('migrations/20261025000001_handle_new_user_sin_clientes.sql'))
console.log('migración aplicada\n')
const despues = await correr('DESPUÉS (todos OK)')
const despuesOk = despues.every(x => x.resultado === 'OK')

console.log(despuesOk ? 'después: todo OK' : 'después: HAY FALLOS')
await db.close()
process.exitCode = antesOk && despuesOk ? 0 : 1
