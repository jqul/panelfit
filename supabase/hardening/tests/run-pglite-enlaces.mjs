// Runner local de las pruebas de los bloques 7 y 8 (enlaces de cliente), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-enlaces.mjs
//
// Bloque 7: ejecuta bloque7_recomendacion.sql antes y después de aplicarlo.
// Bloque 8: ejecuta bloque8_caducidad.sql después de aplicarlo.
// Sale con código 1 si algo no es lo esperado.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
const hard = read('hardening/20261018_propuesta_endurecimiento.sql')

async function correr(titulo, archivo) {
  const res = await db.exec(read(`hardening/tests/${archivo}`))
  const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
  console.log(`── ${titulo} ──`)
  console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
  return r.rows
}

const b7 = hard.slice(hard.indexOf('create or replace function public.submit_lead'), hard.indexOf('-- 8 · '))
const b8 = hard.slice(hard.indexOf('alter table public.clientes add column if not exists token_expires_at'))

const antes = await correr('ANTES del bloque 7 (se esperan FALLO en R1 y R2)', 'bloque7_recomendacion.sql')
const antesOk = antes.every(x => /^R[12]\b/.test(x.caso) ? x.resultado === 'FALLO' : x.resultado === 'OK')
console.log(antesOk ? 'antes: el token en bruto atribuye y el código no, como se esperaba\n' : 'antes: resultado inesperado\n')

await db.exec(b7)
console.log('bloque 7 aplicado\n')
const despues7 = await correr('DESPUÉS del bloque 7 (todos OK)', 'bloque7_recomendacion.sql')
const ok7 = despues7.every(x => x.resultado === 'OK')

await db.exec(b8)
console.log('bloque 8 aplicado\n')
const despues8 = await correr('DESPUÉS del bloque 8 (todos OK)', 'bloque8_caducidad.sql')
const ok8 = despues8.every(x => x.resultado === 'OK')

console.log(ok7 && ok8 ? 'después: todo OK' : 'después: HAY FALLOS')
await db.close()
process.exitCode = antesOk && ok7 && ok8 ? 0 : 1
