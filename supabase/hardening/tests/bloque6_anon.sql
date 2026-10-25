-- Prueba de migrations/20261025000002_anon_sin_permisos_tablas.sql
-- (anon sin privilegios sobre las tablas, sin romper el flujo sin sesión ni a los usuarios con sesión).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;

insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into public.clientes (id, "trainerId", name, token) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente Uno', 'tok-uno');
insert into public.plan_templates (id, trainer_id, name, plan, is_public, created_at, updated_at) values
  ('pub-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'Plantilla pública', '{}', true, 1, 1),
  ('priv-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'Plantilla privada', '{}', false, 1, 1);

-- ── anon (sin sesión) ──
set local role anon;
do $$
declare ok boolean := false;
begin
  begin perform count(*) from public.clientes; exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('Z1 anon no puede ni leer la tabla clientes', ok, case when ok then 'permission denied' else 'pudo leer' end);
  ok := false;
  begin insert into public.clientes (id, "trainerId", name, token) values ('99999999-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001', 'X', 'x'); exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('Z2 anon no puede insertar en clientes', ok, case when ok then 'permission denied' else 'pudo insertar' end);
  ok := false;
  begin perform count(*) from public.registros_dolor; exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('Z3 anon no puede leer datos de salud', ok, case when ok then 'permission denied' else 'pudo leer' end);
end $$;
insert into resultados select 'Z4 anon sigue viendo solo las plantillas públicas', count(*) = 1 and bool_and(is_public), count(*)::text || ' filas' from public.plan_templates;
insert into resultados select 'Z5 el enlace del cliente (RPC) sigue funcionando sin sesión', count(*) = 1, count(*)::text || ' filas' from public.get_client_by_token('tok-uno');
reset role;

-- ── entrenador con sesión: no cambia nada ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultados select 'Z6 el entrenador sigue leyendo a sus clientes', count(*) = 1, count(*)::text || ' filas' from public.clientes;
insert into resultados select 'Z7 el entrenador sigue viendo sus plantillas (públicas y privadas)', count(*) = 2, count(*)::text || ' filas' from public.plan_templates;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
