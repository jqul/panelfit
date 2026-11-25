// Runner local de la prueba de los archivos en los cuestionarios (permisos, reserva, triggers, retención y RGPD), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-archivos.mjs
//
// PGlite no tiene el esquema storage de Supabase: se crea uno mínimo (buckets, objects con RLS, restricción de nombre único y storage.foldername) para probar las políticas del
// depósito con las mismas expresiones que usará Supabase. Aplica las migraciones de las que depende y la nueva (sin su línea de cron.schedule: PGlite no tiene cron) y ejecuta
// la prueba: todo debe salir OK. Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
await db.exec(`
  create schema storage;
  grant usage on schema storage to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, created_at timestamptz not null default now(), unique (bucket_id, name));
  alter table storage.objects enable row level security;
  grant all on storage.objects to anon, authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
  insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false);
`)

const MIGRACIONES = [
  '20261023000007_rgpd_consentimientos.sql', '20261023000008_rgpd_exportar_datos_cliente.sql', '20261023000009_rgpd_borrado_completo_cliente.sql',
  '20261023000004_separar_politica_clientes.sql', '20261024000001_enlace_caducidad.sql', '20261026000002_archivar_clientes.sql', '20261028000001_cuestionarios_cliente.sql',
  '20261029000002_recordatorio_diario.sql', '20261030000004_bonos_cliente.sql', '20261030000005_profesional_cliente.sql', '20261030000008_permisos_equipo.sql', '20261125000010_archivos_cuestionario.sql',
]
for (const m of MIGRACIONES) {
  let sql = read(`migrations/${m}`)
  sql = sql.slice(0, sql.includes('-- Tarea programada') ? sql.indexOf('-- Tarea programada') : sql.length)
  try { await db.exec(sql) } catch (e) { console.error(`ERROR en ${m}: ${String(e.message).slice(0, 300)}`); process.exit(1) }
  console.log(`migración aplicada: ${m}`)
}

let res
try { res = await db.exec(read('hardening/tests/bloque50_archivos.sql')) } catch (e) { console.error(`ERROR en la prueba: ${String(e.message).slice(0, 400)}`); process.exit(1) }
const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
r.rows.sort((a, b) => a.caso.localeCompare(b.caso, 'es', { numeric: true }))
console.table(r.rows.map(x => ({ caso: x.caso, resultado: x.resultado, detalle: String(x.detalle).slice(0, 80) })))
const ok = r.rows.every(x => x.resultado === 'OK')
console.log(ok ? `todo OK (${r.rows.length} casos)` : `HAY FALLOS: ${r.rows.filter(x => x.resultado !== 'OK').length} de ${r.rows.length}`)

await db.close()
process.exitCode = ok ? 0 : 1
