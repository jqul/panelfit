// Runner local de la prueba de find_trainer_by_email (solo entrenadores aprobados), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-buscar-entrenador.mjs
//
// Antes de aplicar: la función devuelve el uid de cualquier fila a cualquiera con sesión (se esperan FALLO en V3, V5 y V6, y en V1/V2 por distinguir mayúsculas).
// Después de aplicar: todo OK, y V1/V2/V4 (lo legítimo) funcionan igual que antes.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()

async function correr(titulo) {
  const res = await db.exec(read('hardening/tests/bloque14_buscar_entrenador.sql'))
  const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
  console.log(`── ${titulo} ──`)
  console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
  return r.rows
}

const antes = await correr('ANTES (se esperan FALLO en V1, V2, V3, V5 y V6)')
// La función vieja distinguía mayúsculas (V1 y V2 no encuentran un correo guardado con otras mayúsculas) y no filtraba nada (V3, V5 y V6).
const antesOk = ['V1','V2','V3','V5','V6'].every(v => antes.find(x => x.caso.startsWith(v))?.resultado === 'FALLO') && antes.find(x => x.caso.startsWith('V4'))?.resultado === 'OK'
console.log(antesOk ? 'antes: la función filtra de más, como se esperaba\n' : 'antes: resultado inesperado\n')

await db.exec(read('migrations/20261025000005_buscar_entrenador_solo_entrenadores.sql'))
console.log('migración aplicada\n')
const despues = await correr('DESPUÉS (todos OK)')
const despuesOk = despues.every(x => x.resultado === 'OK')

console.log(despuesOk ? 'después: todo OK' : 'después: HAY FALLOS')
await db.close()
process.exitCode = antesOk && despuesOk ? 0 : 1
