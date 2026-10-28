-- Tareas sueltas con fecha y repetición (2026-10-28), como las tareas de la planificación de Harbiz:
-- "Caminar 30 min" los martes y jueves, "Foto de progreso" el día 1, "Vídeo de movilidad" cada día hasta el 30…
--
-- `tareas_cliente`: la pone el entrenador (o un compañero de su equipo) en el calendario del plan del cliente.
--   Repetición: 'una' (solo `fecha`), 'diaria' o 'semanal' (los `dias` 0 = lunes … 6 = domingo), desde `fecha`
--   y hasta `hasta` (opcional). El cliente la ve, pero no la crea ni la cambia.
-- `tareas_hechas`: qué día la marcó el cliente como hecha (una fila por tarea y día). La marca el cliente; su
--   entrenador también puede (por si se lo dice en persona). Solo para tareas de ESE cliente.
--
-- Nada es visible sin sesión. Las dos entran en la exportación y el borrado completo del RGPD (client_data_tables)
-- y caen en cascada si se borra el cliente o la tarea.
-- Prueba: hardening/tests/bloque19_tareas.sql (run-pglite-tareas.mjs). Aplicada el 2026-10-28.

create table if not exists public.tareas_cliente (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clientes(id) on delete cascade,
  titulo     text not null check (char_length(btrim(titulo)) between 1 and 80),
  tipo       text not null default 'tarea' check (tipo in ('tarea', 'cardio', 'movilidad', 'video', 'foto')),
  nota       text not null default '' check (char_length(nota) <= 500),
  enlace     text not null default '' check (enlace = '' or (enlace ~ '^https://' and char_length(enlace) <= 500)),
  fecha      date not null,
  repetir    text not null default 'una' check (repetir in ('una', 'diaria', 'semanal')),
  dias       smallint[] not null default '{}' check (dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  hasta      date,
  created_at timestamptz not null default now(),
  check (hasta is null or hasta >= fecha),
  check (repetir <> 'semanal' or cardinality(dias) > 0)
);
create index if not exists tareas_cliente_client_idx on public.tareas_cliente (client_id, fecha);

create table if not exists public.tareas_hechas (
  tarea_id   uuid not null references public.tareas_cliente(id) on delete cascade,
  client_id  uuid not null references public.clientes(id) on delete cascade,
  fecha      date not null,
  created_at timestamptz not null default now(),
  primary key (tarea_id, fecha)
);
create index if not exists tareas_hechas_client_idx on public.tareas_hechas (client_id, fecha);

alter table public.tareas_cliente enable row level security;
alter table public.tareas_hechas enable row level security;

-- Leer: el cliente, su entrenador o un compañero del equipo.
create policy "ver_tareas_cliente" on public.tareas_cliente
  for select to authenticated
  using (exists (select 1 from public.clientes c where c.id = tareas_cliente.client_id
    and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))));

-- Crear, cambiar y borrar: solo el entrenador (o su equipo).
create policy "entrenador_gestiona_tareas_cliente" on public.tareas_cliente
  for all to authenticated
  using (exists (select 1 from public.clientes c where c.id = tareas_cliente.client_id
    and (c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))))
  with check (exists (select 1 from public.clientes c where c.id = tareas_cliente.client_id
    and (c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))));

-- Marcar hecha: el cliente o su entrenador, y solo tareas de ese mismo cliente.
create policy "cliente_o_entrenador_tareas_hechas" on public.tareas_hechas
  for all to authenticated
  using (exists (select 1 from public.clientes c where c.id = tareas_hechas.client_id
    and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))))
  with check (
    exists (select 1 from public.tareas_cliente t where t.id = tareas_hechas.tarea_id and t.client_id = tareas_hechas.client_id)
    and exists (select 1 from public.clientes c where c.id = tareas_hechas.client_id
      and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))));

revoke all on public.tareas_cliente, public.tareas_hechas from anon;

-- RGPD: las tablas nuevas entran en la exportación y el borrado completo del cliente.
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
    ('fv_profile_trials', 'client_id'), ('habitos', 'clientId'), ('notificaciones', 'client_id'),
    ('plan_history', 'clientId'), ('planes', 'clientId'), ('programacion_mensajes', 'clientId'),
    ('progress_photos', 'clientId'), ('push_subscriptions', 'client_id'), ('readiness_checkins', 'clientId'),
    ('registros', 'clientId'), ('registros_dolor', 'clientId'), ('registros_habitos', 'clientId'),
    ('registros_peso', 'clientId'), ('session_load', 'client_id'), ('session_reactions', 'clientId'),
    ('survey_responses', 'client_id'), ('survey_schedules', 'client_id'),
    ('tareas_cliente', 'client_id'), ('tareas_hechas', 'client_id'), ('test_resultados', 'client_id'),
    ('valoraciones', 'client_id'), ('video_feedback', 'client_id'), ('waivers', 'clientId'),
    ('weekly_reviews', 'clientId')
$function$;
