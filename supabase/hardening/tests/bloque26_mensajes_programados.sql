-- Prueba de migrations/20261030000001_mensajes_programados_servidor.sql
-- (el lanzador solo llama a la función de borde entre las 8 y las 21 de Madrid, solo si hay un mensaje que toca hoy o
-- antes y aún sin push, y con el secreto; un mensaje de otro día o ya enviado no la dispara; nadie salvo el servidor
-- puede ejecutarlo).
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

-- Sin nada pendiente: no llama aunque sea de día
create temp table lanzado (caso text, ok boolean) on commit drop;
insert into lanzado select 'L1', public.lanzar_mensajes_programados(10);
insert into resultados select 'L1 sin mensajes pendientes no llama a la función', not (select ok from lanzado where caso = 'L1')
  and (select count(*) = 0 from public.llamadas_http), 'tabla vacía';

-- Solo un mensaje futuro: tampoco
insert into public.programacion_mensajes (id, "trainerId", "clientId", tipo, mensaje, "fechaEnvio", enviado, "pushEnviado") values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'custom', 'futuro',
   (now() at time zone 'Europe/Madrid')::date + 2, false, false);
insert into lanzado select 'L2', public.lanzar_mensajes_programados(10);
insert into resultados select 'L2 un mensaje futuro no dispara el envío', not (select ok from lanzado where caso = 'L2')
  and (select count(*) = 0 from public.llamadas_http), 'futuro';

-- Uno que toca hoy, pero de madrugada o de noche: no llama
insert into public.programacion_mensajes (id, "trainerId", "clientId", tipo, mensaje, "fechaEnvio", enviado, "pushEnviado") values
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'custom', 'hoy',
   (now() at time zone 'Europe/Madrid')::date, false, false);
insert into lanzado select 'L3a', public.lanzar_mensajes_programados(7);
insert into lanzado select 'L3b', public.lanzar_mensajes_programados(22);
insert into resultados select 'L3 fuera de 8-21 h no llama', not (select ok from lanzado where caso = 'L3a') and not (select ok from lanzado where caso = 'L3b')
  and (select count(*) = 0 from public.llamadas_http), '7 h y 22 h';

-- A las 10, con uno que toca hoy: llama una vez, con el secreto
insert into lanzado select 'L4', public.lanzar_mensajes_programados(10);
insert into resultados select 'L4 con un mensaje que toca y a las 10 llama a la función con el secreto',
  (select ok from lanzado where caso = 'L4')
  and (select count(*) = 1 from public.llamadas_http where url like '%/functions/v1/enviar-mensajes-programados'
       and headers->>'Authorization' = 'Bearer ' || (select secret from public.internal_webhook_secrets where name = 'mensajes_programados')),
  '10 h';
-- Los límites de la ventana son inclusivos: 8 y 21 llaman
insert into lanzado select 'L5a', public.lanzar_mensajes_programados(8);
insert into lanzado select 'L5b', public.lanzar_mensajes_programados(21);
insert into resultados select 'L5 las 8 y las 21 sí llaman', (select ok from lanzado where caso = 'L5a') and (select ok from lanzado where caso = 'L5b'), '8 y 21';

-- Una vez enviado el push o marcado como enviado por el entrenador, ya no dispara
update public.programacion_mensajes set "pushEnviado" = true where id = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into lanzado select 'L6', public.lanzar_mensajes_programados(10);
insert into resultados select 'L6 con el push ya enviado no vuelve a llamar', not (select ok from lanzado where caso = 'L6'), 'pushEnviado';
update public.programacion_mensajes set "pushEnviado" = false, enviado = true where id = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into lanzado select 'L7', public.lanzar_mensajes_programados(10);
insert into resultados select 'L7 con el mensaje ya marcado como enviado no llama', not (select ok from lanzado where caso = 'L7'), 'enviado';

-- Nadie salvo el servidor puede ejecutar el lanzador
set local role authenticated;
do $$
declare ok boolean := false;
begin
  begin perform public.lanzar_mensajes_programados(10);
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('P1 un usuario no puede lanzar el envío', ok, 'sin permiso');
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
