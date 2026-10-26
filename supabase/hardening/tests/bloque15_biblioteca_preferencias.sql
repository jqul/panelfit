-- Prueba de migrations/20261026000001_biblioteca_preferencias.sql
-- (cada entrenador sincroniza SUS favoritos y listas; nadie ve ni escribe las de otro; sin sesión, nada).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración (antes la tabla no existe).
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

-- Filas de dos entrenadores, insertadas con el rol dueño (se saltan la RLS)
insert into public.exercise_library_prefs (trainer_id, valores, ts) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '{"fav":["e1"],"cats":["Pecho","Mi grupo"]}', '{"fav":10,"cats":10}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '{"fav":["e9"]}', '{"fav":20}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultados select 'P1 el entrenador lee sus preferencias y no las de otro', count(*) = 1 and bool_and(trainer_id = 'aaaaaaaa-0000-0000-0000-000000000001'), count(*)::text || ' filas' from public.exercise_library_prefs;
insert into resultados select 'P2 trae sus favoritos y su lista propia', (valores->'fav'->>0) = 'e1' and (valores->'cats'->>1) = 'Mi grupo', valores::text from public.exercise_library_prefs;

do $$
declare ok boolean := false; n int;
begin
  -- escribir la suya (upsert) funciona
  insert into public.exercise_library_prefs (trainer_id, valores, ts) values ('aaaaaaaa-0000-0000-0000-000000000001', '{"fav":["e1","e2"]}', '{"fav":30}')
    on conflict (trainer_id) do update set valores = excluded.valores, ts = excluded.ts;
  select jsonb_array_length(valores->'fav') into n from public.exercise_library_prefs;
  insert into resultados values ('P3 puede actualizar la suya con un upsert', n = 2, n::text || ' favoritos');
  -- escribir la de otro, no
  begin
    insert into public.exercise_library_prefs (trainer_id, valores) values ('aaaaaaaa-0000-0000-0000-000000000002', '{"fav":["intruso"]}')
      on conflict (trainer_id) do update set valores = excluded.valores;
  exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('P4 no puede escribir las de otro entrenador', ok, case when ok then 'denegado' else 'pudo escribir' end);
  ok := false;
  begin
    insert into public.exercise_library_prefs (trainer_id, valores) values ('aaaaaaaa-0000-0000-0000-000000000003', '{}');
  exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('P5 no puede crear una fila a nombre de otro', ok, case when ok then 'denegado' else 'pudo crear' end);
end $$;
reset role;

-- Las de otro siguen intactas
insert into resultados select 'P6 la fila del otro entrenador no se tocó', (valores->'fav'->>0) = 'e9', valores::text from public.exercise_library_prefs where trainer_id = 'aaaaaaaa-0000-0000-0000-000000000002';

-- Sin sesión, nada
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$
declare n int := -1; ok boolean := false;
begin
  begin select count(*) into n from public.exercise_library_prefs; ok := (n = 0); exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('P7 sin sesión no se ve ninguna fila', ok, case when n = -1 then 'denegado' else n::text || ' filas' end);
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
