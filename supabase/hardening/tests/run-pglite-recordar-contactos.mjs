// Runner local de la prueba del recordatorio de contactos sin contestar, sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-recordar-contactos.mjs
//
// Aplica las migraciones de contactos y la nueva (sin su línea de cron.schedule: PGlite no tiene cron) y ejecuta la
// prueba: todo debe salir OK. Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
for (const m of ['20261023000003_submit_lead_codigo_recomendacion.sql', '20261028000002_aviso_nuevo_contacto.sql', '20261028000003_leads_convertido.sql', '20261028000004_submit_lead_validacion_y_limites.sql', '20261029000001_recordar_contactos_sin_contestar.sql']) {
  let sql = read(`migrations/${m}`)
  sql = sql.slice(0, sql.includes('-- Tarea programada') ? sql.indexOf('-- Tarea programada') : sql.length)
  await db.exec(sql)
  console.log(`migración aplicada: ${m}`)
}

const res = await db.exec(read('hardening/tests/bloque21_recordar_contactos.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? 'todo OK' : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
