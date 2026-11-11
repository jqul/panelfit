-- Strava: el cliente conecta su cuenta y sus entrenos llegan solos a `actividades` (los relojes Garmin, Coros, Polar,
-- Suunto, Wahoo… ya sincronizan con Strava). La función de Edge `strava` hace el OAuth y la sincronización con los
-- secrets STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET.
--
--   strava_conexiones   los tokens de cada cliente. Nadie los lee desde la app: solo la función (clave de servicio).
--   strava_estado()     ¿está conectado el cliente que llama?, y cuándo se sincronizó por última vez.
--   actividades         ahora también con origen 'strava' y el id de la actividad en Strava (no se repite).

create table if not exists public.strava_conexiones (
  client_id     uuid primary key references public.clientes(id) on delete cascade,
  athlete_id    bigint not null,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  scope         text not null default '',
  ultima_sync   timestamptz,
  created_at    timestamptz not null default now()
);
alter table public.strava_conexiones enable row level security;
revoke all on public.strava_conexiones from anon, authenticated;

alter table public.actividades add column if not exists external_id text;
alter table public.actividades drop constraint if exists actividades_origen_check;
alter table public.actividades add constraint actividades_origen_check check (origen in ('archivo', 'strava'));
create unique index if not exists actividades_externa on public.actividades (client_id, origen, external_id) where external_id is not null;

-- Estado de la conexión para el propio cliente (sin tokens)
create or replace function public.strava_estado()
returns table (conectado boolean, ultima_sync timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.strava_conexiones s join public.clientes c on c.id = s.client_id where c.auth_user_id = (select auth.uid())),
         (select s.ultima_sync from public.strava_conexiones s join public.clientes c on c.id = s.client_id where c.auth_user_id = (select auth.uid()) limit 1)
$$;
revoke all on function public.strava_estado() from public, anon;
grant execute on function public.strava_estado() to authenticated;

-- RGPD: los tokens se borran con el cliente
create or replace function public.client_data_tables()
 returns table(tbl text, col text)
 language sql
 immutable
 set search_path to 'public'
as $function$
  values
    ('actividades', 'client_id'),
    ('ausencias', 'client_id'), ('bonos_cliente', 'client_id'), ('calendario_enlaces', 'client_id'),
    ('checkins', 'clientId'), ('ciclo_tracking', 'client_id'), ('citas', 'client_id'),
    ('clase_plazas', 'client_id'),
    ('cohorte_clientes', 'client_id'), ('descansos', 'client_id'), ('dietas', 'cliente_id'), ('encuestas', 'cliente_id'),
    ('eventos_cliente', 'client_id'),
    ('exercise_usage_events', 'client_id'), ('foto_sessions', 'client_id'), ('fotos', 'cliente_id'),
    ('fv_profile_trials', 'client_id'), ('habitos', 'clientId'), ('notas_antes_sesion', 'client_id'),
    ('notificaciones', 'client_id'),
    ('plan_history', 'clientId'), ('planes', 'clientId'), ('programacion_mensajes', 'clientId'),
    ('progress_photos', 'clientId'), ('push_subscriptions', 'client_id'), ('readiness_checkins', 'clientId'),
    ('recordatorios_enviados', 'client_id'),
    ('registros', 'clientId'), ('registros_dolor', 'clientId'), ('registros_habitos', 'clientId'),
    ('registros_peso', 'clientId'), ('session_load', 'client_id'), ('session_reactions', 'clientId'),
    ('strava_conexiones', 'client_id'),
    ('survey_responses', 'client_id'), ('survey_schedules', 'client_id'),
    ('tareas_cliente', 'client_id'), ('tareas_hechas', 'client_id'), ('test_resultados', 'client_id'),
    ('valoraciones', 'client_id'), ('video_feedback', 'client_id'), ('waivers', 'clientId'),
    ('weekly_reviews', 'clientId')
$function$;
