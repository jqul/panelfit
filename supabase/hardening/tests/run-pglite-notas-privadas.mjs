// Runner local de la prueba de las notas privadas del entrenador, sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-notas-privadas.mjs
//
// 1) Siembra planes con coachNotes ANTES de la migración (vivo, borrador, con texto, vacío, sin la clave, multilínea y largo),
//    aplica la migración y comprueba que cada nota con texto quedó idéntica en la tabla nueva y que ningún plan que lee el
//    cliente conserva la clave (sin tocar el resto del plan).
// 2) Ejecuta bloque30_notas_privadas.sql (RLS, cliente, otro entrenador, RGPD, cascada): todo debe salir OK.
// Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
for (const m of ['20261023000007_rgpd_consentimientos.sql', '20261023000008_rgpd_exportar_datos_cliente.sql', '20261023000009_rgpd_borrado_completo_cliente.sql', '20261118000001_diario_decisiones.sql']) {
  await db.exec(read(`migrations/${m}`))
  console.log(`migración aplicada: ${m}`)
}
// planes.siguiente la añade la migración de programas enlazados (que necesita cron): solo hace falta la columna
await db.exec('alter table public.planes add column if not exists siguiente jsonb')

let ok = true
const check = (caso, cond, detalle = '') => { if (!cond) ok = false; console.log(`${cond ? 'OK   ' : 'FALLO'} ${caso}${detalle ? ' — ' + detalle : ''}`) }

// ── Datos previos a la migración ──
const larga = 'línea con "comillas", acentos y 🙂\n'.repeat(900)
await db.exec(`
  alter table public.entrenadores disable trigger welcome_email_trigger;
  insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
    ('aaaaaaaa-0000-0000-0000-0000000000a1', 'a1@test.local', 'A1', true, 'trainer', 'trainer');
  insert into public.clientes (id, "trainerId", name, token) values
    ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Con notas', 't1'),
    ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Notas vacías', 't2'),
    ('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Sin clave', 't3'),
    ('10000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Notas largas', 't4'),
    ('10000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Borrador con notas', 't5');
`)
const plan = (extra) => JSON.stringify({ P: { clientId: 'x', type: 'fuerza', restMain: 180, weeks: [{ label: 'S1', days: [] }], ...extra } })
await db.query(`insert into public.planes ("clientId", plan, "updatedAt") values
  ('10000000-0000-0000-0000-000000000001', $1::jsonb, 1),
  ('10000000-0000-0000-0000-000000000002', $2::jsonb, 1),
  ('10000000-0000-0000-0000-000000000003', $3::jsonb, 1),
  ('10000000-0000-0000-0000-000000000004', $4::jsonb, 1)`,
  [plan({ coachNotes: 'Rodilla derecha: ojo\n[⚠️ Lesión] vigilar' }), plan({ coachNotes: '   ' }), plan({}), plan({ coachNotes: larga })])
await db.query(`insert into public.planes ("clientId", plan, plan_borrador, siguiente, borrador_activo, "updatedAt") values
  ('10000000-0000-0000-0000-000000000005', $1::jsonb, $2::jsonb, $3::jsonb, true, 1)`,
  [plan({ coachNotes: 'Nota del plan vivo' }), plan({ coachNotes: 'Nota del borrador' }), plan({ coachNotes: 'Nota del siguiente' })])

// ── Migración ──
await db.exec(read('migrations/20261118000002_notas_privadas_cliente.sql'))
console.log('migración aplicada: 20261118000002_notas_privadas_cliente.sql')

// ── Migración de datos ──
const notas = Object.fromEntries((await db.query('select client_id, notas, trainer_id from public.notas_privadas_cliente')).rows.map(r => [r.client_id, r]))
check('D1 las notas con texto pasaron a la tabla nueva (1, 4 y 5; no la vacía ni la que no tenía)', Object.keys(notas).length === 3, Object.keys(notas).length + ' filas')
check('D2 la nota multilínea quedó idéntica', notas['10000000-0000-0000-0000-000000000001']?.notas === 'Rodilla derecha: ojo\n[⚠️ Lesión] vigilar')
check('D3 la nota larga quedó idéntica', notas['10000000-0000-0000-0000-000000000004']?.notas === larga, (notas['10000000-0000-0000-0000-000000000004']?.notas.length ?? 0) + ' caracteres')
check('D4 el entrenador de la nota es el del cliente', Object.values(notas).every(n => n.trainer_id === 'aaaaaaaa-0000-0000-0000-0000000000a1'))
check('D5 con plan vivo y borrador con notas, manda el plan vivo', notas['10000000-0000-0000-0000-000000000005']?.notas === 'Nota del plan vivo')
const restos = (await db.query(`select count(*)::int n from public.planes where plan::text like '%coachNotes%' or plan_borrador::text like '%coachNotes%' or siguiente::text like '%coachNotes%'`)).rows[0].n
check('D6 ningún plan que lee el cliente conserva coachNotes (plan, borrador, siguiente)', restos === 0, restos + ' restos')
const p1 = (await db.query(`select plan from public.planes where "clientId" = '10000000-0000-0000-0000-000000000001'`)).rows[0].plan
check('D7 el resto del plan quedó intacto', p1.P.type === 'fuerza' && p1.P.restMain === 180 && p1.P.weeks.length === 1 && !('coachNotes' in p1.P))

