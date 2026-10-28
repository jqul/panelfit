-- Prueba de migrations/20261028000004_tareas_cliente.sql
-- (el entrenador —o su equipo— pone tareas con fecha a SU cliente; el cliente las ve pero no las crea ni cambia;
-- el cliente las marca hechas, solo las suyas; nadie más ve nada; sin sesión, nada; RGPD y cascada).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;

-- Entrenadores 1 y 2; el 3 es compañero del equipo del 1. Cliente 1 (con cuenta c1) es del 1; cliente 2, del 2.
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 't3@test.local', 'Compañero de 1', true, 'trainer', 'trainer');
insert into public.team_members (owner_id, member_uid, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 0);
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente de 1', 'tok-1', 'cccccccc-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Cliente de 2', 'tok-2', null);
insert into public.tareas_cliente (id, client_id, titulo, fecha, repetir, dias) values
  ('99999999-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Tarea del cliente 2', '2026-11-02', 'una', '{}');

-- ── El entrenador 1 crea tareas para su cliente ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false; n int;
begin
  insert into public.tareas_cliente (id, client_id, titulo, tipo, fecha, repetir, dias) values
    ('99999999-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Caminar 30 min', 'cardio', '2026-11-03', 'semanal', '{1,3}');
  select count(*) into n from public.tareas_cliente;
  insert into resultados values ('T1 el entrenador crea una tarea semanal a su cliente y solo ve las suyas', n = 1, n::text || ' filas');
  begin
    insert into public.tareas_cliente (client_id, titulo, fecha) values ('22222222-0000-0000-0000-000000000002', 'Intrusa', '2026-11-03');
  exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('T2 no puede poner tareas a un cliente de otro entrenador', ok, case when ok then 'denegado' else 'pudo' end);
  ok := false;
  begin
    insert into public.tareas_cliente (client_id, titulo, fecha, repetir, dias) values ('11111111-0000-0000-0000-000000000001', 'Sin días', '2026-11-03', 'semanal', '{}');
  exception when check_violation then ok := true; end;
  insert into resultados values ('T3 una tarea semanal necesita al menos un día', ok, case when ok then 'rechazada' else 'aceptada' end);
  ok := false;
  begin
    insert into public.tareas_cliente (client_id, titulo, fecha, enlace) values ('11111111-0000-0000-0000-000000000001', 'Vídeo', '2026-11-03', 'javascript:alert(1)');
  exception when check_violation then ok := true; end;
  insert into resultados values ('T4 el enlace tiene que ser https', ok, case when ok then 'rechazado' else 'aceptado' end);
end $$;

-- ── Su compañero de equipo ──
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
do $$
declare n int;
begin
  update public.tareas_cliente set titulo = 'Caminar 40 min' where id = '99999999-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  insert into resultados values ('T5 un compañero del equipo puede cambiar la tarea', n = 1, n::text || ' cambiadas');
end $$;

-- ── El cliente 1 ──
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultados select 'T6 el cliente ve sus tareas y no las de otro', count(*) = 1 and bool_and(titulo = 'Caminar 40 min'), count(*)::text || ' filas' from public.tareas_cliente;
do $$
declare ok boolean := false; n int;
begin
  begin
    insert into public.tareas_cliente (client_id, titulo, fecha) values ('11111111-0000-0000-0000-000000000001', 'Me la pongo yo', '2026-11-03');
  exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('T7 el cliente no puede crearse tareas', ok, case when ok then 'denegado' else 'pudo' end);
  update public.tareas_cliente set titulo = 'Nada' where id = '99999999-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  insert into resultados values ('T8 el cliente no puede cambiar la tarea', n = 0, n::text || ' cambiadas');
  delete from public.tareas_cliente where id = '99999999-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  insert into resultados values ('T9 el cliente no puede borrar la tarea', n = 0, n::text || ' borradas');

  insert into public.tareas_hechas (tarea_id, client_id, fecha) values ('99999999-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '2026-11-03');
  select count(*) into n from public.tareas_hechas;
  insert into resultados values ('H1 el cliente marca hecha su tarea', n = 1, n::text || ' filas');
  delete from public.tareas_hechas where tarea_id = '99999999-0000-0000-0000-000000000001' and fecha = '2026-11-03';
  get diagnostics n = row_count;
  insert into resultados values ('H2 y la puede desmarcar', n = 1, n::text || ' borradas');
  ok := false;
  begin
    -- La tarea del cliente 2, a nombre del cliente 1: no
    insert into public.tareas_hechas (tarea_id, client_id, fecha) values ('99999999-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '2026-11-02');
  exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('H3 no puede marcar una tarea que no es suya', ok, case when ok then 'denegado' else 'pudo' end);
  ok := false;
  begin
    insert into public.tareas_hechas (tarea_id, client_id, fecha) values ('99999999-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', '2026-11-02');
  exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('H4 ni marcarla en nombre de otro cliente', ok, case when ok then 'denegado' else 'pudo' end);
end $$;

-- ── Otro entrenador ──
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare n int;
begin
  select count(*) into n from public.tareas_cliente where client_id = '11111111-0000-0000-0000-000000000001';
  insert into resultados values ('T10 otro entrenador no ve las tareas ajenas', n = 0, n::text || ' filas');
  delete from public.tareas_cliente where id = '99999999-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  insert into resultados values ('T11 ni las puede borrar', n = 0, n::text || ' borradas');
end $$;
reset role;

-- ── Sin sesión ──
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$
declare n int := -1; ok boolean := false;
begin
  begin select count(*) into n from public.tareas_cliente; ok := (n = 0); exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('T12 sin sesión no se ven tareas', ok, case when n = -1 then 'denegado' else n::text || ' filas' end);
end $$;
reset role;

-- ── RGPD y cascada ──
insert into public.tareas_hechas (tarea_id, client_id, fecha) values ('99999999-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '2026-11-05');
insert into resultados select 'R1 las dos tablas están en client_data_tables (exportación y borrado)',
  count(*) = 2, string_agg(tbl, ', ') from public.client_data_tables() where tbl in ('tareas_cliente', 'tareas_hechas');
delete from public.tareas_cliente where id = '99999999-0000-0000-0000-000000000001';
insert into resultados select 'R2 borrar la tarea borra sus marcas de hecha', count(*) = 0, count(*)::text || ' filas' from public.tareas_hechas;
delete from public.clientes where id = '22222222-0000-0000-0000-000000000002';
insert into resultados select 'R3 borrar un cliente borra sus tareas', count(*) = 0, 'cascada' from public.tareas_cliente where client_id = '22222222-0000-0000-0000-000000000002';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
