-- Prueba de migrations/20261030000002_horario_citas.sql
-- (el horario lo gestiona solo su entrenador; el cliente no lo lee directamente pero sí ve, por agenda_cliente, el
-- horario de SU entrenador y lo ocupado sin saber de quién; reservar_cita solo deja reservar dentro del horario, con
-- antelación, en un hueco libre (con margen), como mucho 3 citas futuras y confirmada solo si el entrenador lo quiere).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;
-- El lunes de la semana que viene (hora de Madrid) y una hora de ese día (o de los siguientes)
create function pg_temp.lunes() returns date language sql as $f$ select (date_trunc('week', now() at time zone 'Europe/Madrid'))::date + 7 $f$;
create function pg_temp.a_las(h text, dias int default 0) returns timestamptz language sql as $f$ select ((pg_temp.lunes() + dias) + h::time) at time zone 'Europe/Madrid' $f$;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer');
insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local'),
  ('cccccccc-0000-0000-0000-000000000002', 'c2@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 1', 'tok-1', 'cccccccc-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 2', 'tok-2', 'cccccccc-0000-0000-0000-000000000002');

-- ── El entrenador 1 pone su horario: lunes 9–12, citas de 60 min, 15 de margen, 12 h de antelación ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into public.horario_citas (trainer_id, franjas, duracion_min, margen_min, antelacion_horas)
values ('aaaaaaaa-0000-0000-0000-000000000001', '[{"dia":0,"desde":"09:00","hasta":"12:00"}]', 60, 15, 12);
insert into resultados select 'H1 el entrenador guarda su horario', count(*) = 1, 'ok' from public.horario_citas;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from public.horario_citas;
  insert into resultados values ('H2 otro entrenador no ve el horario', n = 0, n::text || ' filas');
  begin
    insert into public.horario_citas (trainer_id) values ('aaaaaaaa-0000-0000-0000-000000000001');
  exception when insufficient_privilege or unique_violation then ok := true;
  end;
  insert into resultados values ('H3 ni lo pone por él', ok, 'RLS');
end $$;
reset role;

-- ── El cliente 1 ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare n int; r jsonb; a jsonb;
begin
  select count(*) into n from public.horario_citas;
  insert into resultados values ('C1 el cliente no lee la tabla del horario', n = 0, n::text || ' filas');
  a := public.agenda_cliente(pg_temp.lunes(), 7);
  insert into resultados values ('C2 agenda_cliente le da el horario de su entrenador', (a->'horario'->>'duracion_min')::int = 60, coalesce(a::text, 'null'));

  r := public.reservar_cita(pg_temp.a_las('10:00'));
  insert into resultados values ('R1 reserva un hueco del horario (pendiente: no se confirma solo)', r->>'status' = 'pendiente', r::text);
  r := public.reservar_cita(pg_temp.a_las('13:00'));
  insert into resultados values ('R2 fuera del horario, no', r->>'error' = 'fuera_de_horario', r::text);
  r := public.reservar_cita(pg_temp.a_las('11:30', 1));
  insert into resultados values ('R3 otro día sin franja, no', r->>'error' = 'fuera_de_horario', r::text);
  r := public.reservar_cita(now() + interval '1 hour');
  insert into resultados values ('R4 sin la antelación mínima, no', r->>'error' in ('antelacion', 'fuera_de_horario'), r::text);
end $$;
reset role;

-- ── El cliente 2: lo ocupado, sin saber de quién; el margen cuenta ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare r jsonb; a jsonb; n int;
begin
  a := public.agenda_cliente(pg_temp.lunes(), 7);
  insert into resultados values ('O1 ve lo ocupado sin de quién es', jsonb_array_length(a->'ocupado') = 1 and not ((a->'ocupado'->0) ? 'client_id'), (a->'ocupado')::text);
  select count(*) into n from public.citas;
  insert into resultados values ('O2 y no puede leer la cita del otro cliente', n = 0, n::text || ' filas');
  r := public.reservar_cita(pg_temp.a_las('10:00'));
  insert into resultados values ('O3 el mismo hueco ya no se puede', r->>'error' = 'ocupado', r::text);
  r := public.reservar_cita(pg_temp.a_las('11:00'));
  insert into resultados values ('O4 justo después tampoco (margen de 15 min)', r->>'error' = 'ocupado', r::text);
  r := public.reservar_cita(pg_temp.a_las('09:00'));
  insert into resultados values ('O5 de 9 a 10 choca con el margen de la de las 10', r->>'error' = 'ocupado', r::text);
end $$;
reset role;

-- ── Autoconfirmar y límite de 3 ──
update public.horario_citas set autoconfirmar = true, margen_min = 0, franjas = '[{"dia":0,"desde":"09:00","hasta":"12:00"},{"dia":1,"desde":"09:00","hasta":"20:00"}]';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare r jsonb;
begin
  r := public.reservar_cita(pg_temp.a_las('09:00', 1));
  insert into resultados values ('A1 con autoconfirmar, queda confirmada', r->>'status' = 'confirmada', r::text);
  r := public.reservar_cita(pg_temp.a_las('11:00', 1));
  insert into resultados values ('A2 tercera cita futura, sí', r ? 'id', r::text);
  r := public.reservar_cita(pg_temp.a_las('13:00', 1));
  insert into resultados values ('A3 la cuarta, no', r->>'error' = 'demasiadas', r::text);
end $$;
reset role;

-- ── Sin sesión, nada ──
set local role anon;
do $$
declare ok boolean := false;
begin
  begin
    perform public.reservar_cita(now() + interval '3 days');
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('S1 sin sesión no se reserva', ok, 'sin permiso');
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
