-- Prueba de migrations/20261030000003_recordatorio_cita.sql
-- (el lanzador solo llama a la función si hay una cita confirmada, con cliente, sin recordar y que empieza dentro de
-- 30 a 75 minutos; nunca por las pendientes, las ya recordadas, las lejanas o los bloqueos sin cliente; nadie puede
-- lanzarlo desde fuera).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración (sin su línea de cron.schedule: PGlite no tiene cron).
-- net.http_post se sustituye por un registro de llamadas. Todo termina en ROLLBACK.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

create schema if not exists net;
create table public.llamadas_http (url text, headers jsonb, body jsonb);
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
 returns bigint language plpgsql as $f$
begin
  insert into public.llamadas_http values (url, headers, body);
  return 1;
end $f$;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into public.clientes (id, "trainerId", name, token) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 1', 'tok-1');

-- Nada que recordar: pendiente dentro de una hora, confirmada dentro de 3 horas, bloqueo sin cliente, ya recordada
insert into public.citas (trainer_id, client_id, start_at, end_at, status, recordada_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', now() + interval '1 hour', now() + interval '2 hours', 'pendiente', null),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', now() + interval '3 hours', now() + interval '4 hours', 'confirmada', null),
  ('aaaaaaaa-0000-0000-0000-000000000001', null, now() + interval '1 hour', now() + interval '2 hours', 'confirmada', null),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', now() + interval '50 minutes', now() + interval '110 minutes', 'confirmada', now());

insert into resultados select 'L1 sin nada que recordar no llama a nadie',
  not public.lanzar_recordatorio_citas() and (select count(*) = 0 from public.llamadas_http), 'pendiente, lejana, sin cliente, ya recordada';

-- Una confirmada dentro de una hora, sin recordar
insert into public.citas (trainer_id, client_id, start_at, end_at, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', now() + interval '1 hour', now() + interval '2 hours', 'confirmada');
create temp table lanzado on commit drop as select public.lanzar_recordatorio_citas() as ok;
-- (en otra sentencia: la misma no ve la llamada que acaba de apuntar)
insert into resultados select 'L2 con una cita confirmada en una hora llama a la función con el secreto',
  (select ok from lanzado)
  and (select count(*) = 1 from public.llamadas_http where url like '%/functions/v1/recordatorio-cita'
       and headers->>'Authorization' = 'Bearer ' || (select secret from public.internal_webhook_secrets where name = 'recordatorio_cita')),
  'una llamada';

insert into resultados select 'S1 el secreto existe y es largo', length(secret) >= 60, length(secret)::text || ' caracteres'
  from public.internal_webhook_secrets where name = 'recordatorio_cita';

-- Nadie lo lanza desde fuera
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false;
begin
  begin
    perform public.lanzar_recordatorio_citas();
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('S2 un usuario no puede lanzar el recordatorio', ok, 'sin permiso');
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
