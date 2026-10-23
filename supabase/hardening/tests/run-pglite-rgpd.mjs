// Runner local de la prueba de los bloques 9 a 11 (RGPD), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-rgpd.mjs
//
// Antes de aplicar: demuestra que borrar solo la fila de `clientes` (lo que hace hoy el
// botón de eliminar cliente) deja huérfanos los datos de salud guardados con el id como
// text. Después de aplicar 20261023_rgpd.sql ejecuta bloque9_11_rgpd.sql: todo debe salir OK.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()

// ANTES: el borrado actual
await db.exec(`
  begin;
  alter table public.entrenadores disable trigger welcome_email_trigger;
  insert into public.entrenadores (uid, email, "displayName", approved) values ('aaaaaaaa-0000-0000-0000-000000000001', 't@test.local', 'T', true);
  insert into public.clientes (id, "trainerId", name, token) values ('c1c1c1c1-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'C', 'tok');
  insert into public.registros_dolor (id, "clientId", date, zona, intensidad, created_at) values ('d1', 'c1c1c1c1-0000-0000-0000-000000000001', '2026-10-01', 'lumbar', 3, 1);
  insert into public.valoraciones (id, client_id, trainer_id, fecha) values ('v1', 'c1c1c1c1-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-01');
  delete from public.clientes where id = 'c1c1c1c1-0000-0000-0000-000000000001';
`)
const huerfanas = (await db.query(`select (select count(*) from public.registros_dolor) + (select count(*) from public.valoraciones) as n`)).rows[0].n
await db.exec('rollback')
console.log(`ANTES: tras borrar solo la fila de clientes quedan ${huerfanas} filas de salud huérfanas (se esperan 2)\n`)

await db.exec(read('hardening/20261023_rgpd.sql'))
console.log('bloques 9 a 11 aplicados\n')

const res = await db.exec(read('hardening/tests/bloque9_11_rgpd.sql'))
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 90) })))
const todoOk = r.rows.every(x => x.resultado === 'OK')
console.log(todoOk ? 'después: todo OK' : 'después: HAY FALLOS')

await db.close()
process.exitCode = Number(huerfanas) === 2 && todoOk ? 0 : 1
