-- Prueba de supabase/migrations/20261025000001_biblioteca_ejercicios.sql
-- (material, archivado y alternativas de exercise_library).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo ocurre dentro de una
-- transacción que termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer');
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 't2@test.local'),
  ('1a1a1a1a-0000-0000-0000-000000000001', 'c1@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('c1c1c1c1-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 1', 'tok-1', '1a1a1a1a-0000-0000-0000-000000000001');

-- Filas de antes de la migración (sin tocar las columnas nuevas) y una del segundo entrenador
insert into public.exercise_library (id, trainer_id, name, created_at, updated_at) values
  ('ex_default_1_0', 'aaaaaaaa-0000-0000-0000-000000000001', 'Sentadilla', 1, 1),
  ('ex_default_1_1', 'aaaaaaaa-0000-0000-0000-000000000001', 'Press banca', 1, 1),
  ('ex_2', 'bbbbbbbb-0000-0000-0000-000000000002', 'Remo', 1, 1);

insert into resultados select 'B1 las filas existentes quedan sin archivar y sin material',
  archived_at is null and coalesce(material, '') = '' and coalesce(alternativas, '{}') = '{}', 'archived_at=' || coalesce(archived_at::text, 'null')
  from public.exercise_library where id = 'ex_default_1_0';

-- El entrenador 1 archiva y rellena material y alternativas de lo suyo
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
update public.exercise_library set archived_at = 1700000000000, material = 'Barra', alternativas = array['Prensa de piernas', 'Goblet squat'] where id = 'ex_default_1_0';
insert into resultados select 'B2 el entrenador archiva su ejercicio y guarda material y alternativas',
  archived_at = 1700000000000 and material = 'Barra' and alternativas = array['Prensa de piernas', 'Goblet squat'], coalesce(archived_at::text, 'null')
  from public.exercise_library where id = 'ex_default_1_0';
insert into resultados select 'B3 archivar no lo borra: sigue en la tabla sin deleted_at',
  count(*) = 1, count(*)::text || ' filas' from public.exercise_library where id = 'ex_default_1_0' and deleted_at is null;

-- No puede tocar lo de otro entrenador
update public.exercise_library set archived_at = 5 where id = 'ex_2';
reset role;
insert into resultados select 'B4 un entrenador no archiva ejercicios de otro', archived_at is null, coalesce(archived_at::text, 'null')
  from public.exercise_library where id = 'ex_2';

-- El cliente sigue viendo el ejercicio archivado de su entrenador (su plan lo nombra y necesita el vídeo)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"1a1a1a1a-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultados select 'B5 el cliente sigue leyendo el ejercicio archivado de su entrenador',
  count(*) = 1, count(*)::text || ' filas' from public.exercise_library where id = 'ex_default_1_0';
insert into resultados select 'B6 el cliente no lee la biblioteca de otro entrenador',
  count(*) = 0, count(*)::text || ' filas' from public.exercise_library where id = 'ex_2';
update public.exercise_library set archived_at = null where id = 'ex_default_1_0';
reset role;
insert into resultados select 'B7 el cliente no puede desarchivar', archived_at is not null, coalesce(archived_at::text, 'null')
  from public.exercise_library where id = 'ex_default_1_0';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
