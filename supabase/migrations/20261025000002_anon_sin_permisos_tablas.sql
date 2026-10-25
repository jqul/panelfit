-- Bloque 6 de hardening (2026-10-25): `anon` pierde los privilegios directos sobre las tablas de public.
--
-- Supabase da por defecto a `anon` todos los privilegios sobre todas las tablas y solo RLS los frenaba:
-- si algún día una tabla nueva se creaba sin RLS, o una política se escribía mal, quedaba abierta a
-- cualquiera con la clave pública. Antes de aplicarlo se comprobó en producción que no cambia ningún
-- flujo: las 47 tablas tienen RLS y todas las políticas que alcanzan a `anon` dependen de auth.uid()
-- (no devuelven nada sin sesión) salvo plan_templates públicas, cuyo SELECT se conserva. El flujo sin
-- sesión (enlace del cliente, página pública, alta de leads) pasa por funciones SECURITY DEFINER, que
-- no dependen de los privilegios de `anon` sobre las tablas.
--
-- Prueba: hardening/tests/bloque6_anon.sql (run-pglite-anon.mjs). `authenticated` no cambia.

revoke all on all tables in schema public from anon;
grant select on public.plan_templates to anon;   -- política anyone_reads_public_plan_templates

-- Las tablas que se creen a partir de ahora tampoco se abren a `anon` por defecto.
alter default privileges in schema public revoke all on tables from anon;
