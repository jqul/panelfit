// Runner local de la prueba del bloque 1, sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite.mjs
//
// Carga el baseline en un Postgres en memoria (PGlite), ejecuta bloque1_entrenadores.sql
// antes y después de aplicar el bloque 1 de la propuesta, y compara una huella del
// esquema con la de producción (2026-10-18). Sale con código 1 si algo falla.
import fs from 'node:fs'
import path from 'node:path'
import { crearBase, read, supabaseDir } from './pglite-base.mjs'

const db = await crearBase()

// Huellas del esquema `public` en producción (2026-10-18). Las restricciones NOT NULL
// no se comparan: PG18 (PGlite) las lista en pg_constraint y PG17 (Supabase) no.
const prod = {
  cols: '6329f9bb70e96346798684b6ee688805', pols: '66dcb389579323aeed320bc5fe1d110d',
  cons: '04c222e640883b412ec27286398dde20', idx: 'd939f885860ec89b6734fd80d3e052c2',
  fns: '2b70490b3286a3b297debccb389162df', rls_tablas: '620897b678bb9ff5412cd8698b064581',
}
const fp = (await db.query(`select
 (select md5(string_agg(c.relname||'.'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text, ',' order by c.relname,a.attnum)) from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped) as cols,
 (select md5(string_agg(tablename||'.'||policyname||'.'||cmd||'.'||roles::text, ',' order by tablename,policyname)) from pg_policies where schemaname='public') as pols,
 (select md5(string_agg(c.relname||'.'||k.conname||'.'||k.contype::text, ',' order by c.relname,k.conname)) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and k.contype <> 'n') as cons,
 (select md5(string_agg(indexname, ',' order by indexname)) from pg_indexes where schemaname='public') as idx,
 (select md5(string_agg(p.proname, ',' order by p.proname)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')) as fns,
 (select md5(string_agg(c.relname, ',' order by c.relname)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity) as rls_tablas`)).rows[0]

let fallos = 0
for (const k of Object.keys(prod)) {
  const ok = fp[k] === prod[k]
  if (!ok) fallos++
  console.log(`huella ${k}: ${ok ? 'COINCIDE con producción' : 'DIFIERE de producción'}`)
}
console.log()

const test = fs.readFileSync(path.join(supabaseDir, 'hardening/tests/bloque1_entrenadores.sql'), 'utf8').replace(/\r\n/g, '\n')
async function correr(titulo) {
  const res = await db.exec(test)
  const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
  console.log(`── ${titulo} ──`)
  console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
  return r.rows
}

const antes = await correr('ANTES de aplicar el bloque 1 (se esperan FALLO en A1-A4)')
const esperadoAntes = antes.every(x => /^A[1-4]\b/.test(x.caso) ? x.resultado === 'FALLO' : x.resultado === 'OK')
console.log(esperadoAntes ? 'antes: la vulnerabilidad se reproduce, como se esperaba\n' : 'antes: resultado inesperado\n')

const hard = read('hardening/20261018_propuesta_endurecimiento.sql')
await db.exec(hard.slice(hard.indexOf('create or replace function public.protect_entrenadores'), hard.indexOf('-- 2 · ')))
console.log('bloque 1 aplicado\n')

const despues = await correr('DESPUÉS de aplicar el bloque 1 (se esperan todos OK)')
const todoOk = despues.every(x => x.resultado === 'OK')
console.log(todoOk ? 'después: todo OK' : 'después: HAY FALLOS')

// Cerrar la base antes de salir: process.exit() directo tras PGlite provoca un fallo de libuv en Windows.
await db.close()
process.exitCode = fallos === 0 && esperadoAntes && todoOk ? 0 : 1
