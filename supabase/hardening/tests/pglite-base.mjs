// Base común de las pruebas locales con PGlite (Postgres en memoria, sin Supabase).
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const supabaseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const read = p => fs.readFileSync(path.join(supabaseDir, p), 'utf8').replace(/\r\n/g, '\n')

// Entorno mínimo que imita a Supabase (roles, auth.uid(), auth.users y los privilegios por
// defecto: anon/authenticated con acceso a todo; solo RLS lo frena) y el baseline del repo,
// sin las extensiones de Supabase ni el cron (PGlite no los tiene).
export async function crearBase() {
  const db = new PGlite()
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
             (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid
    $$;
    grant usage on schema auth, public to anon, authenticated;
    -- Supabase concede estos privilegios por defecto a lo que se cree después en public.
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `)
  const tables = read('migrations/20261018000001_baseline_tables.sql').replace(/^create extension .*$/gm, '')
  let funcs = read('migrations/20261018000002_baseline_functions_triggers.sql')
  funcs = funcs.slice(0, funcs.indexOf('-- Tarea programada'))
  const policies = read('migrations/20261018000003_baseline_rls_policies.sql')
  for (const [name, sql] of [['tablas', tables], ['funciones y triggers', funcs], ['políticas RLS', policies]]) {
    try { await db.exec(sql); console.log(`baseline ${name}: OK`) }
    catch (e) { console.error(`baseline ${name}: ERROR -> ${e.message}`); await db.close(); process.exitCode = 1; throw e }
  }
  await db.exec(`
    grant all on all tables in schema public to anon, authenticated;
    grant execute on all functions in schema public to anon, authenticated;
  `)
  return db
}
