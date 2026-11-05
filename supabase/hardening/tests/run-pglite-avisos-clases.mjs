// Runner local de la prueba de los avisos de las clases de grupo (plaza conseguida y recordatorio), sin base de datos
// real. Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-avisos-clases.mjs
//
// Aplica las migraciones de las que depende (sin sus tareas programadas: PGlite no tiene cron) y la nueva, y ejecuta
// la prueba: todo debe salir OK. Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
for (const m of ['20261024000001_enlace_caducidad.sql', '20261026000002_archivar_clientes.sql', '20261030000002_horario_citas.sql',
  '20261030000003_recordatorio_cita.sql', '20261104000001_normas_reserva.sql', '20261104000004_clases_grupo.sql', '20261105000001_avisos_clases.sql']) {
  let sql = read(`migrations/${m}`)
  sql = sql.slice(0, sql.includes('-- Tarea programada') ? sql.indexOf('-- Tarea programada') : sql.length)
  await db.exec(sql)
  console.log(`migración aplicada: ${m}`)
}

const res = await db.exec(read('hardening/tests/bloque35_avisos_clases.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? 'todo OK' : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
