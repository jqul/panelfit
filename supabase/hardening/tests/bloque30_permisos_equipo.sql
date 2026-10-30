-- Prueba de migrations/20261030000008_permisos_equipo.sql
-- (sin restricción, el compañero ve todos los clientes del dueño, como antes; con "solo sus clientes", solo ve y toca
-- los asignados a él, y tampoco los planes, citas ni bonos de los demás; lo que crea queda asignado a él; no puede
-- pasarle un cliente a otro; el dueño lo sigue viendo todo; el compañero lee sus propios permisos).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
-- 1 = dueño; 2 = compañera (Laura)
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Dueño', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Laura', true, 'trainer', 'trainer');
insert into public.team_members (owner_id, member_uid, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 0);
-- Ana es de Laura; Bea, del dueño; Carla, sin asignar
insert into public.clientes (id, "trainerId", name, token, profesional_id) values
  ('11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'tok-a', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('11111111-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', 'Bea', 'tok-b', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-000000000001', 'Carla', 'tok-c', null);
insert into public.planes ("clientId", plan, "updatedAt") values
  ('11111111-0000-0000-0000-00000000000a', '{}', 1), ('11111111-0000-0000-0000-00000000000b', '{}', 1);
insert into public.citas (trainer_id, client_id, start_at, end_at, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-00000000000a', now() + interval '1 day', now() + interval '1 day 1 hour', 'confirmada'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-00000000000b', now() + interval '2 days', now() + interval '2 days 1 hour', 'confirmada'),
  ('aaaaaaaa-0000-0000-0000-000000000001', null, now() + interval '3 days', now() + interval '3 days 1 hour', 'confirmada');
insert into public.bonos_cliente (trainer_id, client_id, nombre, sesiones) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-00000000000a', 'Bono Ana', 5),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-00000000000b', 'Bono Bea', 5);

-- ── Sin restricción: como antes ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into resultados select 'L1 sin restricción, la compañera ve todos los clientes del dueño', count(*) = 3, count(*)::text from public.clientes;
insert into resultados select 'L2 y lee sus propios permisos', solo_asignados = false and ver_negocio = true, 'por defecto' from public.team_members where member_uid = 'aaaaaaaa-0000-0000-0000-000000000002';
reset role;

-- ── Con "solo sus clientes" ──
update public.team_members set solo_asignados = true where member_uid = 'aaaaaaaa-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare n int; ok boolean := false; nuevo uuid;
begin
  select count(*) into n from public.clientes;
  insert into resultados values ('R1 solo ve a su clienta', n = 1, n::text);
  select count(*) into n from public.planes;
  insert into resultados values ('R2 solo ve el plan de su clienta', n = 1, n::text);
  select count(*) into n from public.citas;
  insert into resultados values ('R3 solo las citas de su clienta y los bloqueos sin cliente', n = 2, n::text);
  select count(*) into n from public.bonos_cliente;
  insert into resultados values ('R4 solo el bono de su clienta', n = 1, n::text);
  update public.planes set "updatedAt" = 2 where "clientId" = '11111111-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  insert into resultados values ('R5 no puede cambiar el plan de otra', n = 0, n::text || ' filas');

  insert into public.clientes ("trainerId", name, token) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Nueva', 'tok-n') returning id into nuevo;
  select count(*) into n from public.clientes where id = nuevo and profesional_id = 'aaaaaaaa-0000-0000-0000-000000000002';
  insert into resultados values ('R6 la clienta que crea queda asignada a ella', n = 1, n::text);

  begin
    update public.clientes set profesional_id = 'aaaaaaaa-0000-0000-0000-000000000001' where id = '11111111-0000-0000-0000-00000000000a';
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('R7 no puede pasarle su clienta a otro (dejaría de verla)', ok, 'RLS');
end $$;
reset role;

-- ── El dueño lo sigue viendo todo ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultados select 'D1 el dueño ve todos sus clientes', count(*) = 4, count(*)::text from public.clientes;
insert into resultados select 'D2 y todas sus citas', count(*) = 3, count(*)::text from public.citas;
reset role;

-- ── Quitar la restricción lo devuelve todo ──
update public.team_members set solo_asignados = false;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into resultados select 'Q1 sin la restricción vuelve a verlos todos', count(*) = 4, count(*)::text from public.clientes;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
