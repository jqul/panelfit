-- Prueba de migrations/20261025000005_buscar_entrenador_solo_entrenadores.sql
-- (find_trainer_by_email: solo un entrenador aprobado puede preguntar, y solo encuentra entrenadores aprobados).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;

insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'uno@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Dos@Test.local', 'Entrenador 2', true, 'trainer', 'trainer'),
  ('cccccccc-0000-0000-0000-0000000000c1', 'cliente@test.local', 'Cuenta de cliente (fila pendiente)', false, 'trainer', 'trainer');

-- Un entrenador aprobado busca a otro por correo
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultados select 'V1 un entrenador aprobado encuentra a otro entrenador aprobado', public.find_trainer_by_email('dos@test.local') = 'aaaaaaaa-0000-0000-0000-000000000002', coalesce(public.find_trainer_by_email('dos@test.local')::text, 'null');
insert into resultados select 'V2 no distingue mayúsculas', public.find_trainer_by_email('UNO@TEST.LOCAL') = 'aaaaaaaa-0000-0000-0000-000000000001', coalesce(public.find_trainer_by_email('UNO@TEST.LOCAL')::text, 'null');
insert into resultados select 'V3 no revela una cuenta con fila de entrenador pendiente', public.find_trainer_by_email('cliente@test.local') is null, coalesce(public.find_trainer_by_email('cliente@test.local')::text, 'null');
insert into resultados select 'V4 un correo que no existe no devuelve nada', public.find_trainer_by_email('nadie@test.local') is null, coalesce(public.find_trainer_by_email('nadie@test.local')::text, 'null');
reset role;

-- Quien pregunta no es un entrenador aprobado (una cuenta de cliente con fila pendiente, o sin fila)
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
insert into resultados select 'V5 una cuenta no aprobada no puede buscar entrenadores', public.find_trainer_by_email('uno@test.local') is null, coalesce(public.find_trainer_by_email('uno@test.local')::text, 'null');
reset role;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000009","role":"authenticated"}', true);
set local role authenticated;
insert into resultados select 'V6 un usuario sin fila de entrenador tampoco', public.find_trainer_by_email('uno@test.local') is null, coalesce(public.find_trainer_by_email('uno@test.local')::text, 'null');
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
