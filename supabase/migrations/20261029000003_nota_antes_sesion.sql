-- Comentario antes del entreno (2026-10-29).
--
-- Al empezar una sesión el cliente puede decir cómo llega ("He dormido 5 horas", "Me molesta el hombro"). El de
-- después (session_reactions) solo se guarda al terminar; este se guarda al empezar, así el entrenador lo ve aunque
-- la sesión se quede a medias. Uno por cliente y día (si lo cambia, se sustituye).
--
-- Lo escribe el cliente (solo el suyo); lo leen él, su entrenador y el equipo del entrenador. Sin sesión, nada.
-- Entra en el RGPD (client_data_tables) y cae en cascada si se borra el cliente.
-- Va DESPUÉS de 20261029000002_recordatorio_diario.sql: su client_data_tables ya incluye recordatorios_enviados.
-- Prueba: hardening/tests/bloque23_nota_antes_sesion.sql (run-pglite-nota-antes-sesion.mjs).

create table if not exists public.notas_antes_sesion (
  client_id  uuid not null references public.clientes(id) on delete cascade,
  fecha      date not null,
  dia        text not null default '' check (char_length(dia) <= 120),
  nota       text not null check (char_length(btrim(nota)) between 1 and 300),
  created_at timestamptz not null default now(),
  primary key (client_id, fecha)
);

alter table public.notas_antes_sesion enable row level security;

create policy "ver_notas_antes_sesion" on public.notas_antes_sesion
  for select to authenticated
  using (exists (select 1 from public.clientes c where c.id = notas_antes_sesion.client_id
    and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))));

create policy "cliente_escribe_su_nota_antes" on public.notas_antes_sesion
  for insert to authenticated
  with check (exists (select 1 from public.clientes c where c.id = notas_antes_sesion.client_id and c.auth_user_id = (select auth.uid())));

create policy "cliente_cambia_su_nota_antes" on public.notas_antes_sesion
  for update to authenticated
  using (exists (select 1 from public.clientes c where c.id = notas_antes_sesion.client_id and c.auth_user_id = (select auth.uid())))
  with check (exists (select 1 from public.clientes c where c.id = notas_antes_sesion.client_id and c.auth_user_id = (select auth.uid())));

revoke all on public.notas_antes_sesion from anon;

create or replace function public.client_data_tables()
 returns table(tbl text, col text)
 language sql
 immutable
 set search_path to 'public'
as $function$
  values
    ('ausencias', 'client_id'), ('calendario_enlaces', 'client_id'),
    ('checkins', 'clientId'), ('ciclo_tracking', 'client_id'), ('citas', 'client_id'),
    ('cohorte_clientes', 'client_id'), ('dietas', 'cliente_id'), ('encuestas', 'cliente_id'),
    ('eventos_cliente', 'client_id'),
    ('exercise_usage_events', 'client_id'), ('foto_sessions', 'client_id'), ('fotos', 'cliente_id'),
    ('fv_profile_trials', 'client_id'), ('habitos', 'clientId'), ('notas_antes_sesion', 'client_id'),
    ('notificaciones', 'client_id'),
    ('plan_history', 'clientId'), ('planes', 'clientId'), ('programacion_mensajes', 'clientId'),
    ('progress_photos', 'clientId'), ('push_subscriptions', 'client_id'), ('readiness_checkins', 'clientId'),
    ('recordatorios_enviados', 'client_id'),
    ('registros', 'clientId'), ('registros_dolor', 'clientId'), ('registros_habitos', 'clientId'),
    ('registros_peso', 'clientId'), ('session_load', 'client_id'), ('session_reactions', 'clientId'),
    ('survey_responses', 'client_id'), ('survey_schedules', 'client_id'),
    ('tareas_cliente', 'client_id'), ('tareas_hechas', 'client_id'), ('test_resultados', 'client_id'),
    ('valoraciones', 'client_id'), ('video_feedback', 'client_id'), ('waivers', 'clientId'),
    ('weekly_reviews', 'clientId')
$function$;
