-- Prueba de migrations/20261029000003_nota_antes_sesion.sql
-- (el cliente escribe y cambia solo su nota; la leen él, su entrenador y el equipo; otro entrenador no; sin sesión,
-- nada; el entrenador no la escribe por él; una por día; RGPD y cascada).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;

-- Entrenadores 1 y 2; el 3 es compañero del equipo del 1. Cliente 1 (cuenta c1) es del 1; cliente 2 (cuenta c2), del 2.
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 't3@test.local', 'Compañero de 1', true, 'trainer', 'trainer');
insert into public.team_members (owner_id, member_uid, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 0);
insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local'),
  ('cccccccc-0000-0000-0000-000000000002', 'c2@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente de 1', 'tok-1', 'cccccccc-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Cliente de 2', 'tok-2', 'cccccccc-0000-0000-0000-000000000002');

-- ── El cliente 1 escribe y cambia la suya; no puede escribir la del cliente 2 ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false; n int;
begin
  insert into public.notas_antes_sesion (client_id, fecha, dia, nota) values ('11111111-0000-0000-0000-000000000001', '2026-11-03', 'Día A', 'He dormido 5 horas');
  update public.notas_antes_sesion set nota = 'He dormido 6 horas' where client_id = '11111111-0000-0000-0000-000000000001';
  select count(*) into n from public.notas_antes_sesion where nota = 'He dormido 6 horas';
  insert into resultados values ('N1 el cliente escribe y cambia su nota', n = 1, n::text || ' filas');
  begin
    insert into public.notas_antes_sesion (client_id, fecha, nota) values ('22222222-0000-0000-0000-000000000002', '2026-11-03', 'Intrusa');
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('N2 no puede escribir la de otro cliente', ok, 'RLS');
  ok := false;
  begin
    insert into public.notas_antes_sesion (client_id, fecha, nota) values ('11111111-0000-0000-0000-000000000001', '2026-11-03', 'Otra el mismo día');
  exception when unique_violation then ok := true;
  end;
  insert into resultados values ('N3 una por día (si la cambia, se sustituye)', ok, 'clave primaria');
  ok := false;
  begin
    insert into public.notas_antes_sesion (client_id, fecha, nota) values ('11111111-0000-0000-0000-000000000001', '2026-11-04', '   ');
  exception when check_violation then ok := true;
  end;
  insert into resultados values ('N4 no se guarda una nota vacía', ok, 'check');
end $$;
reset role;

-- El cliente 2 escribe la suya (para comprobar que el entrenador 1 no la ve)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into public.notas_antes_sesion (client_id, fecha, nota) values ('22222222-0000-0000-0000-000000000002', '2026-11-03', 'Me molesta el hombro');
do $$
declare n int;
begin
  select count(*) into n from public.notas_antes_sesion;
  insert into resultados values ('N5 cada cliente solo ve la suya', n = 1, n::text || ' filas');
end $$;
reset role;

-- ── Su entrenador y el equipo la leen; no la escriben; el otro entrenador no la ve ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from public.notas_antes_sesion;
  insert into resultados values ('E1 el entrenador ve la de su cliente y no la de otros', n = 1, n::text || ' filas');
  begin
    insert into public.notas_antes_sesion (client_id, fecha, nota) values ('11111111-0000-0000-0000-000000000001', '2026-11-05', 'Escrita por el entrenador');
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('E2 el entrenador no escribe en nombre del cliente', ok, 'RLS');
  update public.notas_antes_sesion set nota = 'cambiada' where client_id = '11111111-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  insert into resultados values ('E3 el entrenador no cambia la nota', n = 0, n::text || ' filas');
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into resultados select 'E4 el compañero de equipo la ve', count(*) = 1, count(*)::text || ' filas' from public.notas_antes_sesion;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into resultados select 'E5 otro entrenador solo ve la de su cliente', count(*) = 1 and bool_and(client_id = '22222222-0000-0000-0000-000000000002'), count(*)::text || ' filas' from public.notas_antes_sesion;
reset role;

-- ── Sin sesión, nada ──
set local role anon;
do $$
declare ok boolean := false; n int;
begin
  begin
    select count(*) into n from public.notas_antes_sesion;
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('S1 sin sesión no se ve nada', ok, 'sin permiso');
end $$;
reset role;

-- ── RGPD y cascada ──
insert into resultados select 'R1 está en client_data_tables', count(*) = 1, 'RGPD' from public.client_data_tables() where tbl = 'notas_antes_sesion';
delete from public.clientes where id = '22222222-0000-0000-0000-000000000002';
insert into resultados select 'R2 borrar un cliente borra sus notas', count(*) = 0, 'cascada' from public.notas_antes_sesion where client_id = '22222222-0000-0000-0000-000000000002';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
