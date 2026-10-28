-- Prueba de migrations/20261028000002_aviso_nuevo_contacto.sql
-- (al insertarse un contacto por la página pública: notificación para el entrenador en la campanita y aviso push por
-- la función de borde; y si el aviso falla, el contacto se guarda igual).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. net.http_post se sustituye por un registro de llamadas.
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

-- Sustituto de pg_net: guarda lo que se le pide enviar (y puede fallar a propósito)
create schema if not exists net;
create table public.llamadas_http (url text, headers jsonb, body jsonb);
create table public.config_prueba (falla boolean);
insert into public.config_prueba values (false);
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
 returns bigint language plpgsql as $f$
begin
  if (select falla from public.config_prueba) then raise exception 'pg_net caído'; end if;
  insert into public.llamadas_http values (url, headers, body);
  return 1;
end $f$;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role, slug, public_page) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer', 'entrenador1', '{"activa": true}');

-- ── 1. Sin secreto de push: solo la campanita ──
set local role anon;
select public.submit_lead('entrenador1', 'Paula Navarro', 'paula@example.com', null, 'Quiero empezar a entrenar fuerza', null);
reset role;
insert into resultados select '1a un contacto por la página crea la notificación del entrenador',
  count(*) = 1 and bool_and(tipo = 'nuevo_contacto' and trainer_id = 'aaaaaaaa-0000-0000-0000-000000000001' and not leida and destinatario = 'trainer'
    and titulo = 'Nuevo contacto: Paula Navarro' and mensaje = 'Quiero empezar a entrenar fuerza' and id like 'lead\_%'),
  count(*)::text || ' filas'
from public.notificaciones;
insert into resultados select '1b sin secreto no se llama a la función de borde', count(*) = 0, count(*)::text || ' llamadas' from public.llamadas_http;

-- ── 2. Con secreto: además, el push ──
insert into public.internal_webhook_secrets (name, secret) values ('new_lead', 'secreto-de-prueba');
set local role anon;
select public.submit_lead('entrenador1', 'Sergio   Blanco', null, '622112233', null, null);
reset role;
insert into resultados select '2a con secreto se pide el push con el secreto y el entrenador',
  count(*) = 1 and bool_and(url like '%/functions/v1/notify-lead' and headers->>'Authorization' = 'Bearer secreto-de-prueba'
    and body->>'trainer_id' = 'aaaaaaaa-0000-0000-0000-000000000001' and body->>'name' = 'Sergio   Blanco'),
  count(*)::text || ' llamadas'
from public.llamadas_http;
insert into resultados select '2b sin mensaje, la notificación dice que te ha escrito desde la página',
  mensaje = 'Te ha escrito desde tu página pública', mensaje
from public.notificaciones where titulo = 'Nuevo contacto: Sergio   Blanco';

-- ── 3. Nombres y mensajes largos se recortan ──
set local role anon;
select public.submit_lead('entrenador1', repeat('N', 300), null, '600', repeat('m', 900), null);
reset role;
insert into resultados select '3 el título y el mensaje se recortan (80 y 200)',
  count(*) = 1 and bool_and(length(titulo) = length('Nuevo contacto: ') + 80 and length(mensaje) = 200), count(*)::text
from public.notificaciones where titulo like 'Nuevo contacto: NNN%';

-- ── 4. Si el aviso falla, el contacto se guarda igual ──
update public.config_prueba set falla = true;
set local role anon;
select public.submit_lead('entrenador1', 'Irene Castro', null, '644778899', null, null);
reset role;
insert into resultados select '4 aunque falle el aviso, el contacto queda guardado',
  count(*) = 1, count(*)::text || ' filas'
from public.leads where name = 'Irene Castro';
update public.config_prueba set falla = false;

-- ── 5. Nadie puede llamar a la función de aviso por la API ──
insert into resultados select '5 la función de aviso no es ejecutable por anon ni authenticated',
  not has_function_privilege('anon', 'public.notify_new_lead()', 'execute') and not has_function_privilege('authenticated', 'public.notify_new_lead()', 'execute'),
  'anon=' || has_function_privilege('anon', 'public.notify_new_lead()', 'execute')::text || ' authenticated=' || has_function_privilege('authenticated', 'public.notify_new_lead()', 'execute')::text;

select caso, case when ok then 'OK' else 'FALLA' end as resultado, detalle from resultados order by caso;

rollback;
