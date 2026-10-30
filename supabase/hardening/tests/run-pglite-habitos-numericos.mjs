// Runner local de la prueba de los hábitos con meta numérica, sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-habitos-numericos.mjs
//
// Aplica la migración nueva y ejecuta la prueba: todo debe salir OK. Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
for (const m of ['20261030000006_habitos_numericos.sql']) {
  await db.exec(read(`migrations/${m}`))
  console.log(`migración aplicada: ${m}`)
}

const res = await db.exec(read('hardening/tests/bloque30_habitos_numericos.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? 'todo OK' : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
