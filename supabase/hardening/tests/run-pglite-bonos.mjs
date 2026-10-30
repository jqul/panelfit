// Runner local de la prueba de los bonos de sesiones, sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-bonos.mjs
//
// Aplica las migraciones del RGPD y la nueva y ejecuta la prueba: todo debe salir OK. Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
for (const m of ['20261023000007_rgpd_consentimientos.sql', '20261023000008_rgpd_exportar_datos_cliente.sql', '20261023000009_rgpd_borrado_completo_cliente.sql', '20261030000004_bonos_cliente.sql']) {
  await db.exec(read(`migrations/${m}`))
  console.log(`migración aplicada: ${m}`)
}

const res = await db.exec(read('hardening/tests/bloque28_bonos.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? 'todo OK' : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
