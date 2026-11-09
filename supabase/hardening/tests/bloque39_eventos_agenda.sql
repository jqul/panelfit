-- Prueba de migrations/20261110000001_eventos_agenda.sql
-- (eventos propios: una reunión ocupa el hueco; un recordatorio no; un evento no lleva cliente).
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

-- ── El entrenador: lunes 9–12; una reunión a las 9 y un recordatorio a las 10 ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into public.horario_citas (trainer_id, franjas, duracion_min, antelacion_horas, dias_vista)
values ('aaaaaaaa-0000-0000-0000-000000000001', '[{"dia":0,"desde":"09:00","hasta":"12:00"}]', 60, 0, 14);
insert into public.citas (trainer_id, client_id, title, start_at, end_at, status, notes, evento) values
  ('aaaaaaaa-0000-0000-0000-000000000001', null, 'Reunión', pg_temp.a_las('09:00'), pg_temp.a_las('10:00'), 'confirmada', '', 'reunion'),
  ('aaaaaaaa-0000-0000-0000-000000000001', null, 'Llamar al proveedor', pg_temp.a_las('10:00'), pg_temp.a_las('10:00'), 'confirmada', '', 'recordatorio');
do $$
declare ok boolean := false;
begin
  begin
    insert into public.citas (trainer_id, client_id, title, start_at, end_at, status, notes, evento) values
      ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'X', pg_temp.a_las('11:00'), pg_temp.a_las('12:00'), 'confirmada', '', 'reunion');
  exception when check_violation then ok := true;
  end;
  insert into resultados values ('E1 un evento no puede llevar cliente', ok, '');
end $$;
reset role;

-- ── El cliente ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare a jsonb; r jsonb;
begin
  a := public.agenda_cliente(pg_temp.lunes(), 7);
  insert into resultados values ('E2 la reunión sale como ocupado y el recordatorio no', jsonb_array_length(a->'ocupado') = 1, a->>'ocupado');
  r := public.reservar_cita(pg_temp.a_las('09:00'));
  insert into resultados values ('E3 no reserva encima de la reunión', r->>'error' = 'ocupado', r::text);
  r := public.reservar_cita(pg_temp.a_las('10:00'));
  insert into resultados values ('E4 sí reserva a la hora del recordatorio', r ? 'id', r::text);
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
