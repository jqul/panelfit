// Runner local de la prueba de las comentario antes del entreno (tabla nueva + RLS + RGPD), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-nota-antes-sesion.mjs
//
// Aplica las migraciones del RGPD (definen client_data_tables) y la nueva, y ejecuta la prueba: todo debe salir OK.
// Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
for (const m of ['20261023000007_rgpd_consentimientos.sql', '20261023000008_rgpd_exportar_datos_cliente.sql', '20261023000009_rgpd_borrado_completo_cliente.sql', '20261024000001_enlace_caducidad.sql', '20261026000002_archivar_clientes.sql', '20261028000004_tareas_cliente.sql', '20261029000002_recordatorio_diario.sql', '20261029000003_nota_antes_sesion.sql']) {
  let sql = read(`migrations/${m}`)
  sql = sql.slice(0, sql.includes('-- Tarea programada') ? sql.indexOf('-- Tarea programada') : sql.length) // PGlite no tiene cron
  await db.exec(sql)
  console.log(`migración aplicada: ${m}`)
}

const res = await db.exec(read('hardening/tests/bloque23_nota_antes_sesion.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? 'todo OK' : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
