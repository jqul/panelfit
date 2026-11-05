// Runner local de la prueba de la asistencia (no vino en citas y pasar lista en clases), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-asistencia.mjs
//
// Aplica las migraciones de las que depende (archivar clientes, horario y normas de reserva, bonos por el RGPD) y la
// nueva, y ejecuta la prueba: todo debe salir OK. Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
for (const m of ['20261024000001_enlace_caducidad.sql', '20261026000002_archivar_clientes.sql', '20261030000002_horario_citas.sql',
  '20261104000001_normas_reserva.sql', '20261104000004_clases_grupo.sql', '20261105000003_asistencia.sql']) {
  await db.exec(read(`migrations/${m}`))
  console.log(`migración aplicada: ${m}`)
}

const res = await db.exec(read('hardening/tests/bloque37_asistencia.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? 'todo OK' : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
