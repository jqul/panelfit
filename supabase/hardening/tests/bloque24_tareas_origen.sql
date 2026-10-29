-- Prueba de migrations/20261029000004_tareas_origen_programa.sql
-- (el entrenador crea tareas con origen y quita solo las de su cliente; el cliente no crea ni borra; el origen tiene
-- un tamaño máximo; las políticas de tareas_cliente siguen igual).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente de 1', 'tok-1', 'cccccccc-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Cliente de 2', 'tok-2', null);
insert into public.tareas_cliente (id, client_id, titulo, fecha, origen) values
  ('99999999-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Del programa de otro', '2026-11-03', 'programa:p2');

-- ── El entrenador 1 pone y quita tareas de programa de su cliente; no toca las del otro ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare n int; ok boolean := false;
begin
  insert into public.tareas_cliente (client_id, titulo, tipo, fecha, origen) values
    ('11111111-0000-0000-0000-000000000001', 'Correr 30 min', 'cardio', '2026-11-03', 'programa:p1'),
    ('11111111-0000-0000-0000-000000000001', 'A mano', 'tarea', '2026-11-03', null);
  select count(*) into n from public.tareas_cliente where origen = 'programa:p1';
  insert into resultados values ('O1 el entrenador crea tareas con origen de programa', n = 1, n::text || ' filas');
  delete from public.tareas_cliente where origen like 'programa:%';
  get diagnostics n = row_count;
  insert into resultados values ('O2 al quitar las de programa solo borra las de su cliente (no las de otros ni las puestas a mano)', n = 1, n::text || ' borradas');
  select count(*) into n from public.tareas_cliente where titulo = 'A mano';
  insert into resultados values ('O3 las tareas puestas a mano siguen', n = 1, n::text || ' filas');
  begin
    insert into public.tareas_cliente (client_id, titulo, fecha, origen) values ('11111111-0000-0000-0000-000000000001', 'Larga', '2026-11-03', repeat('x', 81));
  exception when check_violation then ok := true;
  end;
  insert into resultados values ('O4 el origen tiene un tamaño máximo', ok, 'check');
end $$;
reset role;
insert into resultados select 'O5 la del otro entrenador sigue', count(*) = 1, count(*)::text || ' filas' from public.tareas_cliente where client_id = '22222222-0000-0000-0000-000000000002';

-- ── El cliente no crea tareas de programa ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false;
begin
  begin
    insert into public.tareas_cliente (client_id, titulo, fecha, origen) values ('11111111-0000-0000-0000-000000000001', 'Me la invento', '2026-11-03', 'programa:p1');
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('C1 el cliente no crea tareas (tampoco de programa)', ok, 'RLS');
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