// Idempotente: volver a aplicarla no rompe ni duplica
try { await db.exec(read('migrations/20261118000002_notas_privadas_cliente.sql').replace(/create policy[^;]*;/s, '')); check('D8 reaplicar es inocuo', (await db.query('select count(*)::int n from public.notas_privadas_cliente')).rows[0].n === 3) }
catch (e) { check('D8 reaplicar es inocuo', false, e.message) }

// El disparador impide que vuelva a entrar (una pestaña antigua que guarda el plan, una restauración del historial...)
await db.exec(`insert into public.clientes (id, "trainerId", name, token) values ('10000000-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Reescribe', 't6')`)
await db.query(`insert into public.planes ("clientId", plan, plan_borrador, "updatedAt") values ('10000000-0000-0000-0000-000000000006', $1::jsonb, $1::jsonb, 1)`, [plan({ coachNotes: 'reintroducida' })])
await db.query(`update public.planes set plan = $1::jsonb where "clientId" = '10000000-0000-0000-0000-000000000001'`, [plan({ coachNotes: 'reintroducida al guardar', message: 'hola' })])
const tras = (await db.query(`select count(*)::int n from public.planes where plan::text like '%coachNotes%' or plan_borrador::text like '%coachNotes%'`)).rows[0].n
check('D9 insertar o guardar un plan con coachNotes ya no la deja en el plan', tras === 0, tras + ' restos')
const msg = (await db.query(`select plan from public.planes where "clientId" = '10000000-0000-0000-0000-000000000001'`)).rows[0].plan.P.message
check('D10 el disparador no toca el resto del plan', msg === 'hola')
const nn = (await db.query(`select notas from public.notas_privadas_cliente where client_id = '10000000-0000-0000-0000-000000000001'`)).rows[0].notas
check('D11 las notas guardadas no cambian por reescribir el plan', nn === 'Rodilla derecha: ojo\n[⚠️ Lesión] vigilar')



// ── Exportación RGPD: el cliente no recibe lo que el entrenador guarda sobre él; el entrenador sí ──
// (client_data_tables lista tablas de migraciones posteriores que aquí no existen: se acota a las que importan)
await db.exec(`
  create or replace function public.client_data_tables() returns table(tbl text, col text) language sql immutable as $$
    values ('notas_privadas_cliente', 'client_id'), ('decisiones_entrenador', 'client_id'), ('plan_history', 'clientId'), ('planes', 'clientId') $$;
  insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-0000000000c1', 'cx@test.local');
  update public.clientes set auth_user_id = 'cccccccc-0000-0000-0000-0000000000c1' where id = '10000000-0000-0000-0000-000000000001';
  insert into public.decisiones_entrenador (trainer_id, client_id, tipo, hipotesis) values ('aaaaaaaa-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', 'mantener', 'hipótesis privada');
`)
await db.query(`insert into public.plan_history ("clientId", plan, note) values ('10000000-0000-0000-0000-000000000001', $1::jsonb, 'copia antigua')`, [plan({ coachNotes: 'nota en copia antigua' })])
async function exportar(sub) {
  await db.exec(`begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"${sub}","role":"authenticated"}', true)`)
  try { return (await db.query(`select public.export_client_data('10000000-0000-0000-0000-000000000001') as x`)).rows[0].x }
  finally { await db.exec('rollback') }
}
const delCliente = await exportar('cccccccc-0000-0000-0000-0000000000c1')
const txtCliente = JSON.stringify(delCliente)
check('X1 la exportación del propio cliente NO incluye las notas privadas ni el diario', !('notas_privadas_cliente' in delCliente) && !('decisiones_entrenador' in delCliente) && !txtCliente.includes('Rodilla derecha') && !txtCliente.includes('hipótesis privada'))
check('X2 ni coachNotes dentro de las copias antiguas del historial (que sí se exporta, sin ellas)', !txtCliente.includes('coachNotes') && !txtCliente.includes('nota en copia antigua') && delCliente.plan_history?.length === 1)
const delEntrenador = await exportar('aaaaaaaa-0000-0000-0000-0000000000a1')
check('X3 la exportación del entrenador lo incluye todo: notas, diario y el historial tal cual', delEntrenador.notas_privadas_cliente?.length === 1 && delEntrenador.decisiones_entrenador?.length === 1 && JSON.stringify(delEntrenador.plan_history).includes('nota en copia antigua'))

// ── RLS y RGPD (con la tabla real y su cascada) ──
// La prueba SQL usa la definición real de client_data_tables, no la acotada de arriba
await db.exec(read('migrations/20261118000002_notas_privadas_cliente.sql').match(/create or replace function public\.client_data_tables\(\)[\s\S]*?\$function\$;/)[0])
const res = await db.exec(read('hardening/tests/bloque30_notas_privadas.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
if (!r.rows.every(x => x.resultado === 'OK')) ok = false
console.log(ok ? 'todo OK' : 'HAY FALLOS')

await db.close()
process.exitCode = ok ? 0 : 1
