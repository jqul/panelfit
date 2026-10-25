-- Prueba de migrations/20261025000001_handle_new_user_sin_clientes.sql
-- (el alta de un cliente no crea una fila fantasma en entrenadores; el alta de un entrenador, sí).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;

-- Alta de un entrenador: sin metadatos (como hace Auth.tsx)
insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'entrenador@test.local');
-- Alta de un entrenador con nombre
insert into auth.users (id, email, raw_user_meta_data) values ('aaaaaaaa-0000-0000-0000-0000000000a2', 'otro@test.local', '{"displayName":"Otro Entrenador"}');
-- Alta de un cliente: lleva el token de su enlace (como hace ClientRegister.tsx)
insert into auth.users (id, email, raw_user_meta_data) values ('cccccccc-0000-0000-0000-0000000000c1', 'cliente@test.local', '{"clientName":"María","token":"tok-uno"}');

insert into resultados select 'Y1 el alta de un entrenador crea su fila sin aprobar',
  count(*) = 1 and bool_and(not approved), count(*)::text || ' filas'
  from public.entrenadores where uid = 'aaaaaaaa-0000-0000-0000-0000000000a1';
insert into resultados select 'Y2 el nombre de los metadatos se respeta',
  "displayName" = 'Otro Entrenador', coalesce("displayName", 'null')
  from public.entrenadores where uid = 'aaaaaaaa-0000-0000-0000-0000000000a2';
insert into resultados select 'Y3 el alta de un cliente NO crea fila de entrenador',
  count(*) = 0, count(*)::text || ' filas'
  from public.entrenadores where uid = 'cccccccc-0000-0000-0000-0000000000c1';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
