// Runner local de la prueba del calendario iCal del cliente (tokens + función para la dirección secreta + RLS + RGPD), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-calendario.mjs
//
// Aplica las migraciones del RGPD (definen client_data_tables), la de ausencias y eventos y la del calendario, y ejecuta la prueba: todo debe salir OK.
// Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
for (const m of ['20261023000007_rgpd_consentimientos.sql', '20261023000008_rgpd_exportar_datos_cliente.sql', '20261023000009_rgpd_borrado_completo_cliente.sql', '20261027000001_ausencias_y_eventos.sql']) {
  await db.exec(read(`migrations/${m}`))
  console.log(`migración aplicada: ${m}`)
}

// De la migración de archivar (20261026000002) solo hace falta la columna: el resto rehace funciones que dependen
// de migraciones posteriores al baseline que este entorno no carga.
await db.exec('alter table public.clientes add column if not exists archived_at bigint')
await db.exec(read('migrations/20261027000002_calendario_ical.sql'))
console.log('migración aplicada: 20261027000002_calendario_ical.sql (con clientes.archived_at)\n')

const res = await db.exec(read('hardening/tests/bloque17_calendario_ical.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? 'todo OK' : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
