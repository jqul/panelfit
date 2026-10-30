-- Prueba de migrations/20261030000004_bonos_cliente.sql
-- (el entrenador crea bonos solo para sus clientes; el cliente ve los suyos y no los crea; cada cita nueva descuenta
-- del bono activo; las canceladas no cuentan; un bono agotado o caducado no se usa; nadie descuenta de un bono ajeno;
-- RGPD y cascada).
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
insert into public.bonos_cliente (id, trainer_id, client_id, nombre, sesiones) values
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Bono del otro', 5);

-- ── El entrenador 1 ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false; n int;
begin
  -- Un bono de 2 sesiones que caduca dentro de 30 días y otro sin caducidad
  insert into public.bonos_cliente (id, trainer_id, client_id, nombre, sesiones, caduca) values
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Bono 2', 2, (now() + interval '30 days')::date),
    ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Bono sin fecha', 10, null);
  select count(*) into n from public.bonos_cliente;
  insert into resultados values ('B1 el entrenador crea bonos a su cliente y solo ve los suyos', n = 2, n::text || ' filas');
  begin
    insert into public.bonos_cliente (trainer_id, client_id, nombre, sesiones) values ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'Intruso', 5);
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('B2 no puede crear un bono a un cliente de otro', ok, 'RLS');
end $$;

-- Citas: descuentan del bono que caduca antes; la cancelada no cuenta; agotado, pasa al siguiente
insert into public.citas (id, trainer_id, client_id, start_at, end_at, status) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', now() + interval '1 day', now() + interval '1 day 1 hour', 'confirmada');
insert into resultados select 'D1 la primera cita descuenta del bono que caduca antes', bono_id = 'bbbbbbbb-0000-0000-0000-000000000001', coalesce(bono_id::text, 'sin bono') from public.citas where id = 'dddddddd-0000-0000-0000-000000000001';
update public.citas set status = 'cancelada' where id = 'dddddddd-0000-0000-0000-000000000001';
insert into public.citas (id, trainer_id, client_id, start_at, end_at, status) values
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', now() + interval '2 days', now() + interval '2 days 1 hour', 'confirmada'),
  ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', now() + interval '3 days', now() + interval '3 days 1 hour', 'confirmada');
insert into resultados select 'D2 la cancelada no cuenta: caben dos más en el bono de 2', count(*) = 2, count(*)::text || ' citas' from public.citas where bono_id = 'bbbbbbbb-0000-0000-0000-000000000001' and status <> 'cancelada';
insert into public.citas (id, trainer_id, client_id, start_at, end_at, status) values
  ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', now() + interval '4 days', now() + interval '4 days 1 hour', 'confirmada'),
  ('dddddddd-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', now() + interval '60 days', now() + interval '60 days 1 hour', 'confirmada');
insert into resultados select 'D3 agotado el primero, descuenta del siguiente', bono_id = 'bbbbbbbb-0000-0000-0000-000000000003', coalesce(bono_id::text, 'sin bono') from public.citas where id = 'dddddddd-0000-0000-0000-000000000004';
insert into resultados select 'D4 una cita después de la caducidad no usa el bono caducado', bono_id = 'bbbbbbbb-0000-0000-0000-000000000003', coalesce(bono_id::text, 'sin bono') from public.citas where id = 'dddddddd-0000-0000-0000-000000000005';
insert into public.citas (id, trainer_id, client_id, start_at, end_at, status, bono_id) values
  ('dddddddd-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', now() + interval '5 days', now() + interval '5 days 1 hour', 'confirmada', 'bbbbbbbb-0000-0000-0000-000000000002');
insert into resultados select 'D5 no se descuenta de un bono ajeno', bono_id is distinct from 'bbbbbbbb-0000-0000-0000-000000000002', coalesce(bono_id::text, 'sin bono') from public.citas where id = 'dddddddd-0000-0000-0000-000000000006';
reset role;

-- ── El cliente ve sus bonos y no crea ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false; n int;
begin
  select count(*) into n from public.bonos_cliente;
  insert into resultados values ('C1 el cliente ve sus bonos (y no los de otros)', n = 2, n::text || ' filas');
  begin
    insert into public.bonos_cliente (trainer_id, client_id, nombre, sesiones) values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Me lo regalo', 99);
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('C2 el cliente no se crea bonos', ok, 'RLS');
end $$;
reset role;

-- ── Sin sesión, nada; RGPD y cascada ──
set local role anon;
do $$
declare ok boolean := false; n int;
begin
  begin
    select count(*) into n from public.bonos_cliente;
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('S1 sin sesión no se ve nada', ok, 'sin permiso');
end $$;
reset role;
insert into resultados select 'R1 está en client_data_tables', count(*) = 1, 'RGPD' from public.client_data_tables() where tbl = 'bonos_cliente';
delete from public.bonos_cliente where id = 'bbbbbbbb-0000-0000-0000-000000000003';
insert into resultados select 'R2 borrar un bono deja sus citas sin bono', count(*) = 0, count(*)::text from public.citas where bono_id = 'bbbbbbbb-0000-0000-0000-000000000003';
delete from public.citas where client_id = '22222222-0000-0000-0000-000000000002';
delete from public.clientes where id = '22222222-0000-0000-0000-000000000002';
insert into resultados select 'R3 borrar un cliente borra sus bonos', count(*) = 0, 'cascada' from public.bonos_cliente where client_id = '22222222-0000-0000-0000-000000000002';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
