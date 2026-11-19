// Runner local de la prueba del aviso propio, el recordatorio de «a revisar» y la purga con seguimiento autorizado, sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-solicitud-revision.mjs
// Aplica las migraciones de contactos y de la solicitud (sin sus líneas de cron.schedule: PGlite no tiene cron) y la nueva.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
const migraciones = [
  '20261023000003_submit_lead_codigo_recomendacion.sql', '20261028000002_aviso_nuevo_contacto.sql', '20261028000003_leads_convertido.sql',
  '20261028000004_submit_lead_validacion_y_limites.sql', '20261029000001_recordar_contactos_sin_contestar.sql',
  '20261023000007_rgpd_consentimientos.sql', '20261023000008_rgpd_exportar_datos_cliente.sql', '20261023000009_rgpd_borrado_completo_cliente.sql',
  '20261118000001_diario_decisiones.sql', '20261118000020_solicitud_programacion_inicial.sql', '20261119000010_solicitud_revision_aviso.sql',
]
for (const m of migraciones) {
  let sql = read(`migrations/${m}`)
  sql = sql.slice(0, sql.includes('-- Tarea programada') ? sql.indexOf('-- Tarea programada') : sql.length)
  await db.exec(sql)
  console.log(`migración aplicada: ${m}`)
}

const res = await db.exec(read('hardening/tests/bloque42_solicitud_revision.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? `todo OK (${r.rows.length} casos)` : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
