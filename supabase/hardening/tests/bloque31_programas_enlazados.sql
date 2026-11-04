-- Prueba de migrations/20261104000002_programas_enlazados.sql
-- (el plan preparado para después empieza solo cuando termina el actual, con copia en el historial; no se toca el que
-- no ha terminado, el que tiene borrador ni el de un cliente archivado; nadie desde la app puede lanzar el cambio, y un
-- entrenador no prepara planes a clientes de otro).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer');
insert into public.clientes (id, "trainerId", name, token) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Termina', 'tok-1'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'En curso', 'tok-2'),
  ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Con borrador', 'tok-3'),
  ('11111111-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Archivado', 'tok-4'),
  ('11111111-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Hace tiempo', 'tok-5');
update public.clientes set archived_at = 1 where id = '11111111-0000-0000-0000-000000000004';

-- Siguiente: dos semanas de «Fuerza B». Hoy, a efectos de la prueba, es el miércoles 2026-11-04 (lunes: 2026-11-02).
insert into public.planes ("clientId", plan, siguiente, borrador_activo) values
  ('11111111-0000-0000-0000-000000000001', '{"P":{"type":"hipertrofia","fechaInicio":"2026-10-05","diasElegidos":[0,2,4],"fechasSesion":{"w1_d0":"2026-10-14"},"weeks":[{"label":"A1"},{"label":"A2"},{"label":"A3"},{"label":"A4"}]}}',
   '{"nombre":"Fuerza B","type":"fuerza","weeks":[{"label":"B1","isCurrent":false},{"label":"B2","isCurrent":true}]}', false),
  ('11111111-0000-0000-0000-000000000002', '{"P":{"fechaInicio":"2026-10-19","weeks":[{},{},{},{}]}}', '{"nombre":"Fuerza B","weeks":[{"label":"B1"}]}', false),
  ('11111111-0000-0000-0000-000000000003', '{"P":{"fechaInicio":"2026-10-05","weeks":[{},{},{},{}]}}', '{"nombre":"Fuerza B","weeks":[{"label":"B1"}]}', true),
  ('11111111-0000-0000-0000-000000000004', '{"P":{"fechaInicio":"2026-10-05","weeks":[{},{},{},{}]}}', '{"nombre":"Fuerza B","weeks":[{"label":"B1"}]}', false),
  ('11111111-0000-0000-0000-000000000005', '{"P":{"fechaInicio":"2026-08-03","weeks":[{},{}]}}', '{"nombre":"Fuerza B","weeks":[{"label":"B1"}]}', false);

-- ── Desde la app nadie lanza el cambio ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare st text := 'sin error';
begin
  begin perform public.empezar_planes_enlazados('2026-11-04'); exception when others then st := sqlstate; end;
  insert into resultados values ('E1 el entrenador no puede ejecutar el cambio', st = '42501', st);
end $$;

-- El entrenador 2 no prepara nada a un cliente del 1 (RLS de planes)
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare n integer;
begin
  update public.planes set siguiente = '{"nombre":"Intruso","weeks":[{}]}' where "clientId" = '11111111-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  insert into resultados values ('E2 otro entrenador no prepara planes a clientes ajenos', n = 0, n::text);
end $$;

-- El entrenador 1 no puede dejar preparado un plan sin semanas
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare st text := 'sin error';
begin
  begin update public.planes set siguiente = '{"nombre":"Vacío","weeks":[]}' where "clientId" = '11111111-0000-0000-0000-000000000002';
  exception when others then st := sqlstate; end;
  insert into resultados values ('E3 un plan preparado sin semanas no se guarda', st = '23514', st);
end $$;
reset role;

-- ── La tarea de la noche ──
do $$
declare n integer; p jsonb; s jsonb; h record;
begin
  n := public.empezar_planes_enlazados('2026-11-04');
  insert into resultados values ('E4 cambia los dos planes terminados', n = 2, n::text);

  select plan->'P', siguiente into p, s from public.planes where "clientId" = '11111111-0000-0000-0000-000000000001';
  insert into resultados values ('E5 el nuevo empieza el lunes, con sus semanas y su tipo',
    p->>'fechaInicio' = '2026-11-02' and jsonb_array_length(p->'weeks') = 2 and p->'weeks'->0->>'label' = 'B1' and p->>'type' = 'fuerza', p::text);
  insert into resultados values ('E6 marca como actual la primera semana',
    (p->'weeks'->0->>'isCurrent')::boolean and not (p->'weeks'->1->>'isCurrent')::boolean, p->>'weeks');
  insert into resultados values ('E7 conserva lo demás del plan y quita las sesiones movidas del anterior',
    p->'diasElegidos' = '[0,2,4]'::jsonb and not p ? 'fechasSesion', p::text);
  insert into resultados values ('E8 ya no queda nada preparado', s is null, coalesce(s::text, 'null'));

  select * into h from public.plan_history where "clientId" = '11111111-0000-0000-0000-000000000001';
  insert into resultados values ('E9 guarda el plan anterior en el historial',
    h.plan->'weeks'->0->>'label' = 'A1' and h.note like '%Fuerza B%' and h.published_by = 'Programa enlazado', coalesce(h.note, 'null'));

  select plan->'P' into p from public.planes where "clientId" = '11111111-0000-0000-0000-000000000005';
  insert into resultados values ('E10 el que acabó hace tiempo empieza esta semana, no en el pasado', p->>'fechaInicio' = '2026-11-02', p->>'fechaInicio');

  select count(*) into n from public.planes where siguiente is not null
    and "clientId" in ('11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000004');
  insert into resultados values ('E11 no toca el plan en curso, el del borrador ni el del archivado', n = 3, n::text);

  n := public.empezar_planes_enlazados('2026-11-04');
  insert into resultados values ('E12 si se pasa otra vez, no hace nada', n = 0, n::text);
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
