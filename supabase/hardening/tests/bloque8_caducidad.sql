-- Prueba del bloque 8 de hardening/20261018_propuesta_endurecimiento.sql
-- (caducidad opcional del enlace de cliente; incluye el recorte del bloque 2).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar el bloque 8 (antes la columna no existe).
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;

insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('99999999-0000-0000-0000-000000000009', 'cliente@test.local');
insert into public.clientes (id, "trainerId", name, token, notas_privadas, precio_mensual) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente Uno', 'tok-uno', 'nota secreta del entrenador', 50);

-- ── Sin caducidad (como hoy) ──
set local role anon;
insert into resultados select 'X1 sin caducidad el enlace funciona', count(*) = 1, count(*)::text || ' filas' from public.get_client_by_token('tok-uno');
insert into resultados select 'X2 el enlace no entrega datos privados del entrenador',
  notas_privadas is null and precio_mensual is null and lesiones is null, 'notas=' || coalesce(notas_privadas, 'null')
  from public.get_client_by_token('tok-uno');
reset role;

-- ── Caducidad futura ──
update public.clientes set token_expires_at = now() + interval '1 day' where token = 'tok-uno';
set local role anon;
insert into resultados select 'X3 con caducidad futura el enlace funciona', count(*) = 1, count(*)::text || ' filas' from public.get_client_by_token('tok-uno');
reset role;

-- ── Caducado ──
update public.clientes set token_expires_at = now() - interval '1 day' where token = 'tok-uno';
set local role anon;
insert into resultados select 'X4 caducado no devuelve el cliente', count(*) = 0, count(*)::text || ' filas' from public.get_client_by_token('tok-uno');
select public.mark_plan_opened('tok-uno');
reset role;
insert into resultados select 'X5 caducado no registra la apertura del plan', plan_last_opened_at is null, coalesce(plan_last_opened_at::text, 'null')
  from public.clientes where token = 'tok-uno';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000009","role":"authenticated"}', true);
select public.claim_client_by_token('tok-uno');
reset role;
insert into resultados select 'X6 caducado no se puede reclamar', auth_user_id is null, coalesce(auth_user_id::text, 'null')
  from public.clientes where token = 'tok-uno';

-- ── Renovado: vuelve a funcionar todo ──
update public.clientes set token_expires_at = null where token = 'tok-uno';
set local role anon;
select public.mark_plan_opened('tok-uno');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000009","role":"authenticated"}', true);
select public.claim_client_by_token('tok-uno');
reset role;
insert into resultados select 'X7 renovado vuelve a registrar apertura y reclamar',
  plan_last_opened_at is not null and auth_user_id = '99999999-0000-0000-0000-000000000009',
  coalesce(plan_last_opened_at::text, 'null') || ' / ' || coalesce(auth_user_id::text, 'null')
  from public.clientes where token = 'tok-uno';

-- ── Estado del enlace (para el mensaje "ha caducado") ──
update public.clientes set token_expires_at = null where token = 'tok-uno';
set local role anon;
insert into resultados select 'X8 estado: sin caducidad es ok', public.get_client_link_status('tok-uno') = 'ok', coalesce(public.get_client_link_status('tok-uno'), 'null');
reset role;
update public.clientes set token_expires_at = now() - interval '1 hour' where token = 'tok-uno';
set local role anon;
insert into resultados select 'X9 estado: caducado se distingue', public.get_client_link_status('tok-uno') = 'expired', coalesce(public.get_client_link_status('tok-uno'), 'null');
insert into resultados select 'X10 estado: un token que no existe no devuelve nada', public.get_client_link_status('no-existe') is null, coalesce(public.get_client_link_status('no-existe'), 'null');
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
