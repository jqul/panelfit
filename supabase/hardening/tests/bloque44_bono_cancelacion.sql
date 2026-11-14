-- Prueba de migrations/20261114000003_bono_cancelacion.sql
-- (cancelar a tiempo devuelve la sesión al bono; tarde la gasta; el entrenador puede devolverla; el cliente no).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;
create function pg_temp.como(sub text) returns void language sql as $f$
  select set_config('request.jwt.claims', json_build_object('sub', sub, 'role', 'authenticated')::text, true)
$f$;
create function pg_temp.usadas() returns int language sql as $f$
  select count(*)::int from public.citas where bono_id = 'bbbbbbbb-0000-0000-0000-000000000001' and (status <> 'cancelada' or consume_bono)
$f$;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'tok-1', 'cccccccc-0000-0000-0000-000000000001');
insert into public.horario_citas (trainer_id, cancelar_horas) values ('aaaaaaaa-0000-0000-0000-000000000001', 24);
insert into public.bonos_cliente (id, trainer_id, client_id, nombre, sesiones) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Bono 5', 5);
insert into public.citas (id, trainer_id, client_id, title, start_at, end_at, status, notes) values
  ('d0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'A tiempo', now() + interval '3 days', now() + interval '3 days 1 hour', 'confirmada', ''),
  ('d0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Tarde', now() + interval '2 hours', now() + interval '3 hours', 'confirmada', ''),
  ('d0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Tarde 2', now() + interval '5 hours', now() + interval '6 hours', 'confirmada', '');

do $$ begin
  insert into resultados values ('K1 las tres citas descuentan del bono', pg_temp.usadas() = 3, pg_temp.usadas()::text);
end $$;

-- El cliente cancela la de dentro de 3 días: a tiempo, vuelve al bono
set local role authenticated;
select pg_temp.como('cccccccc-0000-0000-0000-000000000001');
update public.citas set status = 'cancelada' where id = 'd0000000-0000-0000-0000-000000000001';
reset role;
do $$ begin
  insert into resultados values ('K2 cancelada a tiempo: vuelve al bono', pg_temp.usadas() = 2 and not (select consume_bono from public.citas where id = 'd0000000-0000-0000-0000-000000000001'), pg_temp.usadas()::text);
end $$;

-- El entrenador cancela las dos de hoy (fuera del plazo de 24 h): se gastan
set local role authenticated;
select pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
update public.citas set status = 'cancelada' where id in ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003');
reset role;
do $$ begin
  insert into resultados values ('K3 canceladas tarde: siguen gastando', pg_temp.usadas() = 2, pg_temp.usadas()::text);
end $$;

-- El cliente no puede devolverse la sesión
set local role authenticated;
select pg_temp.como('cccccccc-0000-0000-0000-000000000001');
update public.citas set consume_bono = false where id = 'd0000000-0000-0000-0000-000000000002';
reset role;
do $$ begin
  insert into resultados values ('K4 el cliente no se devuelve una sesión', (select consume_bono from public.citas where id = 'd0000000-0000-0000-0000-000000000002'), '');
end $$;

-- El entrenador sí
set local role authenticated;
select pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
update public.citas set consume_bono = false where id = 'd0000000-0000-0000-0000-000000000002';
reset role;
do $$ begin
  insert into resultados values ('K5 el entrenador la devuelve al bono', pg_temp.usadas() = 1, pg_temp.usadas()::text);
end $$;

-- Una cita nueva descuenta del bono contando las canceladas tarde (5 sesiones: 1 gastada → quedan 4)
do $$
declare b uuid;
begin
  insert into public.citas (trainer_id, client_id, title, start_at, end_at, status, notes) values
    ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Nueva', now() + interval '5 days', now() + interval '5 days 1 hour', 'confirmada', '')
    returning bono_id into b;
  insert into resultados values ('K6 una cita nueva sigue tirando del bono', b = 'bbbbbbbb-0000-0000-0000-000000000001' and pg_temp.usadas() = 2, coalesce(b::text, 'sin bono'));
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
