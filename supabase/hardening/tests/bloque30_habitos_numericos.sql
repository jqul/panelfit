-- Prueba de migrations/20261030000006_habitos_numericos.sql
-- (un hábito puede llevar meta y unidad; la meta debe ser positiva y razonable; la unidad corta; el registro del día
-- guarda un objeto de valores; lo que ya existía sigue igual).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into public.clientes (id, "trainerId", name, token) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 1', 'tok-1');

-- Un hábito antiguo (sin meta) sigue siendo válido
insert into public.habitos (id, "clientId", text, sub, "order") values
  ('dddddddd-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Beber 2 L de agua', '', 0);
insert into resultados select 'A1 un hábito sin meta sigue siendo una casilla', meta is null and unidad is null, 'meta nula' from public.habitos where id = 'dddddddd-0000-0000-0000-000000000001';

-- Un hábito con meta y unidad
insert into public.habitos (id, "clientId", text, sub, "order", meta, unidad) values
  ('dddddddd-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '10.000 pasos', '', 1, 10000, 'pasos'),
  ('dddddddd-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Dormir 7 horas', '', 2, 7.5, 'h');
insert into resultados select 'A2 un hábito con meta decimal y unidad', count(*) = 2 and bool_and(meta > 0), count(*)::text || ' con meta' from public.habitos where meta is not null;

-- La meta no puede ser cero, negativa ni absurda; la unidad no puede ser larga
do $$
declare ok0 boolean := false; okn boolean := false; okg boolean := false; oku boolean := false;
begin
  begin insert into public.habitos (id, "clientId", text, "order", meta) values ('dddddddd-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000001', 'x', 3, 0);
  exception when check_violation then ok0 := true; end;
  begin insert into public.habitos (id, "clientId", text, "order", meta) values ('dddddddd-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000001', 'x', 3, -5);
  exception when check_violation then okn := true; end;
  begin insert into public.habitos (id, "clientId", text, "order", meta) values ('dddddddd-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000001', 'x', 3, 2000000);
  exception when check_violation then okg := true; end;
  begin insert into public.habitos (id, "clientId", text, "order", meta, unidad) values ('dddddddd-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000001', 'x', 3, 5, repeat('u', 21));
  exception when check_violation then oku := true; end;
  insert into resultados values ('B1 la meta cero se rechaza', ok0, 'check'), ('B2 la meta negativa se rechaza', okn, 'check'),
    ('B3 la meta desmesurada se rechaza', okg, 'check'), ('B4 la unidad de más de 20 caracteres se rechaza', oku, 'check');
end $$;

-- El registro del día: por defecto un objeto vacío; guarda valores; no admite algo que no sea un objeto
insert into public.registros_habitos ("clientId", date, "completedHabitIds") values ('11111111-0000-0000-0000-000000000001', '2026-11-02', '[]'::jsonb);
insert into resultados select 'C1 los valores vienen vacíos por defecto', valores = '{}'::jsonb, valores::text from public.registros_habitos where date = '2026-11-02';
update public.registros_habitos set valores = '{"dddddddd-0000-0000-0000-000000000002": 10450, "dddddddd-0000-0000-0000-000000000003": 6.5}'::jsonb where date = '2026-11-02';
insert into resultados select 'C2 guarda los valores del día', (valores->>'dddddddd-0000-0000-0000-000000000002')::numeric = 10450 and (valores->>'dddddddd-0000-0000-0000-000000000003')::numeric = 6.5, valores::text from public.registros_habitos where date = '2026-11-02';
do $$
declare ok boolean := false; ok2 boolean := false;
begin
  begin update public.registros_habitos set valores = '[1,2]'::jsonb where date = '2026-11-02';
  exception when check_violation then ok := true; end;
  begin update public.registros_habitos set valores = null where date = '2026-11-02';
  exception when not_null_violation then ok2 := true; end;
  insert into resultados values ('C3 un array no es un valor válido', ok, 'check'), ('C4 los valores no pueden ser nulos', ok2, 'not null');
end $$;

-- El upsert que hace la app (por clave cliente+fecha) con los valores nuevos
insert into public.registros_habitos ("clientId", date, "completedHabitIds", valores) values
  ('11111111-0000-0000-0000-000000000001', '2026-11-02', '["dddddddd-0000-0000-0000-000000000002"]'::jsonb, '{"dddddddd-0000-0000-0000-000000000002": 12000}'::jsonb)
on conflict ("clientId", date) do update set "completedHabitIds" = excluded."completedHabitIds", valores = excluded.valores;
insert into resultados select 'D1 el upsert de la app actualiza valores y completados', (valores->>'dddddddd-0000-0000-0000-000000000002')::numeric = 12000 and jsonb_array_length("completedHabitIds") = 1, valores::text from public.registros_habitos where date = '2026-11-02';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
