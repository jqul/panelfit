-- Prueba de migrations/20261027000001_ausencias_y_eventos.sql
-- (el cliente y su entrenador —o un compañero de su equipo— ven y escriben las ausencias y eventos de ESE
-- cliente; nadie más; sin sesión, nada; y las dos tablas entran en el RGPD y caen en cascada).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración (antes las tablas no existen).
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja datos.

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
insert into public.ausencias (client_id, desde, hasta, motivo) values
  ('11111111-0000-0000-0000-000000000001', '2026-11-14', '2026-11-18', 'viaje'),
  ('22222222-0000-0000-0000-000000000002', '2026-11-01', '2026-11-03', 'trabajo');
insert into public.eventos_cliente (client_id, fecha, nombre, prioridad) values
  ('11111111-0000-0000-0000-000000000001', '2026-12-06', 'Media maratón', 'A'),
  ('22222222-0000-0000-0000-000000000002', '2026-12-20', 'Hyrox', 'A');

-- ── El cliente 1 (su cuenta) ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultados select 'A1 el cliente ve sus ausencias y no las de otro', count(*) = 1 and bool_and(motivo = 'viaje'), count(*)::text || ' filas' from public.ausencias;
insert into resultados select 'E1 el cliente ve sus eventos y no los de otro', count(*) = 1 and bool_and(nombre = 'Media maratón'), count(*)::text || ' filas' from public.eventos_cliente;
do $$
declare ok boolean := false; n int;
begin
  insert into public.ausencias (client_id, desde, hasta, motivo) values ('11111111-0000-0000-0000-000000000001', '2026-12-24', '2026-12-26', 'otro');
  select count(*) into n from public.ausencias;
  insert into resultados values ('A2 el cliente puede avisar de una ausencia suya', n = 2, n::text || ' filas');
  begin
    insert into public.ausencias (client_id, desde, hasta) values ('22222222-0000-0000-0000-000000000002', '2026-12-01', '2026-12-02');
  exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('A3 el cliente no puede crear ausencias de otro cliente', ok, case when ok then 'denegado' else 'pudo crear' end);
  ok := false;
  begin
    insert into public.eventos_cliente (client_id, fecha, nombre) values ('22222222-0000-0000-0000-000000000002', '2026-12-01', 'Intruso');
  exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('E2 el cliente no puede crear eventos de otro cliente', ok, case when ok then 'denegado' else 'pudo crear' end);
  ok := false;
  begin
    insert into public.ausencias (client_id, desde, hasta) values ('11111111-0000-0000-0000-000000000001', '2026-12-10', '2026-12-01');
  exception when check_violation then ok := true; end;
  insert into resultados values ('A4 "hasta" no puede ser anterior a "desde"', ok, case when ok then 'rechazado' else 'aceptado' end);
end $$;
reset role;

-- ── El entrenador 1, su compañero y el entrenador 2 ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultados select 'A5 el entrenador ve las ausencias de su cliente y no las de otros', count(*) = 2 and bool_and(client_id = '11111111-0000-0000-0000-000000000001'), count(*)::text || ' filas' from public.ausencias;
do $$
declare n int;
begin
  insert into public.eventos_cliente (client_id, fecha, nombre, prioridad) values ('11111111-0000-0000-0000-000000000001', '2027-03-01', 'Test de 5 km', 'B');
  select count(*) into n from public.eventos_cliente;
  insert into resultados values ('E3 el entrenador puede poner un evento a su cliente', n = 2, n::text || ' filas');
end $$;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into resultados select 'A6 un compañero del equipo ve las del cliente del equipo', count(*) = 2, count(*)::text || ' filas' from public.ausencias;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into resultados select 'A7 otro entrenador solo ve las de su cliente', count(*) = 1 and bool_and(client_id = '22222222-0000-0000-0000-000000000002'), count(*)::text || ' filas' from public.ausencias;
do $$
declare n int;
begin
  delete from public.ausencias where client_id = '11111111-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  insert into resultados values ('A8 otro entrenador no puede borrar las ausencias ajenas', n = 0, n::text || ' borradas');
end $$;
reset role;

-- ── Sin sesión, nada ──
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$
declare n int := -1; ok boolean := false;
begin
  begin select count(*) into n from public.ausencias; ok := (n = 0); exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('A9 sin sesión no se ven ausencias', ok, case when n = -1 then 'denegado' else n::text || ' filas' end);
  n := -1; ok := false;
  begin select count(*) into n from public.eventos_cliente; ok := (n = 0); exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('E4 sin sesión no se ven eventos', ok, case when n = -1 then 'denegado' else n::text || ' filas' end);
end $$;
reset role;

-- ── RGPD y cascada ──
insert into resultados select 'R1 las dos tablas están en client_data_tables (exportación y borrado)',
  count(*) = 2, string_agg(tbl, ', ') from public.client_data_tables() where tbl in ('ausencias', 'eventos_cliente');
delete from public.clientes where id = '22222222-0000-0000-0000-000000000002';
insert into resultados select 'R2 borrar un cliente borra sus ausencias y eventos',
  (select count(*) from public.ausencias where client_id = '22222222-0000-0000-0000-000000000002') = 0
  and (select count(*) from public.eventos_cliente where client_id = '22222222-0000-0000-0000-000000000002') = 0, 'cascada';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
