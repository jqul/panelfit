-- Prueba de migrations/20261030000001_mensajes_programados_push.sql
-- (el lanzador solo llama a la función entre las 9 y las 20, solo si hay un mensaje que ya toca y sin mandar, y con el
-- secreto; nadie de fuera puede llamarlo; el secreto existe y es largo).
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

insert into resultados select 'A1 el secreto existe y es largo', length(secret) >= 60, length(secret)::text || ' caracteres'
  from public.internal_webhook_secrets where name = 'mensajes_programados';

-- ── Sin mensajes: no llama ──
insert into resultados select 'B1 sin mensajes no llama a la función', public.lanzar_mensajes_programados(12) = false, (select count(*)::text from public.llamadas_http) || ' llamadas';

-- ── Un mensaje para el futuro: tampoco ──
insert into public.programacion_mensajes (id, "trainerId", "clientId", tipo, mensaje, "fechaEnvio")
  values ('00000000-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'recordatorio', 'Mañana pesaje', '2999-01-01');
insert into resultados select 'B2 un mensaje futuro no hace llamar', public.lanzar_mensajes_programados(12) = false, (select count(*)::text from public.llamadas_http) || ' llamadas';

-- ── Un mensaje que ya toca: llama, con el secreto, a la función correcta ──
insert into public.programacion_mensajes (id, "trainerId", "clientId", tipo, mensaje, "fechaEnvio")
  values ('00000000-0000-0000-0000-0000000000f2', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'recordatorio', 'Hoy toca pesaje', '2020-01-01');
insert into resultados select 'C1 un mensaje que ya toca hace llamar', public.lanzar_mensajes_programados(12) = true, (select count(*)::text from public.llamadas_http) || ' llamadas';
insert into resultados select 'C2 llama a mensajes-programados con el secreto como Bearer',
  count(*) = 1 and bool_and(url like '%/functions/v1/mensajes-programados')
    and bool_and(headers ->> 'Authorization' = 'Bearer ' || (select secret from public.internal_webhook_secrets where name = 'mensajes_programados')),
  count(*)::text || ' llamada'
  from public.llamadas_http;

-- ── Fuera de horario no llama aunque haya mensajes ──
delete from public.llamadas_http;
insert into resultados select 'D1 de madrugada (3 h) no llama', public.lanzar_mensajes_programados(3) = false, (select count(*)::text from public.llamadas_http) || ' llamadas';
insert into resultados select 'D2 a las 21 h no llama', public.lanzar_mensajes_programados(21) = false, (select count(*)::text from public.llamadas_http) || ' llamadas';
insert into resultados select 'D3 a las 9 h sí llama', public.lanzar_mensajes_programados(9) = true, (select count(*)::text from public.llamadas_http) || ' llamadas';
insert into resultados select 'D4 a las 20 h sí llama', public.lanzar_mensajes_programados(20) = true, (select count(*)::text from public.llamadas_http) || ' llamadas';

-- ── Con el push ya mandado (o el mensaje ya enviado), no vuelve a llamar ──
delete from public.llamadas_http;
update public.programacion_mensajes set "pushEnviado" = true where id = '00000000-0000-0000-0000-0000000000f2';
insert into resultados select 'E1 con el push ya mandado no llama', public.lanzar_mensajes_programados(12) = false, (select count(*)::text from public.llamadas_http) || ' llamadas';
update public.programacion_mensajes set "pushEnviado" = false, enviado = true where id = '00000000-0000-0000-0000-0000000000f2';
insert into resultados select 'E2 con el mensaje ya enviado no llama', public.lanzar_mensajes_programados(12) = false, (select count(*)::text from public.llamadas_http) || ' llamadas';
update public.programacion_mensajes set enviado = null, "pushEnviado" = null where id = '00000000-0000-0000-0000-0000000000f2';
insert into resultados select 'E3 con los indicadores sin rellenar (null) cuenta como pendiente', public.lanzar_mensajes_programados(12) = true, 'null = pendiente';

-- ── Nadie de fuera puede llamar al lanzador ──
set local role anon;
do $$
declare ok boolean := false;
begin
  begin
    perform public.lanzar_mensajes_programados(12);
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('F1 anon no puede llamar al lanzador', ok, 'sin permiso');
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false;
begin
  begin
    perform public.lanzar_mensajes_programados(12);
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('F2 un entrenador no puede llamar al lanzador', ok, 'sin permiso');
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
