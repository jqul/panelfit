-- Prueba de migrations/20261028000001_cuestionarios_cliente.sql
-- (el cliente ve solo las encuestas que le tocan —por envío, etiqueta o «a clientes nuevos»— y solo de su
-- entrenador; responderla la quita de pendientes; no puede guardar respuestas a nombre de otro entrenador;
-- sin sesión no hay nada).
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
insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local'),
  ('cccccccc-0000-0000-0000-000000000003', 'c3@test.local');
-- Ana (cliente de 1, alta antigua, con etiqueta); Carla (cliente de 1, alta reciente); Bea (cliente de 2).
insert into public.clientes (id, "trainerId", name, token, auth_user_id, "createdAt", label_ids) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'tok-1', 'cccccccc-0000-0000-0000-000000000001', 1000, '["lab-1"]'),
  ('33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Carla', 'tok-3', 'cccccccc-0000-0000-0000-000000000003', 5000, '[]'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Bea', 'tok-2', null, 1000, '[]');

insert into public.survey_templates (id, trainer_id, name, questions, auto_nuevos_desde) values
  ('t-semanal', 'aaaaaaaa-0000-0000-0000-000000000001', 'Semanal', '[{"id":"q1","type":"scale","label":"Energía"}]', null),
  ('t-alta',    'aaaaaaaa-0000-0000-0000-000000000001', 'Alta', '[{"id":"q1","type":"short","label":"Objetivo"}]', 4000),
  ('t-etiq',    'aaaaaaaa-0000-0000-0000-000000000001', 'Etiqueta', '[{"id":"q1","type":"yesno","label":"¿Dolor?"}]', null),
  ('t-pausa',   'aaaaaaaa-0000-0000-0000-000000000001', 'En pausa', '[{"id":"q1","type":"text","label":"x"}]', null),
  ('t-otro',    'aaaaaaaa-0000-0000-0000-000000000002', 'De otro', '[{"id":"q1","type":"text","label":"x"}]', 0);
insert into public.survey_schedules (id, trainer_id, template_id, client_id, frequency, active) values
  ('s-1', 'aaaaaaaa-0000-0000-0000-000000000001', 't-semanal', null, 'weekly', true),
  ('s-2', 'aaaaaaaa-0000-0000-0000-000000000001', 't-pausa', null, 'weekly', false),
  ('s-3', 'aaaaaaaa-0000-0000-0000-000000000002', 't-otro', null, 'weekly', true);
insert into public.labels (id, trainer_id, name, survey_template_id) values
  ('lab-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'Lesionados', 't-etiq');

-- ── Ana ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultados select 'Q1 a Ana le tocan la semanal (envío a todos) y la de su etiqueta; ni la pausada, ni la de alta (es antigua), ni la de otro entrenador',
  array_agg(template_id order by template_id) = array['t-etiq', 't-semanal'], string_agg(template_id, ',' order by template_id) from public.encuestas_pendientes();
insert into resultados select 'Q2 la semanal llega con su envío para enlazar la respuesta', schedule_id = 's-1', schedule_id from public.encuestas_pendientes() where template_id = 't-semanal';
do $$
declare ok boolean := false;
begin
  insert into public.survey_responses (id, schedule_id, template_id, client_id, trainer_id, answers, completed_at) values
    ('r-1', 's-1', 't-semanal', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '{"q1":7}', (extract(epoch from now()) * 1000)::bigint);
  insert into resultados select 'Q3 al responderla, la semanal deja de estar pendiente', not exists (select 1 from public.encuestas_pendientes() where template_id = 't-semanal'), 'respondida';
  begin
    insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values
      ('r-x', 't-semanal', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', '{}');
  exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('Q4 no puede guardar una respuesta a nombre de otro entrenador', ok, case when ok then 'denegado' else 'pudo' end);
  ok := false;
  begin
    insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values
      ('r-y', 't-otro', '22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', '{}');
  exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('Q5 no puede responder por otro cliente', ok, case when ok then 'denegado' else 'pudo' end);
end $$;
insert into resultados select 'Q6 sigue sin poder leer las plantillas del entrenador directamente', count(*) = 0, count(*)::text || ' filas' from public.survey_templates;

-- Hace 8 días: la semanal vuelve a tocar
reset role;
update public.survey_responses set completed_at = (extract(epoch from now() - interval '8 days') * 1000)::bigint where id = 'r-1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultados select 'Q7 una semana después la semanal vuelve a estar pendiente', exists (select 1 from public.encuestas_pendientes() where template_id = 't-semanal'), 'pendiente';

-- ── Carla, alta reciente ──
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into resultados select 'Q8 a Carla (llegó después de marcarla) le toca la de alta, y no la de la etiqueta que no lleva',
  array_agg(template_id order by template_id) = array['t-alta', 't-semanal'], string_agg(template_id, ',' order by template_id) from public.encuestas_pendientes();

-- ── Sin sesión ──
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare ok boolean := false;
begin
  begin perform public.encuestas_pendientes(); exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('Q9 sin sesión no se puede pedir nada', ok, case when ok then 'denegado' else 'pudo' end);
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
