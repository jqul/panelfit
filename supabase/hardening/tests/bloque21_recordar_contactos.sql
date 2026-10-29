-- Prueba de migrations/20261029000001_recordar_contactos_sin_contestar.sql
-- (los contactos "nuevos" que llevan más de 24 h sin contestar reciben un recordatorio, una sola vez, de día y solo
-- los de los últimos 7 días; los ya contestados no).
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
insert into public.internal_webhook_secrets (name, secret) values ('new_lead', 'secreto-de-prueba');

-- Contactos: hace 30 h (nuevo), hace 2 h (nuevo), hace 30 h (contactado), hace 10 días (nuevo), hace 30 h (nuevo, ya recordado)
create function pg_temp.ahora() returns bigint language sql as $$ select (extract(epoch from now()) * 1000)::bigint $$;
insert into public.leads (id, trainer_id, name, email, status, created_at, recordado_at) values
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Paula Navarro', 'paula@example.com', 'nuevo', pg_temp.ahora() - 30 * 3600000, null),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Reciente', 'reciente@example.com', 'nuevo', pg_temp.ahora() - 2 * 3600000, null),
  ('00000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ya contestado', 'contestado@example.com', 'contactado', pg_temp.ahora() - 30 * 3600000, null),
  ('00000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Muy antiguo', 'antiguo@example.com', 'nuevo', pg_temp.ahora() - 10 * 86400000, null),
  ('00000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ya recordado', 'recordado@example.com', 'nuevo', pg_temp.ahora() - 30 * 3600000, pg_temp.ahora() - 3600000);
-- Los inserts de arriba disparan leads_notify (aviso de nuevo contacto): se limpia para ver solo lo del recordatorio
delete from public.notificaciones;
delete from public.llamadas_http;

-- ── De noche no se avisa ──
create temp table salida (clave text, n int);
insert into salida select 'noche', public.recordar_contactos_sin_contestar(3);
insert into resultados select '1 de madrugada no se manda nada ni se marca nada',
  (select n from salida where clave = 'noche') = 0 and (select count(*) from public.notificaciones) = 0
  and (select count(*) from public.llamadas_http) = 0 and (select count(*) from public.leads where recordado_at is not null) = 1, '0';

-- ── De día se recuerda a quien toca, una vez ──
insert into salida select 'dia', public.recordar_contactos_sin_contestar(11);
insert into resultados select '2a de día se recuerda solo el contacto nuevo de más de 24 h y de menos de 7 días',
  (select n from salida where clave = 'dia') = 1
  and (select count(*) from public.notificaciones) = 1
  and (select titulo from public.notificaciones) = 'Sin contestar: Paula Navarro'
  and (select mensaje from public.notificaciones) = 'Lleva más de un día esperando tu respuesta'
  and (select tipo from public.notificaciones) = 'nuevo_contacto', 'Paula';
insert into resultados select '2b se pide el push con recordatorio y con el secreto',
  count(*) = 1 and bool_and(url like '%/functions/v1/notify-lead' and headers->>'Authorization' = 'Bearer secreto-de-prueba'
    and (body->>'recordatorio')::boolean and body->>'name' = 'Paula Navarro' and body->>'trainer_id' = 'aaaaaaaa-0000-0000-0000-000000000001'), count(*)::text || ' llamadas'
from public.llamadas_http;
insert into resultados select '2c solo Paula queda marcada como recordada (además de la que ya lo estaba)',
  (select recordado_at is not null from public.leads where name = 'Paula Navarro')
  and (select count(*) from public.leads where recordado_at is not null) = 2, 'Paula + Ya recordado';

-- ── No se repite ──
insert into salida select 'otra', public.recordar_contactos_sin_contestar(11);
insert into resultados select '3 una segunda pasada no repite el aviso',
  (select n from salida where clave = 'otra') = 0 and (select count(*) from public.notificaciones) = 1 and (select count(*) from public.llamadas_http) = 1, '0';

-- ── Nadie de fuera puede llamarla ──
insert into resultados select '4 la función no es ejecutable por anon ni authenticated',
  not has_function_privilege('anon', 'public.recordar_contactos_sin_contestar(integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.recordar_contactos_sin_contestar(integer)', 'execute'), 'revocada';

select caso, case when ok then 'OK' else 'FALLA' end as resultado, detalle from resultados order by caso;

rollback;
