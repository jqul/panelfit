-- Prueba de migrations/20261104000001_normas_reserva.sql
-- (días vista para reservar y plazo de cancelación: el cliente no reserva más allá de los días vista ni cancela fuera de
-- plazo; el entrenador cancela siempre; agenda_cliente le enseña las normas).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;
create function pg_temp.lunes() returns date language sql as $f$ select (date_trunc('week', now() at time zone 'Europe/Madrid'))::date + 7 $f$;
create function pg_temp.a_las(h text, dias int default 0) returns timestamptz language sql as $f$ select ((pg_temp.lunes() + dias) + h::time) at time zone 'Europe/Madrid' $f$;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 1', 'tok-1', 'cccccccc-0000-0000-0000-000000000001');

-- ── El entrenador: lunes 9–12, sin antelación mínima, 10 días vista, cancelar hasta 24 h antes; y dos citas del cliente ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into public.horario_citas (trainer_id, franjas, duracion_min, antelacion_horas, dias_vista, cancelar_horas)
values ('aaaaaaaa-0000-0000-0000-000000000001', '[{"dia":0,"desde":"09:00","hasta":"12:00"}]', 60, 0, 10, 24);
insert into public.citas (id, trainer_id, client_id, title, start_at, end_at, status, notes) values
  ('d0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Pronto', now() + interval '12 hours', now() + interval '13 hours', 'confirmada', ''),
  ('d0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Lejos', now() + interval '3 days', now() + interval '3 days 1 hour', 'confirmada', '');
reset role;

-- ── El cliente ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare a jsonb; r jsonb; ok boolean := false; st text;
begin
  a := public.agenda_cliente(pg_temp.lunes(), 7);
  insert into resultados values ('N1 agenda_cliente le enseña las normas', (a->'horario'->>'dias_vista')::int = 10 and (a->'horario'->>'cancelar_horas')::int = 24, coalesce(a->>'horario', 'null'));

  r := public.reservar_cita(pg_temp.a_las('09:00', 14));
  insert into resultados values ('N2 más allá de los días vista, no', r->>'error' = 'demasiado_lejos', r::text);
  r := public.reservar_cita(pg_temp.a_las('09:00'));
  insert into resultados values ('N3 dentro de los días vista, sí', r ? 'id', r::text);

  begin
    update public.citas set status = 'cancelada' where id = 'd0000000-0000-0000-0000-000000000001';
  exception when raise_exception then ok := sqlerrm = 'plazo_cancelacion';
  end;
  select status into st from public.citas where id = 'd0000000-0000-0000-0000-000000000001';
  insert into resultados values ('N4 la de dentro de 12 h no la cancela (plazo de 24 h)', ok and st = 'confirmada', st);

  update public.citas set status = 'cancelada' where id = 'd0000000-0000-0000-0000-000000000002';
  select status into st from public.citas where id = 'd0000000-0000-0000-0000-000000000002';
  insert into resultados values ('N5 la de dentro de 3 días sí', st = 'cancelada', st);
end $$;
reset role;

-- ── El entrenador cancela la de dentro de 12 h (él no tiene plazo) ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare st text;
begin
  update public.citas set status = 'cancelada' where id = 'd0000000-0000-0000-0000-000000000001';
  select status into st from public.citas where id = 'd0000000-0000-0000-0000-000000000001';
  insert into resultados values ('N6 el entrenador cancela fuera de plazo', st = 'cancelada', st);
  -- Sin plazo (0), el cliente puede cancelar aunque falte poco
  update public.horario_citas set cancelar_horas = 0;
  insert into public.citas (id, trainer_id, client_id, title, start_at, end_at, status, notes) values
    ('d0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Ya mismo', now() + interval '1 hour', now() + interval '2 hours', 'confirmada', '');
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare st text;
begin
  update public.citas set status = 'cancelada' where id = 'd0000000-0000-0000-0000-000000000003';
  select status into st from public.citas where id = 'd0000000-0000-0000-0000-000000000003';
  insert into resultados values ('N7 sin plazo, el cliente cancela aunque falte una hora', st = 'cancelada', st);
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
