-- Prueba de migrations/20261030000005_profesional_cliente.sql
-- (el profesional asignado solo puede ser el dueño o alguien de su equipo; si alguien deja el equipo, sus clientes
-- quedan sin asignar; profesionales_del_equipo solo responde a quien es del equipo; get_client_by_token sigue
-- funcionando con la columna nueva y no la enseña).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
-- El 1 es el dueño; el 2, de su equipo; el 3, de fuera
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Dueño', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Compañera', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 't3@test.local', 'De fuera', true, 'trainer', 'trainer');
insert into public.team_members (owner_id, member_uid, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 0);
insert into public.clientes (id, "trainerId", name, token) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 1', 'tok-1'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 2', 'tok-2');

-- ── Quién puede ser el profesional asignado ──
update public.clientes set profesional_id = 'aaaaaaaa-0000-0000-0000-000000000002' where id = '11111111-0000-0000-0000-000000000001';
update public.clientes set profesional_id = 'aaaaaaaa-0000-0000-0000-000000000001' where id = '11111111-0000-0000-0000-000000000002';
insert into resultados select 'A1 se asigna a una compañera del equipo y al propio dueño', count(*) = 2, count(*)::text from public.clientes where profesional_id is not null;
do $$
declare ok boolean := false;
begin
  begin
    update public.clientes set profesional_id = 'aaaaaaaa-0000-0000-0000-000000000003' where id = '11111111-0000-0000-0000-000000000002';
  exception when check_violation then ok := true;
  end;
  insert into resultados values ('A2 no se asigna a alguien de fuera del equipo', ok, 'check');
end $$;

-- ── get_client_by_token sigue funcionando y no enseña el profesional ──
insert into resultados select 'G1 get_client_by_token devuelve al cliente sin su profesional', count(*) = 1 and bool_and(profesional_id is null), count(*)::text || ' fila'
  from public.get_client_by_token('tok-1');

-- ── profesionales_del_equipo ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into resultados select 'P1 la compañera ve al dueño (primero) y a sí misma', count(*) = 2 and (array_agg(nombre))[1] = 'Dueño', string_agg(nombre, ', ')
  from public.profesionales_del_equipo('aaaaaaaa-0000-0000-0000-000000000001');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into resultados select 'P2 alguien de fuera no ve el equipo', count(*) = 0, count(*)::text || ' filas'
  from public.profesionales_del_equipo('aaaaaaaa-0000-0000-0000-000000000001');
reset role;
set local role anon;
do $$
declare ok boolean := false;
begin
  begin
    perform public.profesionales_del_equipo('aaaaaaaa-0000-0000-0000-000000000001');
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('P3 sin sesión no se puede preguntar', ok, 'sin permiso');
end $$;
reset role;

-- ── Al dejar el equipo, sus clientes quedan sin asignar (los del dueño, no) ──
delete from public.team_members where member_uid = 'aaaaaaaa-0000-0000-0000-000000000002';
insert into resultados select 'E1 la cliente de la compañera queda sin asignar', profesional_id is null, coalesce(profesional_id::text, 'sin asignar') from public.clientes where id = '11111111-0000-0000-0000-000000000001';
insert into resultados select 'E2 la del dueño sigue asignada', profesional_id = 'aaaaaaaa-0000-0000-0000-000000000001', coalesce(profesional_id::text, 'sin asignar') from public.clientes where id = '11111111-0000-0000-0000-000000000002';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
