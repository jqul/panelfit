// Runner local de la prueba que saca clientes.notas_privadas y clientes.alerts de la fila que lee el cliente, sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-clientes-notas-alertas.mjs
//
// 1) Siembra clientes con notas y alertas ANTES de la migración (con texto, solo espacios, vacío, solo alertas, multilínea, largo),
//    aplica la migración y comprueba que todo lo que tenía contenido quedó idéntico en notas_privadas_cliente y que las columnas
//    de clientes quedaron vacías (sin tocar el resto de la fila).
// 2) Ejecuta bloque31_clientes_notas_y_alertas.sql (el cliente lee su fila sin notas ni alertas, RLS de la tabla nueva, el
//    disparador, upserts parciales): todo debe salir OK. Sale con código 1 si algo falla.
import { isDeepStrictEqual } from 'node:util'
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
// planes.siguiente la añade la migración de programas enlazados (que necesita cron): solo hace falta la columna
await db.exec('alter table public.planes add column if not exists siguiente jsonb')
for (const m of ['20261023000007_rgpd_consentimientos.sql', '20261023000008_rgpd_exportar_datos_cliente.sql', '20261023000009_rgpd_borrado_completo_cliente.sql', '20261118000001_diario_decisiones.sql', '20261118000002_notas_privadas_cliente.sql']) {
  await db.exec(read(`migrations/${m}`))
  console.log(`migración aplicada: ${m}`)
}

let ok = true
const check = (caso, cond, detalle = '') => { if (!cond) ok = false; console.log(`${cond ? 'OK   ' : 'FALLO'} ${caso}${detalle ? ' — ' + detalle : ''}`) }

// ── Datos previos a la migración ──
const larga = 'línea con "comillas", acentos y 🙂\n'.repeat(500)
const alertas = JSON.stringify([{ id: 'a1', type: 'llamar', note: 'Revisar el hombro', date: '2026-11-20', done: false, createdAt: 1 }, { id: 'a2', type: 'otro', note: 'Renovar', date: '2026-12-01', done: true, createdAt: 2 }])
await db.exec(`
  alter table public.entrenadores disable trigger welcome_email_trigger;
  insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
    ('aaaaaaaa-0000-0000-0000-0000000000a1', 'a1@test.local', 'A1', true, 'trainer', 'trainer');
`)
const filas = [
  ['1', 'Muy constante\nEvitar domingos', alertas],
  ['2', '   ', '[]'],
  ['3', '', '[]'],
  ['4', '', alertas],
  ['5', larga, '[]'],
]
for (const [n, notas, al] of filas) {
  await db.query(`insert into public.clientes (id, "trainerId", name, token, notas_privadas, alerts, phone) values ($1, 'aaaaaaaa-0000-0000-0000-0000000000a1', $2, $3, $4, $5::jsonb, '600')`,
    [`10000000-0000-0000-0000-00000000000${n}`, `Cliente ${n}`, `tok${n}`, notas, al])
}
// el cliente 1 ya tenía una fila de «notas» (la sección de la ficha): no debe pisarse
await db.exec(`insert into public.notas_privadas_cliente (client_id, trainer_id, notas) values ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Notas de la ficha')`)

// ── Migración ──
await db.exec(read('migrations/20261118000003_clientes_notas_y_alertas_privadas.sql'))
console.log('migración aplicada: 20261118000003_clientes_notas_y_alertas_privadas.sql')

// ── Migración de datos ──
const priv = Object.fromEntries((await db.query('select client_id, notas, observaciones, alertas from public.notas_privadas_cliente')).rows.map(r => [r.client_id, r]))
const id = n => `10000000-0000-0000-0000-00000000000${n}`
check('D1 pasan a la tabla nueva los clientes con observaciones o alertas (1, 4 y 5 y la existente; no 2 ni 3)', Object.keys(priv).length === 3 && !priv[id(2)] && !priv[id(3)], Object.keys(priv).length + ' filas')
check('D2 observaciones multilínea idénticas', priv[id(1)]?.observaciones === 'Muy constante\nEvitar domingos')
check('D3 alertas idénticas (con su estado hecho/pendiente)', isDeepStrictEqual(priv[id(1)]?.alertas, JSON.parse(alertas)) && isDeepStrictEqual(priv[id(4)]?.alertas, JSON.parse(alertas)))
check('D4 observaciones largas idénticas', priv[id(5)]?.observaciones === larga, (priv[id(5)]?.observaciones.length ?? 0) + ' caracteres')
check('D5 no pisa las «notas» de la ficha que ya existían', priv[id(1)]?.notas === 'Notas de la ficha')
const restos = (await db.query(`select count(*)::int n from public.clientes where coalesce(notas_privadas,'') <> '' or coalesce(alerts,'[]'::jsonb) <> '[]'::jsonb`)).rows[0].n
check('D6 ninguna fila de clientes conserva notas_privadas ni alerts', restos === 0, restos + ' restos')
const resto = (await db.query(`select name, phone, token from public.clientes where id = '${id(1)}'`)).rows[0]
check('D7 el resto de la fila de clientes queda intacto', resto.name === 'Cliente 1' && resto.phone === '600' && resto.token === 'tok1')

// Idempotente: volver a aplicarla no rompe ni pisa lo ya migrado (ni lo que la app nueva haya editado después)
await db.exec(`update public.notas_privadas_cliente set observaciones = 'Editada con la app nueva' where client_id = '${id(1)}'`)
try {
  await db.exec(read('migrations/20261118000003_clientes_notas_y_alertas_privadas.sql'))
  const o = (await db.query(`select observaciones from public.notas_privadas_cliente where client_id = '${id(1)}'`)).rows[0].observaciones
  check('D8 reaplicar es inocuo y no pisa ediciones posteriores', o === 'Editada con la app nueva')
} catch (e) { check('D8 reaplicar es inocuo', false, e.message) }

// ── Disparador, RLS, cliente ──
const res = await db.exec(read('hardening/tests/bloque31_clientes_notas_y_alertas.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
if (!r.rows.every(x => x.resultado === 'OK')) ok = false
console.log(ok ? 'todo OK' : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
