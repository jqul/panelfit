-- Prueba de migrations/20261114000001_archivar_terminados.sql
-- (se archiva solo quien terminó su plan hace los días elegidos, sin plan enlazado y sin registrar nada desde entonces;
-- solo si su entrenador lo tiene encendido; nadie desde la app lo lanza; al recuperar, el motivo se borra).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role, profile) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Encendido', true, 'trainer', 'trainer', '{"autoArchivar":{"activo":true,"dias":14}}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Apagado', true, 'trainer', 'trainer', '{}');
insert into public.clientes (id, "trainerId", name, token) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Terminó hace 30 días', 'tok-1'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Terminó hace 5 días', 'tok-2'),
  ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Sigue entrenando', 'tok-3'),
  ('11111111-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Con siguiente plan', 'tok-4'),
  ('11111111-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002', 'De entrenador apagado', 'tok-5');

-- Hoy, a efectos de la prueba: 2026-11-14. Planes de 4 semanas.
insert into public.planes ("clientId", plan, siguiente) values
  ('11111111-0000-0000-0000-000000000001', '{"P":{"fechaInicio":"2026-09-17","weeks":[{},{},{},{}]}}', null), -- fin 10-15
  ('11111111-0000-0000-0000-000000000002', '{"P":{"fechaInicio":"2026-10-12","weeks":[{},{},{},{}]}}', null), -- fin 11-09
  ('11111111-0000-0000-0000-000000000003', '{"P":{"fechaInicio":"2026-09-17","weeks":[{},{},{},{}]}}', null),
  ('11111111-0000-0000-0000-000000000004', '{"P":{"fechaInicio":"2026-09-17","weeks":[{},{},{},{}]}}', '{"nombre":"B","weeks":[{}]}'),
  ('11111111-0000-0000-0000-000000000005', '{"P":{"fechaInicio":"2026-09-17","weeks":[{},{},{},{}]}}', null);
-- Último registro: el 1 entrenó por última vez el 10-10; el 3, el 11-12 (después del fin)
insert into public.registros ("clientId", logs, "updatedAt") values
  ('11111111-0000-0000-0000-000000000001', '{}', extract(epoch from timestamptz '2026-10-10 18:00+02') * 1000),
  ('11111111-0000-0000-0000-000000000003', '{}', extract(epoch from timestamptz '2026-11-12 18:00+01') * 1000);

-- ── Desde la app nadie lo lanza ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false;
begin
  begin perform public.archivar_planes_terminados('2026-11-14'); exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('A1 un entrenador no puede lanzarlo', ok, '');
end $$;
reset role;

do $$
declare n int; archivados text;
begin
  n := public.archivar_planes_terminados('2026-11-14');
  select string_agg(name, ', ' order by name) into archivados from public.clientes where archived_at is not null;
  insert into resultados values ('A2 solo el que terminó hace 30 días, sin siguiente ni actividad', n = 1 and archivados = 'Terminó hace 30 días', n || ': ' || coalesce(archivados, '-'));
  insert into resultados values ('A3 con su motivo', (select archivado_motivo from public.clientes where id = '11111111-0000-0000-0000-000000000001') = 'plan_terminado', '');
  update public.clientes set archived_at = null where id = '11111111-0000-0000-0000-000000000001';
  insert into resultados values ('A4 al recuperarlo, el motivo se borra', (select archivado_motivo from public.clientes where id = '11111111-0000-0000-0000-000000000001') is null, '');
  -- Un ajuste mal escrito no rompe la tarea (días por defecto: 14)
  update public.entrenadores set profile = '{"autoArchivar":{"activo":true,"dias":"mucho"}}' where uid = 'aaaaaaaa-0000-0000-0000-000000000001';
  update public.registros set "updatedAt" = 1 where "clientId" = '11111111-0000-0000-0000-000000000001';
  n := public.archivar_planes_terminados('2026-11-14');
  insert into resultados values ('A5 con días mal escritos, sigue funcionando', n = 1, n::text);
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
